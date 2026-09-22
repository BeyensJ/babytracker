/**
 * Utility functions for date, time, duration, and baby age formatting
 * Localized for Flemish Dutch ('nl') and English ('en')
 */

/**
 * Format timestamp in ms to time string e.g. "14:30" (nl) or "2:30 PM" (en)
 */
export function formatTime(ts, lang = 'nl') {
  if (!ts) return '';
  const date = new Date(ts);
  const isDutch = lang === 'nl';
  return date.toLocaleTimeString(isDutch ? 'nl-BE' : 'en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: !isDutch,
  });
}

/**
 * Format timestamp in ms to relative time string
 * e.g. "Zonet", "25 min geleden", "2u 10m geleden", "Gisteren" (nl)
 * or "Just now", "25m ago", "2h 10m ago", "Yesterday" (en)
 */
export function formatRelative(ts, nowMs = Date.now(), lang = 'nl') {
  if (!ts) return lang === 'nl' ? 'Nooit' : 'Never';
  const diffMs = Math.max(0, nowMs - ts);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const isDutch = lang === 'nl';

  if (diffMins < 1) return isDutch ? 'Zonet' : 'Just now';
  if (diffMins < 60) return isDutch ? `${diffMins} min geleden` : `${diffMins}m ago`;
  if (diffHours < 24) {
    const remMins = diffMins % 60;
    if (isDutch) {
      return remMins > 0 ? `${diffHours}u ${remMins}m geleden` : `${diffHours}u geleden`;
    }
    return remMins > 0 ? `${diffHours}h ${remMins}m ago` : `${diffHours}h ago`;
  }
  if (diffDays === 1) return isDutch ? 'Gisteren' : 'Yesterday';
  return isDutch ? `${diffDays}d geleden` : `${diffDays}d ago`;
}

/**
 * Format duration in milliseconds e.g. "1u 45m" (nl) or "1h 45m" (en)
 */
export function formatDurationMs(ms, lang = 'nl') {
  if (!ms || ms <= 0) return '0 min';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const isDutch = lang === 'nl';
  const hUnit = isDutch ? 'u' : 'h';

  if (hours > 0) {
    return minutes > 0 ? `${hours}${hUnit} ${minutes}m` : `${hours}${hUnit}`;
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
 * Format date group heading e.g. "Vandaag", "Gisteren", "di 22 sep" (nl)
 */
export function formatDateHeading(dateKey, lang = 'nl') {
  if (!dateKey) return '';
  const todayKey = toDateKey(Date.now());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayKey = toDateKey(yesterdayDate.getTime());
  const isDutch = lang === 'nl';

  if (dateKey === todayKey) return isDutch ? 'Vandaag' : 'Today';
  if (dateKey === yesterdayKey) return isDutch ? 'Gisteren' : 'Yesterday';

  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(isDutch ? 'nl-BE' : 'en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Calculate age text for baby from birthdate ISO/timestamp
 * e.g. "3 maanden oud" / "12 dagen oud" (nl) or "3 months old" / "12 days old" (en)
 */
export function calculateBabyAge(birthdateStr, lang = 'nl') {
  if (!birthdateStr) return 'Baby';
  const birth = new Date(birthdateStr);
  const now = new Date();
  const isDutch = lang === 'nl';

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
    if (isDutch) {
      return totalDays <= 1 ? '1 dag oud' : `${totalDays} dagen oud`;
    }
    return totalDays <= 1 ? '1 day old' : `${totalDays} days old`;
  }
  if (totalDays < 30) {
    const weeks = Math.floor(totalDays / 7);
    const remDays = totalDays % 7;
    if (isDutch) {
      return remDays > 0 ? `${weeks} w, ${remDays} d` : `${weeks} weken oud`;
    }
    return remDays > 0 ? `${weeks} wk, ${remDays} d` : `${weeks} weeks old`;
  }
  if (years === 0) {
    if (isDutch) {
      return days > 0 ? `${months} mnd, ${days} dgn` : `${months} maanden oud`;
    }
    return days > 0 ? `${months} mos, ${days} days` : `${months} months old`;
  }
  if (isDutch) {
    return months > 0 ? `${years} jr, ${months} mnd` : `${years} jaar oud`;
  }
  return months > 0 ? `${years} yr, ${months} mos` : `${years} year old`;
}

/**
 * Calculate wake window status given awake milliseconds
 * Returns { label: string, status: 'green' | 'amber' | 'red' }
 */
export function getWakeWindowStatus(awakeMs, lang = 'nl') {
  const isDutch = lang === 'nl';
  if (!awakeMs || awakeMs < 0) {
    return { label: isDutch ? 'Slaapt nu' : 'Sleeping', status: 'neutral' };
  }
  const minutes = Math.floor(awakeMs / 60000);
  const hours = Math.floor(minutes / 60);
  const remMins = minutes % 60;
  const hUnit = isDutch ? 'u' : 'h';
  const timeText = hours > 0 ? `${hours}${hUnit} ${remMins}m` : `${remMins}m`;
  const prefix = isDutch ? `Al ${timeText} wakker` : `Awake ${timeText}`;

  if (minutes < 90) {
    return { label: prefix, status: 'green' };
  }
  if (minutes <= 150) {
    return { label: prefix, status: 'amber' };
  }
  return { label: prefix, status: 'red' };
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
  const rounded = Math.round(valFloz * 100) / 100;
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
