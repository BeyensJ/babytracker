/**
 * Haptic Feedback Utility for Mobile PWA & Native Capacitor Android App
 * Uses @capacitor/haptics natively on Android and the Web Vibration API as fallback.
 */
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

// Vibration pattern presets in milliseconds for Web Vibration API
const PATTERNS = {
  light: 12,                  // Quick subtle tap for buttons, pills, tabs
  medium: 24,                 // Tactile pulse for switching timer sides, dock taps
  heavy: 45,                  // Solid pulse for starting/stopping timers
  success: [15, 45, 20],      // Double tap on successful logging or saving
  warning: [30, 60, 30],      // Alert or delete confirmation
};

/**
 * Triggers a haptic vibration if supported by the device and enabled in preferences.
 * @param {'light' | 'medium' | 'heavy' | 'success' | 'warning'} type
 * @param {boolean} isEnabled
 */
export async function triggerHaptic(type = 'light', isEnabled = true) {
  if (!isEnabled) return;

  // 1. Try native Capacitor Haptics on Android / iOS
  if (Capacitor.isNativePlatform()) {
    try {
      switch (type) {
        case 'light':
          await Haptics.impact({ style: ImpactStyle.Light });
          return;
        case 'medium':
          await Haptics.impact({ style: ImpactStyle.Medium });
          return;
        case 'heavy':
          await Haptics.impact({ style: ImpactStyle.Heavy });
          return;
        case 'success':
          await Haptics.notification({ type: NotificationType.Success });
          return;
        case 'warning':
          await Haptics.notification({ type: NotificationType.Warning });
          return;
        default:
          await Haptics.impact({ style: ImpactStyle.Light });
          return;
      }
    } catch {
      // Graceful fallback to web vibration below
    }
  }

  // 2. Fallback to Web Vibration API for browsers / PWAs
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      const pattern = PATTERNS[type] || PATTERNS.light;
      navigator.vibrate(pattern);
    } catch {
      // Graceful fallback on devices with vibration restrictions
    }
  }
}
