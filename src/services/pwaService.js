/**
 * Baby Tracker - PWA Service
 * Handles Service Worker registration and PWA installation prompts.
 */

class PWAService {
  constructor() {
    this.deferredPrompt = null;
    this.listeners = new Set();
    this.isInstalled = this.checkIsInstalled();
  }

  checkIsInstalled() {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://')
    );
  }

  init() {
    if (typeof window === 'undefined') return;

    // Register Service Worker
    if ('serviceWorker' in navigator) {
      const registerSW = () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('[PWA] Service Worker registered with scope:', reg.scope);
          })
          .catch((err) => {
            console.warn('[PWA] Service Worker registration failed:', err);
          });
      };

      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        registerSW();
      } else {
        window.addEventListener('load', registerSW);
      }
    }

    // Capture install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent default Chrome mini-infobar
      e.preventDefault();
      this.deferredPrompt = e;
      this.notify();
    });

    // Detect when successfully installed
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] Baby Tracker app installed successfully');
      this.deferredPrompt = null;
      this.isInstalled = true;
      this.notify();
    });
  }

  get canInstall() {
    return Boolean(this.deferredPrompt) && !this.isInstalled;
  }

  async installApp() {
    if (!this.deferredPrompt) {
      return { outcome: 'unavailable' };
    }

    try {
      this.deferredPrompt.prompt();
      const choiceResult = await this.deferredPrompt.userChoice;
      console.log('[PWA] User choice:', choiceResult.outcome);
      if (choiceResult.outcome === 'accepted') {
        this.deferredPrompt = null;
      }
      this.notify();
      return choiceResult;
    } catch (err) {
      console.error('[PWA] Error triggering install prompt:', err);
      return { outcome: 'dismissed' };
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    const state = {
      canInstall: this.canInstall,
      isInstalled: this.isInstalled,
    };
    this.listeners.forEach((fn) => fn(state));
  }
}

export const pwaService = new PWAService();
