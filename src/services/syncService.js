/**
 * Real-time WebSocket and REST Synchronization Client
 * Manages live multi-device synchronization and authentication between Mom and Dad
 */

const AUTH_TOKEN_KEY = 'babytracker_auth_token_v1';
const CUSTOM_SERVER_URL_KEY = 'babytracker_custom_server_url';

class SyncService {
  constructor() {
    this.ws = null;
    this.status = 'connecting'; // 'connected' | 'connecting' | 'offline'
    this.statusListeners = new Set();
    this.messageListeners = new Map(); // type -> Set<callback>
    this.authListeners = new Set();
    this.reconnectTimeout = null;
    this.reconnectAttempt = 0;
    this.pingInterval = null;
    this.isExplicitlyClosed = false;
    this.token = typeof localStorage !== 'undefined' ? localStorage.getItem(AUTH_TOKEN_KEY) : null;
  }

  // --- Server Base URL Management (Custom/LAN/Remote Servers) ---

  getServerBaseUrl() {
    if (typeof localStorage !== 'undefined') {
      const custom = localStorage.getItem(CUSTOM_SERVER_URL_KEY);
      if (custom && custom.trim()) {
        let trimmed = custom.trim().replace(/\/+$/, '');
        if (!/^https?:\/\//i.test(trimmed)) {
          trimmed = `http://${trimmed}`;
        }
        return trimmed;
      }
    }
    return '';
  }

  setServerBaseUrl(url) {
    if (typeof localStorage !== 'undefined') {
      if (url && url.trim()) {
        let trimmed = url.trim().replace(/\/+$/, '');
        if (!/^https?:\/\//i.test(trimmed)) {
          trimmed = `http://${trimmed}`;
        }
        localStorage.setItem(CUSTOM_SERVER_URL_KEY, trimmed);
      } else {
        localStorage.removeItem(CUSTOM_SERVER_URL_KEY);
      }
    }
  }

  _buildUrl(endpoint) {
    const base = this.getServerBaseUrl();
    if (!base) return endpoint;
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${base}${cleanEndpoint}`;
  }

  async checkServerHealth(testUrl = null) {
    let base = testUrl !== null ? (testUrl ? testUrl.trim().replace(/\/+$/, '') : '') : this.getServerBaseUrl();
    if (base && !/^https?:\/\//i.test(base)) {
      base = `http://${base}`;
    }
    const url = base ? `${base}/api/sync/state` : '/api/sync/state';
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      // Both 200 (authenticated) and 401 (requires login) indicate a reachable Baby Tracker server
      return { reachable: true, status: res.status, url: base || window.location.origin };
    } catch (err) {
      return { reachable: false, error: err.message, url: base || window.location.origin };
    }
  }

  // --- Auth Token Management ---

  setToken(token) {
    this.token = token;
    if (typeof localStorage !== 'undefined') {
      if (token) {
        localStorage.setItem(AUTH_TOKEN_KEY, token);
      } else {
        localStorage.removeItem(AUTH_TOKEN_KEY);
      }
    }
  }

  getToken() {
    return this.token;
  }

  hasToken() {
    return Boolean(this.token);
  }

  onAuthRequired(callback) {
    this.authListeners.add(callback);
    return () => this.authListeners.delete(callback);
  }

  _triggerAuthRequired() {
    this.authListeners.forEach(cb => {
      try {
        cb();
      } catch (e) {
        console.error('[Sync] Error in auth listener:', e);
      }
    });
  }

  // --- Connection Status ---

  onStatusChange(callback) {
    this.statusListeners.add(callback);
    callback(this.status);
    return () => this.statusListeners.delete(callback);
  }

  _setStatus(newStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.statusListeners.forEach(cb => cb(this.status));
    }
  }

  // --- Broadcast Listeners ---

  on(type, callback) {
    if (!this.messageListeners.has(type)) {
      this.messageListeners.set(type, new Set());
    }
    this.messageListeners.get(type).add(callback);
    return () => {
      const set = this.messageListeners.get(type);
      if (set) set.delete(callback);
    };
  }

  _dispatch(type, payload) {
    const listeners = this.messageListeners.get(type);
    if (listeners) {
      listeners.forEach(cb => {
        try {
          cb(payload);
        } catch (e) {
          console.error(`[Sync] Error in listener for ${type}:`, e);
        }
      });
    }
  }

  // --- WebSocket Connection ---

  connect() {
    if (typeof window === 'undefined') return;
    this.isExplicitlyClosed = false;

    // Do not connect WebSocket if unauthenticated
    if (!this.token) {
      this._setStatus('offline');
      return;
    }

    // Prevent duplicate connections
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this._setStatus('connecting');

    const base = this.getServerBaseUrl();
    let wsUrl;
    if (base) {
      try {
        const parsed = new URL(base);
        const protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${protocol}//${parsed.host}/ws?token=${encodeURIComponent(this.token)}`;
      } catch {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        wsUrl = `${protocol}//${host}/ws?token=${encodeURIComponent(this.token)}`;
      }
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      wsUrl = `${protocol}//${host}/ws?token=${encodeURIComponent(this.token)}`;
    }

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[Sync] Authenticated WebSocket connected to server');
        this._setStatus('connected');
        this.reconnectAttempt = 0;
        this._startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'PONG') return;
          if (data.type === 'AUTH_ERROR') {
            console.warn('[Sync] WebSocket auth error, signing out');
            this.setToken(null);
            this._triggerAuthRequired();
            this.disconnect();
            return;
          }
          this._dispatch(data.type, data.payload);
        } catch (err) {
          console.warn('[Sync] Failed to parse message:', err);
        }
      };

      this.ws.onclose = (event) => {
        console.log('[Sync] WebSocket closed', event.code);
        this._cleanup();
        this._setStatus('offline');

        if (event.code === 4401) {
          // Explicit unauthorized from server
          this.setToken(null);
          this._triggerAuthRequired();
          return;
        }

        if (!this.isExplicitlyClosed && this.token) {
          this._scheduleReconnect();
        }
      };

      this.ws.onerror = (err) => {
        console.warn('[Sync] WebSocket error');
        this.ws?.close();
      };
    } catch (e) {
      console.warn('[Sync] Failed to initialize WebSocket:', e);
      this._setStatus('offline');
      if (this.token) this._scheduleReconnect();
    }
  }

  _startHeartbeat() {
    this._stopHeartbeat();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'PING', timestamp: Date.now() }));
      }
    }, 25000);
  }

  _stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  _scheduleReconnect() {
    if (this.reconnectTimeout) return;
    this.reconnectAttempt++;
    // Exponential backoff capped at 10 seconds
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempt - 1), 10000);
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      if (this.token) this.connect();
    }, delay);
  }

  _cleanup() {
    this._stopHeartbeat();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  disconnect() {
    this.isExplicitlyClosed = true;
    this._cleanup();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this._setStatus('offline');
  }

  // --- HTTP Request Helper ---

  async _fetch(url, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token ? { 'Authorization': `Bearer ${this.token}` } : {}),
      ...(options.headers || {}),
    };

    const targetUrl = this._buildUrl(url);
    const res = await fetch(targetUrl, { ...options, headers });
    if (res.status === 401) {
      this.setToken(null);
      this._triggerAuthRequired();
      throw new Error('Unauthorized');
    }
    return res;
  }

  // --- Authentication & Onboarding API ---

  async checkAuthStatus() {
    try {
      const base = this.getServerBaseUrl();
      const url = base ? `${base}/api/auth/status` : '/api/auth/status';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) return { needsOnboarding: false, requiresAuth: true };
      return await res.json();
    } catch {
      return { needsOnboarding: false, requiresAuth: true, offline: true };
    }
  }

  async completeOnboarding({ baby, caregivers, password, activeCaregiverId }) {
    const base = this.getServerBaseUrl();
    const url = base ? `${base}/api/setup/complete` : '/api/setup/complete';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baby, caregivers, password, activeCaregiverId }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Onboarding failed');
    }

    if (data.token) {
      this.setToken(data.token);
      this.connect();
    }
    return data;
  }

  async login(password, caregiverId, rememberMe = true) {
    const res = await fetch(this._buildUrl('/api/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, caregiverId, rememberMe }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }

    this.setToken(data.token);
    this.connect();
    return data;
  }

  async verifySession() {
    if (!this.token) return null;
    try {
      const res = await this._fetch('/api/auth/verify', { method: 'GET' });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  async changePassword(currentPassword, newPassword) {
    const res = await this._fetch('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Password change failed');
    return data;
  }

  async logout() {
    try {
      if (this.token) {
        await fetch(this._buildUrl('/api/auth/logout'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`,
          },
        });
      }
    } catch {}
    this.setToken(null);
    this.disconnect();
    this._triggerAuthRequired();
  }

  // --- Data Synchronization REST Endpoints ---

  async fetchFullState() {
    try {
      const res = await this._fetch('/api/sync/state');
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return await res.json();
    } catch (e) {
      console.warn('[Sync] Failed to fetch state via REST:', e);
      throw e;
    }
  }

  async addEvent(eventData) {
    const res = await this._fetch('/api/events', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  }

  async updateEvent(eventId, updates) {
    const res = await this._fetch(`/api/events/${encodeURIComponent(eventId)}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  }

  async deleteEvent(eventId) {
    const res = await this._fetch(`/api/events/${encodeURIComponent(eventId)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  }

  async toggleLike(eventId, caregiver) {
    const res = await this._fetch(`/api/events/${encodeURIComponent(eventId)}/like`, {
      method: 'POST',
      body: JSON.stringify({ caregiver }),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  }

  async addComment(eventId, text, caregiver) {
    const res = await this._fetch(`/api/events/${encodeURIComponent(eventId)}/comments`, {
      method: 'POST',
      body: JSON.stringify({ text, caregiver }),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  }

  async deleteComment(eventId, commentId) {
    const res = await this._fetch(`/api/events/${encodeURIComponent(eventId)}/comments/${encodeURIComponent(commentId)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  }

  async importEvents(events, mode = 'merge') {
    const res = await this._fetch('/api/events/import', {
      method: 'POST',
      body: JSON.stringify({ events, mode }),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  }

  async updateTimers(activeTimers) {
    const res = await this._fetch('/api/timers', {
      method: 'POST',
      body: JSON.stringify(activeTimers),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  }

  async addCaregiver(caregiverData) {
    const res = await this._fetch('/api/caregivers', {
      method: 'POST',
      body: JSON.stringify(caregiverData),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  }

  async updateCaregiver(id, updates) {
    const res = await this._fetch(`/api/caregivers/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  }

  async updateChild(id, updates) {
    const res = await this._fetch(`/api/children/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  }

  async createChild(childData) {
    const res = await this._fetch('/api/children', {
      method: 'POST',
      body: JSON.stringify(childData),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  }

  async setActiveChild(id) {
    const res = await this._fetch('/api/children/active', {
      method: 'POST',
      body: JSON.stringify({ id }),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  }

  async updatePreferences(prefs) {
    const res = await this._fetch('/api/preferences', {
      method: 'POST',
      body: JSON.stringify(prefs),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  }

  // --- Reminders Management ---

  async fetchReminders() {
    const res = await this._fetch('/api/reminders');
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  }

  async addReminder(reminderData) {
    const res = await this._fetch('/api/reminders', {
      method: 'POST',
      body: JSON.stringify(reminderData),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  }

  async updateReminder(id, updates) {
    const res = await this._fetch(`/api/reminders/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  }

  async deleteReminder(id) {
    const res = await this._fetch(`/api/reminders/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  }

  // --- Photo / Media Management ---

  resolveMediaUrl(url) {
    if (!url) return '';
    if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return this._buildUrl(url);
  }

  async uploadImage(dataUrl) {
    if (!dataUrl) return null;
    try {
      const res = await this._fetch('/api/upload', {
        method: 'POST',
        body: JSON.stringify({ image: dataUrl }),
      });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      return data.url;
    } catch (err) {
      console.warn('[Sync] Server image upload failed or offline. Using local dataUrl:', err);
      return dataUrl;
    }
  }
}

export const syncService = new SyncService();
