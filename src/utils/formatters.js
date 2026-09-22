/**
 * Utility functions for date, time, duration, and baby age formatting
 */

/**
 * Format timestamp in ms to time string e.g. "9:45 AM"
 */
export function formatTime(ts) {
  if (!ts) return '';
  const date = new Date(ts);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
}

/**
 * Format timestamp in ms to relative time string e.g. "25m ago", "2h ago", "Just now"
 */
export function formatRelative(ts, nowMs = Date.now()) {
  if (!ts) return 'Never';
  const diffMs = Math.max(0, nowMs - ts);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) {
    const remMins = diffMins % 60;
    return remMins > 0 ? `${diffHours}h ${remMins}m ago` : `${diffHours}h ago`;
  }
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays}d ago`;
}

/**
 * Format duration in milliseconds e.g. "1h 45m" or "25 min"
 */
export function formatDurationMs(ms) {
  if (!ms || ms <= 0) return '0 min';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${minutes} min`;
}

/**
 * Format timer duration in format "MM:SS" or "HH:MM:SS"
 */
export function formatTimerClock(ms) {
  if (!ms || ms <= 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n) => String(n).padStart(2, '0');
  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Format timestamp to a date group key "YYYY-MM-DD"
 */
export function toDateKey(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format date group heading e.g. "Today", "Yesterday", or "Monday, Sep 22"
 */
export function formatDateHeading(dateKey) {
  if (!dateKey) return '';
  const todayKey = toDateKey(Date.now());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayKey = toDateKey(yesterdayDate.getTime());

  if (dateKey === todayKey) return 'Today';
  if (dateKey === yesterdayKey) return 'Yesterday';

  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

/**
 * Calculate age text for baby from birthdate ISO/timestamp
 * e.g. "3 months, 12 days" or "10 days old"
 */
export function calculateBabyAge(birthdateStr) {
  if (!birthdateStr) return 'Baby';
  const birth = new Date(birthdateStr);
  const now = new Date();

  if (isNaN(birth.getTime())) return 'Baby';

  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  let days = now.getDate() - birth.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonthDays = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    days += prevMonthDays;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const totalDays = Math.floor((now - birth) / (1000 * 60 * 60 * 24));
  if (totalDays < 7) {
    return totalDays <= 1 ? '1 day old' : `${totalDays} days old`;
  }
  if (totalDays < 30) {
    const weeks = Math.floor(totalDays / 7);
    const remDays = totalDays % 7;
    return remDays > 0 ? `${weeks} wk, ${remDays} d` : `${weeks} weeks old`;
  }
  if (years === 0) {
    return days > 0 ? `${months} mos, ${days} days` : `${months} months old`;
  }
  return months > 0 ? `${years} yr, ${months} mos` : `${years} year old`;
}

/**
 * Calculate wake window status given awake milliseconds
 * Returns { label: string, status: 'green' | 'amber' | 'red' }
 */
export function getWakeWindowStatus(awakeMs) {
  if (!awakeMs || awakeMs < 0) {
    return { label: 'Sleeping', status: 'neutral' };
  }
  const minutes = Math.floor(awakeMs / 60000);
  const hours = Math.floor(minutes / 60);
  const remMins = minutes % 60;
  const timeText = hours > 0 ? `${hours}h ${remMins}m` : `${remMins}m`;

  if (minutes < 90) {
    return { label: `Awake ${timeText}`, status: 'green' };
  }
  if (minutes <= 150) {
    return { label: `Awake ${timeText}`, status: 'amber' };
  }
  return { label: `Awake ${timeText}`, status: 'red' };
}

/**
 * Volume formatting
 */
export function formatVolume(valFloz, unit = 'oz') {
  if (valFloz === null || valFloz === undefined || isNaN(valFloz)) return '';
  if (unit === 'ml' || unit === 'mL') {
    const ml = Math.round(valFloz * 29.5735);
    return `${ml} mL`;
  }
  const rounded = Math.round(valFloz * 10) / 10;
  return `${rounded} oz`;
}

/**
 * Weight formatting
 */
export function formatWeight(valLb, unit = 'lb') {
  if (!valLb || isNaN(valLb)) return '';
  if (unit === 'kg') {
    const kg = Math.round(valLb * 0.453592 * 100) / 100;
    return `${kg} kg`;
  }
  const lbs = Math.floor(valLb);
  const oz = Math.round((valLb - lbs) * 16);
  return `${lbs} lb ${oz} oz`;
}

/**
 * Length formatting
 */
export function formatLength(valInches, unit = 'in') {
  if (!valInches || isNaN(valInches)) return '';
  if (unit === 'cm') {
    const cm = Math.round(valInches * 2.54 * 10) / 10;
    return `${cm} cm`;
  }
  return `${Math.round(valInches * 10) / 10} in`;
}

/**
 * Temperature formatting
 */
export function formatTemp(valF, unit = 'F') {
  if (!valF || isNaN(valF)) return '';
  if (unit === 'C') {
    const c = Math.round(((valF - 32) * 5 / 9) * 10) / 10;
    return `${c}°C`;
  }
  return `${Math.round(valF * 10) / 10}°F`;
}
