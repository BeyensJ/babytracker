/**
 * Nara Baby - Notification Service
 * Manages Web Notifications, In-App Toasts, and Android Notification Tray Live Timers.
 */

import { formatTimerClock, formatTime } from '../utils/formatters';

function playNotificationChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Gentle melodic double chime (A5: 880Hz -> C#6: 1108Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.28);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.frequency.setValueAtTime(1108, now + 0.1);
    gain2.gain.setValueAtTime(0.15, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.42);
  } catch (e) {
    // AudioContext blocked or user hasn't interacted with document yet
  }
}

class NotificationService {
  constructor() {
    this.tickerInterval = null;
    this.currentTimers = null;
    this.currentCaregiver = 'Parent';
    this.currentBaby = 'Baby';
    this.currentLang = 'nl';
    this.toastListeners = new Set();
    this.activeWindowNotification = null;
  }

  onToast(callback) {
    this.toastListeners.add(callback);
    return () => this.toastListeners.delete(callback);
  }

  showToast(toast) {
    this.toastListeners.forEach((cb) => {
      try {
        cb(toast);
      } catch (e) {
        console.error('[Notification] Error in toast listener:', e);
      }
    });
  }

  getDiagnostics() {
    if (typeof window === 'undefined') {
      return { supported: false, isSecure: false, permission: 'unsupported', reason: 'SSR' };
    }

    const isSecure = Boolean(window.isSecureContext);
    const hasNotification = 'Notification' in window;
    const hasSW = 'serviceWorker' in navigator;
    const permission = hasNotification ? Notification.permission : 'unsupported';

    let reason = 'ok';
    if (!isSecure) {
      reason =
        'Insecure context: Web Notifications & Service Workers require HTTPS or localhost. If accessing via LAN IP (e.g. http://192.168.x.x:3001), enable Chrome flag unsafely-treat-insecure-origin-as-secure or use HTTPS.';
    } else if (!hasNotification && !hasSW) {
      reason = 'Browser does not support the Notification or Service Worker API.';
    }

    return {
      isSecure,
      hasNotification,
      hasSW,
      permission,
      supported: isSecure && (hasNotification || hasSW),
      reason,
    };
  }

  isSupported() {
    if (typeof window === 'undefined') return false;
    return 'Notification' in window || 'serviceWorker' in navigator;
  }

  getPermission() {
    if (typeof window === 'undefined') return 'unsupported';
    if (!window.isSecureContext) return 'insecure-context';
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission; // 'default' | 'granted' | 'denied'
  }

  async requestPermission() {
    if (typeof window === 'undefined') return 'unsupported';

    if (!window.isSecureContext) {
      console.warn('[Notification] Insecure HTTP origin: Browser blocks notifications unless served over HTTPS or localhost.');
      return 'insecure-context';
    }

    if (!('Notification' in window)) {
      console.warn('[Notification] Notification API not supported by this browser.');
      return 'unsupported';
    }

    try {
      const permission = await Notification.requestPermission();
      console.log('[Notification] Notification permission result:', permission);
      return permission;
    } catch (err) {
      console.warn('[Notification] Permission request failed:', err);
      return 'denied';
    }
  }

  /**
   * Sync active timers to the Android Notification Tray.
   */
  async syncTimerNotification(activeTimers, caregiverName = 'Parent', babyName = 'Baby', lang = 'nl', isTickUpdate = false) {
    this.currentTimers = activeTimers;
    this.currentCaregiver = caregiverName;
    this.currentBaby = babyName;
    this.currentLang = lang;

    const breast = activeTimers?.breast;
    const sleep = activeTimers?.sleep?.running ? activeTimers.sleep : null;
    const pump = activeTimers?.pump?.running ? activeTimers.pump : null;

    // If no timers are running, clear notifications
    if (!breast && !sleep && !pump) {
      this.clearNotification();
      this.stopTicker();
      return;
    }

    const permission = this.getPermission();
    if (permission !== 'granted') {
      console.log(`[Notification] Timer active but notification permission is '${permission}'.`);
      return;
    }

    // Build notification parameters
    const now = Date.now();
    let title = '';
    let body = '';
    let actions = [];
    let timerType = '';
    let timestamp = now;

    if (breast) {
      timerType = 'breast';
      let leftElapsed = breast.leftElapsedMs || 0;
      let rightElapsed = breast.rightElapsedMs || 0;
      if (breast.running && breast.lastSideStartMs) {
        const delta = now - breast.lastSideStartMs;
        if (breast.activeSide === 'LEFT') leftElapsed += delta;
        else rightElapsed += delta;
      }
      const totalElapsed = leftElapsed + rightElapsed;
      const sessionStart = breast.sessionStartMs || now - totalElapsed;
      timestamp = sessionStart;

      const sideLabel = breast.activeSide === 'LEFT' ? (lang === 'nl' ? 'Linkerkant' : 'Left Side') : (lang === 'nl' ? 'Rechterkant' : 'Right Side');
      const statusLabel = breast.running ? sideLabel : (lang === 'nl' ? 'Gepauzeerd' : 'Paused');
      title = `🤱 ${lang === 'nl' ? 'Borstvoeding' : 'Nursing'} (${statusLabel}) — ${babyName}`;
      body = `L: ${formatTimerClock(leftElapsed)} • R: ${formatTimerClock(rightElapsed)} (${lang === 'nl' ? 'Totaal' : 'Total'}: ${formatTimerClock(totalElapsed)})\n${lang === 'nl' ? 'Gestart om' : 'Started at'} ${formatTime(sessionStart, lang)}`;

      actions = [
        { action: 'switch_side', title: lang === 'nl' ? `Naar ${breast.activeSide === 'LEFT' ? 'Rechts' : 'Links'} 🔄` : `To ${breast.activeSide === 'LEFT' ? 'Right' : 'Left'} Side 🔄` },
        { action: 'finish_timer', title: lang === 'nl' ? 'Klaar & Opslaan ✓' : 'Finish & Save ✓' },
      ];
    } else if (sleep) {
      timerType = 'sleep';
      const startMs = sleep.startMs || now;
      const elapsed = Math.max(0, now - startMs);
      timestamp = startMs;

      title = `🌙 ${babyName} ${lang === 'nl' ? 'slaapt' : 'is Sleeping'}`;
      body = `${formatTimerClock(elapsed)} ${lang === 'nl' ? 'verstreken' : 'elapsed'} • ${lang === 'nl' ? 'Gestart om' : 'Started at'} ${formatTime(startMs, lang)}\n${lang === 'nl' ? 'Tik op Wakker zodra de baby opstaat.' : 'Tap Woke Up below when baby awakens.'}`;

      actions = [{ action: 'finish_timer', title: lang === 'nl' ? 'Wakker geworden ☀️' : 'Woke Up ☀️' }];
    } else if (pump) {
      timerType = 'pump';
      const startMs = pump.startMs || now;
      const elapsed = Math.max(0, now - startMs);
      timestamp = startMs;

      title = `🍼 ${lang === 'nl' ? 'Afkolfsessie' : 'Pumping Session'}`;
      body = `${formatTimerClock(elapsed)} ${lang === 'nl' ? 'verstreken' : 'elapsed'} • ${lang === 'nl' ? 'Gestart om' : 'Started at'} ${formatTime(startMs, lang)}`;

      actions = [{ action: 'finish_timer', title: lang === 'nl' ? 'Klaar & Opslaan ✓' : 'Finish & Save ✓' }];
    }

    const payload = {
      title,
      body,
      actions,
      timerType,
      tag: 'nara-active-timer',
      ongoing: true,
      timestamp,
      caregiver: caregiverName,
      isTimer: true,
      isTest: false,
      isTickUpdate,
      silent: isTickUpdate ? true : false,
      renotify: false,
    };

    await this.dispatchNotification(payload);

    // On initial timer start (!isTickUpdate), show in-app toast to confirm active tracking
    if (!isTickUpdate) {
      const startMsg = timerType === 'breast'
        ? (lang === 'nl' ? 'Borstvoeding gestart' : 'Nursing timer started')
        : timerType === 'sleep'
        ? (lang === 'nl' ? 'Slaaptimer gestart' : 'Sleep timer started')
        : (lang === 'nl' ? 'Afkolfsessie gestart' : 'Pumping session started');

      this.showToast({
        title: `⏱️ ${startMsg}`,
        body: `${title.split('—')[0].trim()} • ${lang === 'nl' ? 'Vastgezet in meldingenpaneel' : 'Pinned in notification shade'}`,
        type: timerType,
        timestamp,
      });
    }

    // Start recurring update ticker if not already running (refreshes elapsed time every 15s)
    this.startTicker();
  }

  /**
   * Primary dispatcher: Triggers Native OS Notification and ServiceWorker Android Tray
   */
  async dispatchNotification(payload) {
    const {
      title,
      body,
      actions = [],
      timerType,
      tag = 'nara-active-timer',
      ongoing = false,
      timestamp = Date.now(),
      caregiver,
      isTimer = false,
      isTest = false,
      isTickUpdate = false,
      silent = false,
      renotify = false,
    } = payload;
    let delivered = false;

    // 1. Play gentle audio chime and show in-app popup toast ONLY for explicit tests
    if (isTest) {
      playNotificationChime();
      this.showToast({ title, body, type: timerType, timestamp });
    }

    // Common notification options:
    // Background tick updates (every 15s) MUST be silent with zero vibration and renotify: false.
    // Initial start (!isTickUpdate) is active so Android pins it with a status bar icon and desktop shows the card.
    const isSilent = isTickUpdate ? true : Boolean(silent);
    const notificationOptions = {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      tag: tag || 'nara-active-timer',
      ongoing: isTimer ? true : Boolean(ongoing),
      renotify: isTest ? true : Boolean(renotify), // NEVER renotify on running timer updates
      silent: isSilent,
      vibrate: isSilent ? [] : (isTest ? [200, 100, 200] : [80]),
      timestamp: timestamp || Date.now(),
      actions: actions || [],
      data: {
        timerType,
        caregiver,
        url: '/',
      },
    };

    // 2. Service Worker Registration (Primary for Android & PWAs)
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        let reg = await navigator.serviceWorker.getRegistration();
        if (!reg || typeof reg.showNotification !== 'function') {
          reg = await Promise.race([
            navigator.serviceWorker.ready,
            new Promise((_, reject) => setTimeout(() => reject(new Error('SW ready timeout')), 2500)),
          ]);
        }

        if (reg && typeof reg.showNotification === 'function') {
          await reg.showNotification(title, notificationOptions);
          delivered = true;
          // console.log('[Notification] Displayed via ServiceWorkerRegistration:', title);
        }
      } catch (swErr) {
        console.warn('[Notification] Service Worker showNotification skipped:', swErr.message);
      }
    }

    // 3. Fallback to Direct Window Notification ONLY if Service Worker was unavailable (e.g. desktop standalone without SW)
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        if (!delivered) {
          const notif = new Notification(title, {
            body,
            icon: '/icons/icon-192.png',
            tag: tag || 'nara-active-timer',
            renotify: isTest ? true : Boolean(renotify),
            silent: isSilent,
            timestamp: timestamp || Date.now(),
          });
          this.activeWindowNotification = notif;
          notif.onclick = () => {
            if (typeof window !== 'undefined') window.focus();
            notif.close();
          };
          delivered = true;
        }
      } catch (winErr) {
        // On Android Chrome, new Notification() throws; it requires ServiceWorkerRegistration
      }
    }

    // 4. Background sync message to Service Worker with deliveredByClient flag to prevent duplicate notifications
    this.sendToServiceWorker('UPDATE_TIMER_NOTIFICATION', {
      ...payload,
      silent: isSilent,
      deliveredByClient: delivered,
    });

    return delivered;
  }

  startTicker() {
    if (this.tickerInterval) return;
    this.tickerInterval = setInterval(() => {
      if (this.currentTimers) {
        this.syncTimerNotification(
          this.currentTimers,
          this.currentCaregiver,
          this.currentBaby,
          this.currentLang,
          true // isTickUpdate
        );
      }
    }, 15000);
  }

  stopTicker() {
    if (this.tickerInterval) {
      clearInterval(this.tickerInterval);
      this.tickerInterval = null;
    }
  }

  async clearNotification() {
    this.stopTicker();
    this.currentTimers = null;

    if (this.activeWindowNotification) {
      try {
        this.activeWindowNotification.close();
      } catch (e) {}
      this.activeWindowNotification = null;
    }

    // Clear via Service Worker registration
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const reg = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise((_, reject) => setTimeout(() => reject(new Error('SW ready timeout')), 500)),
        ]);
        if (reg && typeof reg.getNotifications === 'function') {
          const notifications = await reg.getNotifications({ tag: 'nara-active-timer' });
          notifications.forEach((n) => n.close());
        }
      } catch (err) {
        // Ignored
      }
    }

    // Also postMessage to SW
    this.sendToServiceWorker('CLEAR_TIMER_NOTIFICATION', {});
  }

  async sendToServiceWorker(type, payload) {
    if (typeof navigator !== 'undefined' || !('serviceWorker' in navigator)) return;
    try {
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((_, reject) => setTimeout(() => reject(new Error('SW ready timeout')), 500)),
      ]);
      if (reg?.active) {
        reg.active.postMessage({ type, payload });
      }
    } catch (err) {
      // Ignored
    }
  }

  /**
   * Diagnostic Test Notification
   */
  async testNotification() {
    const diag = this.getDiagnostics();
    console.log('[Notification] Running diagnostic test:', diag);
    const isDutch = this.currentLang === 'nl';

    if (!diag.isSecure) {
      return {
        success: false,
        reason: 'insecure',
        message: isDutch
          ? 'Je browser blokkeert meldingen omdat deze verbinding geen HTTPS of localhost is. Zie de thuisserver-melding hierboven.'
          : 'Your browser disabled notifications because this connection is not HTTPS or localhost. See the home server notice above.',
      };
    }

    const perm = await this.requestPermission();
    if (perm !== 'granted') {
      return {
        success: false,
        reason: 'denied',
        message: isDutch
          ? `Meldingsmachtiging staat momenteel op "${perm}". Geef toestemming voor meldingen in je browser- of toestelinstellingen.`
          : `Notification permission is currently "${perm}". Please allow notifications in your browser or device settings.`,
      };
    }

    const delivered = await this.dispatchNotification({
      title: isDutch ? '👶 Baby Tracker: Testmelding' : '👶 Baby Tracker: Test Alert',
      body: isDutch
        ? 'Meldingen, pop-ups in de app en timers in het Android-paneel werken naar behoren!'
        : 'Notifications, In-App pop-ups, and Android tray timers are fully working!',
      actions: [{ action: 'finish_timer', title: isDutch ? 'Begrepen ✓' : 'Got it ✓' }],
      timerType: 'test',
      tag: 'nara-test-notification-' + Date.now(),
      ongoing: false,
      timestamp: Date.now(),
      caregiver: 'Test',
      isTimer: false,
      isTest: true,
      silent: false,
      renotify: true,
    });

    return {
      success: true,
      reason: 'ok',
      message: isDutch
        ? 'Testmelding verstuurd! Zowel een pop-up in de app als een toestelmelding zijn geactiveerd.'
        : 'Notification dispatched! Both an In-App popup and OS notification have been triggered.',
    };
  }
}

export const notificationService = new NotificationService();
