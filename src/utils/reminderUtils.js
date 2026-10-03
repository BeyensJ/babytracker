/**
 * Baby Tracker - Reminder Utility Functions
 * Handles recurrence calculations, overdue checks, formatting, and event generation.
 */

export const RECURRENCE_TYPES = {
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
  EVERY_X_HOURS: 'EVERY_X_HOURS',
  ONCE: 'ONCE',
};

const WEEKDAY_NAMES_NL = ['Zon', 'Maa', 'Din', 'Woe', 'Don', 'Vry', 'Zat'];
const WEEKDAY_NAMES_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Compute the next due time timestamp (ms) given a reminder configuration and reference timestamp
 */
export function computeNextDueTime(reminder, fromTime = Date.now()) {
  const recurrence = reminder.recurrence || RECURRENCE_TYPES.DAILY;
  const timeStr = reminder.time || '08:00';
  const [targetHour, targetMin] = timeStr.split(':').map(Number);
  const fromDate = new Date(fromTime);

  if (recurrence === RECURRENCE_TYPES.EVERY_X_HOURS) {
    const hours = Number(reminder.intervalHours) || 3;
    return fromTime + hours * 60 * 60 * 1000;
  }

  if (recurrence === RECURRENCE_TYPES.ONCE) {
    if (reminder.dueTime && reminder.dueTime > fromTime) {
      return reminder.dueTime;
    }
    // If setting a one-time reminder with specific date & time
    if (reminder.date) {
      const [year, month, day] = reminder.date.split('-').map(Number);
      const d = new Date(year, month - 1, day, targetHour || 0, targetMin || 0, 0, 0);
      return d.getTime();
    }
    // Default once to today at target time or tomorrow if passed
    const d = new Date(fromDate);
    d.setHours(targetHour || 0, targetMin || 0, 0, 0);
    if (d.getTime() <= fromTime) {
      d.setDate(d.getDate() + 1);
    }
    return d.getTime();
  }

  if (recurrence === RECURRENCE_TYPES.DAILY) {
    const targetToday = new Date(fromDate);
    targetToday.setHours(targetHour || 0, targetMin || 0, 0, 0);

    // If targetToday is strictly in the future, return it
    if (targetToday.getTime() > fromTime) {
      return targetToday.getTime();
    }
    // Otherwise, advance to tomorrow at the same time
    const targetTomorrow = new Date(targetToday);
    targetTomorrow.setDate(targetTomorrow.getDate() + 1);
    return targetTomorrow.getTime();
  }

  if (recurrence === RECURRENCE_TYPES.WEEKLY) {
    const days = Array.isArray(reminder.recurrenceDays) && reminder.recurrenceDays.length > 0
      ? reminder.recurrenceDays.map(Number)
      : [1, 2, 3, 4, 5]; // default Mon-Fri

    // Check next 14 days for the next matching weekday
    for (let offset = 0; offset <= 14; offset++) {
      const candidate = new Date(fromDate);
      candidate.setDate(candidate.getDate() + offset);
      candidate.setHours(targetHour || 0, targetMin || 0, 0, 0);

      const dayOfWeek = candidate.getDay(); // 0 = Sun, 1 = Mon ...
      if (days.includes(dayOfWeek) && candidate.getTime() > fromTime) {
        return candidate.getTime();
      }
    }
    // Fallback: 7 days ahead
    return fromTime + 7 * 24 * 60 * 60 * 1000;
  }

  if (recurrence === RECURRENCE_TYPES.MONTHLY) {
    const targetDayOfMonth = Number(reminder.dayOfMonth) || 1;
    let candidate = new Date(fromDate.getFullYear(), fromDate.getMonth(), targetDayOfMonth, targetHour || 0, targetMin || 0, 0, 0);
    if (candidate.getTime() <= fromTime) {
      // Next month
      candidate = new Date(fromDate.getFullYear(), fromDate.getMonth() + 1, targetDayOfMonth, targetHour || 0, targetMin || 0, 0, 0);
    }
    return candidate.getTime();
  }

  return fromTime + 24 * 60 * 60 * 1000;
}

/**
 * Check whether a reminder is currently due / overdue
 */
export function isReminderDue(reminder, now = Date.now()) {
  if (!reminder || !reminder.enabled) return false;
  if (reminder.completed && reminder.recurrence === RECURRENCE_TYPES.ONCE) return false;
  const dueTime = Number(reminder.dueTime);
  return !isNaN(dueTime) && dueTime <= now;
}

/**
 * Human-readable schedule description
 */
export function formatReminderSchedule(reminder, language = 'nl') {
  if (!reminder) return '';
  const isDutch = language === 'nl';
  const recurrence = reminder.recurrence || RECURRENCE_TYPES.DAILY;
  const time = reminder.time || '08:00';

  if (recurrence === RECURRENCE_TYPES.DAILY) {
    return isDutch ? `Dagelijks om ${time}` : `Daily at ${time}`;
  }

  if (recurrence === RECURRENCE_TYPES.EVERY_X_HOURS) {
    const h = reminder.intervalHours || 3;
    return isDutch ? `Elke ${h} uur` : `Every ${h} hours`;
  }

  if (recurrence === RECURRENCE_TYPES.WEEKLY) {
    const days = Array.isArray(reminder.recurrenceDays) ? reminder.recurrenceDays : [];
    const dayNames = isDutch ? WEEKDAY_NAMES_NL : WEEKDAY_NAMES_EN;
    if (days.length === 7) {
      return isDutch ? `Elke dag om ${time}` : `Every day at ${time}`;
    }
    if (days.length === 5 && days.every(d => [1, 2, 3, 4, 5].includes(d))) {
      return isDutch ? `Werkdagen om ${time}` : `Weekdays at ${time}`;
    }
    if (days.length === 2 && days.includes(0) && days.includes(6)) {
      return isDutch ? `In het weekend om ${time}` : `Weekends at ${time}`;
    }
    const list = days.map(d => dayNames[d]).join(', ');
    return isDutch ? `Wekelijks (${list}) om ${time}` : `Weekly (${list}) at ${time}`;
  }

  if (recurrence === RECURRENCE_TYPES.MONTHLY) {
    const dom = reminder.dayOfMonth || 1;
    return isDutch ? `Maandelijks op de ${dom}e om ${time}` : `Monthly on day ${dom} at ${time}`;
  }

  if (recurrence === RECURRENCE_TYPES.ONCE) {
    if (reminder.dueTime) {
      const d = new Date(reminder.dueTime);
      const day = d.getDate();
      const month = d.toLocaleDateString(isDutch ? 'nl-BE' : 'en-US', { month: 'short' });
      const tStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      return isDutch ? `Eenmalig op ${day} ${month} om ${tStr}` : `Once on ${month} ${day} at ${tStr}`;
    }
    return isDutch ? `Eenmalig om ${time}` : `Once at ${time}`;
  }

  return time;
}

/**
 * Format overdue duration (e.g. "35 min te laat" or "2u geleden")
 */
export function formatReminderOverdue(dueTime, language = 'nl', now = Date.now()) {
  const isDutch = language === 'nl';
  const deltaMs = now - dueTime;

  if (deltaMs < 60000) {
    return isDutch ? 'Nu gepland' : 'Due now';
  }

  const mins = Math.floor(deltaMs / 60000);
  if (mins < 60) {
    return isDutch ? `${mins} min te laat` : `${mins}m overdue`;
  }

  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    const remMins = mins % 60;
    if (remMins === 0) {
      return isDutch ? `${hours} uur te laat` : `${hours}h overdue`;
    }
    return isDutch ? `${hours}u ${remMins}m te laat` : `${hours}h ${remMins}m overdue`;
  }

  const days = Math.floor(hours / 24);
  return isDutch ? `${days} dag${days > 1 ? 'en' : ''} te laat` : `${days} day${days > 1 ? 's' : ''} overdue`;
}

/**
 * Format upcoming scheduled time (e.g. "Vandaag om 14:00" or "Morgen om 08:30")
 */
export function formatUpcomingTime(dueTime, language = 'nl', now = Date.now()) {
  const isDutch = language === 'nl';
  const target = new Date(dueTime);
  const nowDate = new Date(now);

  const isToday = target.toDateString() === nowDate.toDateString();
  const tomorrow = new Date(nowDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = target.toDateString() === tomorrow.toDateString();

  const timeStr = `${String(target.getHours()).padStart(2, '0')}:${String(target.getMinutes()).padStart(2, '0')}`;

  if (isToday) {
    return isDutch ? `Vandaag om ${timeStr}` : `Today at ${timeStr}`;
  }
  if (isTomorrow) {
    return isDutch ? `Morgen om ${timeStr}` : `Tomorrow at ${timeStr}`;
  }

  const dayNames = isDutch ? ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag']
    : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const day = target.getDate();
  const month = target.toLocaleDateString(isDutch ? 'nl-BE' : 'en-US', { month: 'short' });

  return `${dayNames[target.getDay()]} ${day} ${month} (${timeStr})`;
}

/**
 * Activity category friendly labels and summaries
 */
export function getCategorySummary(activityType, prefilledData = {}, language = 'nl') {
  const isDutch = language === 'nl';
  const data = prefilledData || {};

  switch (activityType) {
    case 'HEALTH': {
      if (data.subType === 'VACCINE' || data.vaccineName) {
        return data.vaccineName || (isDutch ? 'Vaccinatie' : 'Vaccine');
      }
      if (data.subType === 'TEMP') {
        return isDutch ? 'Temperatuur meten' : 'Check temperature';
      }
      if (data.medicineName) {
        return data.dosage ? `${data.medicineName} (${data.dosage})` : data.medicineName;
      }
      return isDutch ? 'Medicatie / Vitamines' : 'Medication / Vitamins';
    }
    case 'BOTTLE': {
      const parts = [];
      if (data.amount) parts.push(`${data.amount} ${data.unit || 'ml'}`);
      if (data.milkType === 'BREAST_MILK') parts.push(isDutch ? 'Moedermelk' : 'Breast milk');
      else if (data.formulaName) parts.push(data.formulaName);
      else if (data.milkType === 'FORMULA') parts.push(isDutch ? 'Flesvoeding' : 'Formula');
      return parts.length > 0 ? parts.join(' · ') : (isDutch ? 'Flesvoeding' : 'Bottle Feed');
    }
    case 'BREAST': {
      const parts = [];
      if (data.side) {
        if (data.side === 'LEFT') parts.push(isDutch ? 'Linkerborst' : 'Left breast');
        else if (data.side === 'RIGHT') parts.push(isDutch ? 'Rechterborst' : 'Right breast');
        else parts.push(isDutch ? 'Beide borsten' : 'Both breasts');
      }
      if (data.durationMinutes) parts.push(`${data.durationMinutes} min`);
      return parts.length > 0 ? parts.join(' · ') : (isDutch ? 'Borstvoeding' : 'Nursing');
    }
    case 'ROUTINE': {
      const routineLabels = {
        TUMMYTIME: isDutch ? '🐢 Buiktijd' : '🐢 Tummy Time',
        BATH: isDutch ? '🛁 In badje' : '🛁 Bath Time',
        OUTDOOR: isDutch ? '🌳 Wandeling' : '🌳 Outdoor Walk',
        PLAY: isDutch ? '🧸 Spelen' : '🧸 Play Time',
        READ: isDutch ? '📖 Boekje lezen' : '📖 Story Reading',
        NAILTRIM: isDutch ? '✂️ Nageltjes knippen' : '✂️ Nail Trim',
        MASSAGE: isDutch ? '💆 Babymassage' : '💆 Baby Massage',
        SKINCARE: isDutch ? '🧴 Huidverzorging' : '🧴 Skin Care',
        TEETHING: isDutch ? '🦷 Tandjes poetsen' : '🦷 Teething Care',
      };
      const rName = routineLabels[data.routineName] || data.routineName || (isDutch ? 'Routine' : 'Routine');
      return data.durationMin ? `${rName} (${data.durationMin} min)` : rName;
    }
    case 'SOLIDS': {
      const parts = [];
      if (data.food) parts.push(data.food);
      if (data.mealType) parts.push(data.mealType);
      return parts.length > 0 ? parts.join(' · ') : (isDutch ? 'Vaste voeding / Pap' : 'Solids / Puree');
    }
    case 'DIAPER': {
      if (data.pee && data.poop) return isDutch ? 'Plas + Stoelgang' : 'Wet & Dirty';
      if (data.poop) return isDutch ? 'Stoelgang / Luier' : 'Dirty Diaper';
      if (data.pee) return isDutch ? 'Plasluier' : 'Wet Diaper';
      return isDutch ? 'Luier verversen' : 'Diaper Change';
    }
    case 'PUMP': {
      const parts = [];
      if (data.amount) parts.push(`${data.amount} ${data.unit || 'ml'}`);
      if (data.side) parts.push(data.side === 'BOTH' ? (isDutch ? 'Beide' : 'Both') : data.side);
      return parts.length > 0 ? parts.join(' · ') : (isDutch ? 'Afkolven' : 'Pumping');
    }
    case 'SLEEP': {
      return data.sleepType === 'NIGHT' ? (isDutch ? 'Nachtslaap' : 'Night Sleep') : (isDutch ? 'Dutje' : 'Nap');
    }
    case 'GROWTH': {
      return isDutch ? 'Groei meten (gewicht/lengte)' : 'Growth Measurement';
    }
    case 'NOTE': {
      return data.note || (isDutch ? 'Notitie / Mijlpaal' : 'Note / Milestone');
    }
    default:
      return activityType;
  }
}

/**
 * Generate full timeline event payload ready to be saved via `addEvent`
 */
export function createTimelineEventPayload(reminder, caregiverName = 'Parent') {
  const now = Date.now();
  const type = reminder.activityType || 'ROUTINE';
  const pre = reminder.prefilledData || {};

  const baseEvent = {
    id: `evt_${now}_${Math.random().toString(36).substr(2, 7)}`,
    childKey: reminder.childKey || 'child_1',
    type,
    beginDt: now,
    endDt: null,
    durationMs: 0,
    note: pre.note || reminder.note || '',
    photoUrl: pre.photoUrl || null,
    details: {
      caregiver: caregiverName,
      sourceReminderId: reminder.id,
      ...pre,
    },
  };

  if (type === 'ROUTINE') {
    const durMin = Number(pre.durationMin) || 10;
    baseEvent.durationMs = durMin * 60000;
    baseEvent.endDt = now + baseEvent.durationMs;
  } else if (type === 'SLEEP') {
    baseEvent.details.sleepType = pre.sleepType || 'NAP';
  } else if (type === 'BREAST') {
    const durSec = (Number(pre.durationMinutes) || 15) * 60;
    baseEvent.durationMs = durSec * 1000;
    baseEvent.endDt = now;
    baseEvent.details.side = pre.side || 'BOTH';
    baseEvent.details.totalDurationSeconds = durSec;
  } else if (type === 'PUMP') {
    const durSec = (Number(pre.durationMinutes) || 15) * 60;
    baseEvent.durationMs = durSec * 1000;
    baseEvent.endDt = now;
  }

  return baseEvent;
}

/**
 * Standard preset reminder templates for quick setup
 */
export function getPresetTemplates(language = 'nl') {
  const isDutch = language === 'nl';

  return [
    {
      id: 'preset_vitd',
      title: isDutch ? 'Vitamine D druppels' : 'Vitamin D drops',
      activityType: 'HEALTH',
      prefilledData: {
        subType: 'MED',
        medicineName: isDutch ? 'Vitamine D (D-Cure)' : 'Vitamin D Drops',
        dosage: isDutch ? '5 druppels' : '5 drops / 400 IU',
        note: isDutch ? 'Dagelijkse portie vitamine D' : 'Daily Vitamin D supplement',
      },
      recurrence: RECURRENCE_TYPES.DAILY,
      time: '08:30',
      badgeColor: 'var(--color-health)',
      icon: 'Pill',
    },
    {
      id: 'preset_tummytime',
      title: isDutch ? 'Buiktijd oefenen' : 'Tummy Time Session',
      activityType: 'ROUTINE',
      prefilledData: {
        routineName: 'TUMMYTIME',
        durationMin: 15,
        note: isDutch ? 'Spelen op de buik op het speelmatje' : 'Active tummy time on playmat',
      },
      recurrence: RECURRENCE_TYPES.DAILY,
      time: '14:00',
      badgeColor: 'var(--color-routine)',
      icon: 'Clock',
    },
    {
      id: 'preset_bottle_feed',
      title: isDutch ? 'Flesvoeding schema' : 'Bottle Feeding',
      activityType: 'BOTTLE',
      prefilledData: {
        amount: 150,
        unit: 'ml',
        milkType: 'FORMULA',
        formulaName: 'Nutrilon 1',
        calcMode: 'DIRECT',
        note: '',
      },
      recurrence: RECURRENCE_TYPES.EVERY_X_HOURS,
      intervalHours: 3,
      time: '07:30',
      badgeColor: 'var(--color-bottle)',
      icon: 'Milk',
    },
    {
      id: 'preset_bath',
      title: isDutch ? 'In badje' : 'Bath Time Routine',
      activityType: 'ROUTINE',
      prefilledData: {
        routineName: 'BATH',
        durationMin: 20,
        note: isDutch ? 'Lekker warm badje voor het slapengaan' : 'Warm relaxing bath before bedtime',
      },
      recurrence: RECURRENCE_TYPES.WEEKLY,
      recurrenceDays: [3, 6], // Wed, Sat
      time: '19:00',
      badgeColor: 'var(--color-routine)',
      icon: 'Clock',
    },
    {
      id: 'preset_solids_lunch',
      title: isDutch ? 'Groentepap / Lunch' : 'Solids / Puree Lunch',
      activityType: 'SOLIDS',
      prefilledData: {
        food: isDutch ? 'Groentepap (wortel/aardappel)' : 'Vegetable puree',
        mealType: 'Lunch',
        reaction: 'liked',
        note: '',
      },
      recurrence: RECURRENCE_TYPES.DAILY,
      time: '11:45',
      badgeColor: 'var(--color-solids)',
      icon: 'Apple',
    },
    {
      id: 'preset_solids_snack',
      title: isDutch ? 'Fruitpap / Vieruurtje' : 'Fruit Puree Snack',
      activityType: 'SOLIDS',
      prefilledData: {
        food: isDutch ? 'Fruitpap (banaan/appel/koekjesmeel)' : 'Fruit puree (banana/apple)',
        mealType: 'Snack',
        reaction: 'loved',
        note: '',
      },
      recurrence: RECURRENCE_TYPES.DAILY,
      time: '15:30',
      badgeColor: 'var(--color-solids)',
      icon: 'Apple',
    },
    {
      id: 'preset_pump',
      title: isDutch ? 'Avond afkolfsessie' : 'Evening Pumping',
      activityType: 'PUMP',
      prefilledData: {
        side: 'BOTH',
        amount: 120,
        unit: 'ml',
        durationMinutes: 15,
        note: '',
      },
      recurrence: RECURRENCE_TYPES.DAILY,
      time: '21:30',
      badgeColor: 'var(--color-pump)',
      icon: 'Sparkles',
    },
    {
      id: 'preset_nailtrim',
      title: isDutch ? 'Nageltjes knippen' : 'Nail Trimming',
      activityType: 'ROUTINE',
      prefilledData: {
        routineName: 'NAILTRIM',
        durationMin: 10,
        note: isDutch ? 'Handjes en voetjes controleren' : 'Trim baby nails',
      },
      recurrence: RECURRENCE_TYPES.WEEKLY,
      recurrenceDays: [6], // Saturday
      time: '10:00',
      badgeColor: 'var(--color-routine)',
      icon: 'Clock',
    },
  ];
}
