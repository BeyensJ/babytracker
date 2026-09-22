/**
 * Haptic Feedback Utility for Mobile PWA
 * Uses the Web Vibration API (navigator.vibrate) to deliver subtle tactile cues.
 */

// Vibration pattern presets in milliseconds
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
export function triggerHaptic(type = 'light', isEnabled = true) {
  if (!isEnabled) return;
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;

  try {
    const pattern = PATTERNS[type] || PATTERNS.light;
    navigator.vibrate(pattern);
  } catch (err) {
    // Graceful fallback on devices with vibration restrictions
  }
}
