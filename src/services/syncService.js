/**
 * Real-time WebSocket and REST Synchronization Client
 * Manages live multi-device synchronization and authentication between Mom and Dad
 */

const AUTH_TOKEN_KEY = 'nara_auth_token_v1';

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

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws?token=${encodeURIComponent(this.token)}`;

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

    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      this.setToken(null);
      this._triggerAuthRequired();
      throw new Error('Unauthorized');
    }
    return res;
  }

  // --- Authentication API ---

  async login(password, caregiverId, rememberMe = true) {
    const res = await fetch('/api/auth/login', {
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
        await fetch('/api/auth/logout', {
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
}

export const syncService = new SyncService();
