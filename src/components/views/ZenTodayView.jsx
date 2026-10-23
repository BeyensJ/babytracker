import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  formatRelative,
  formatTime,
  formatDurationMs,
  formatVolume,
  toDateKey,
  getWakeWindowStatus,
  formatRoutineName,
} from '../../utils/formatters';
import { triggerHaptic } from '../../utils/haptics';
import {
  Heart,
  Milk,
  Moon,
  Sparkles,
  Apple,
  Ruler,
  Stethoscope,
  Clock,
  Plus,
  Flower2,
  BellRing,
  Sun,
  ChevronRight,
  User,
  Pause,
  Play,
  Check,
  RotateCcw,
  SlidersHorizontal,
  X,
  Droplet,
  School,
  BookOpen,
  Award,
  Utensils,
} from 'lucide-react';
import { PumpIcon } from '../icons/PumpIcon';

export function ZenTodayView() {
  const {
    events,
    activeChild,
    activeChildId,
    activeTimers,
    dueReminders,
    openModal,
    preferences,
    stopBreastTimer,
    switchBreastSide,
    stopSleepTimer,
    stopPumpTimer,
    language,
    t,
  } = useApp();

  const [now, setNow] = useState(Date.now());
  const [showMoreActions, setShowMoreActions] = useState(false);
  const isDutch = language === 'nl';

  // Live timer tick every 10s for relative times and live clocks
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  const babyName = activeChild?.name || (isDutch ? 'Baby' : 'Baby');
  const childEvents = events.filter((e) => !e.childKey || e.childKey === activeChildId);

  // Active timer states
  const isSleeping = Boolean(activeTimers?.sleep?.running);
  const isNursing = Boolean(activeTimers?.breast?.running);
  const isPumping = Boolean(activeTimers?.pump?.running);

  // Compute awake duration / sleep state
  const latestSleep = childEvents.find((e) => e.type === 'SLEEP');
  let awakeMs = 0;
  if (isSleeping) {
    awakeMs = -1;
  } else if (latestSleep) {
    const isOngoing = !latestSleep.endDt && !latestSleep.durationMs;
    if (isOngoing) {
      awakeMs = -1;
    } else {
      const sleepEnd = latestSleep.endDt || (latestSleep.beginDt + (latestSleep.durationMs || 0));
      awakeMs = Math.max(0, now - sleepEnd);
    }
  } else {
    awakeMs = 60 * 60 * 1000;
  }

  const getAwakeText = () => {
    if (awakeMs <= 0) return isDutch ? 'Net wakker' : 'Just woke up';
    const mins = Math.floor(awakeMs / 60000);
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    const hUnit = isDutch ? 'u' : 'h';
    if (hrs === 0) return isDutch ? `${remMins}m wakker` : `${remMins}m awake`;
    return isDutch ? `${hrs}${hUnit} ${remMins}m wakker` : `${hrs}h ${remMins}m awake`;
  };

  const wakeStatus = isSleeping || awakeMs === -1
    ? { label: isDutch ? 'Slaapt vredig' : 'Sleeping peacefully', status: 'neutral' }
    : getWakeWindowStatus(awakeMs, language);

  // Dynamic Quick Status Card Builder based on user preferences
  const getStatusCardInfo = (cardId) => {
    switch (cardId) {
      case 'FEEDS': {
        const ev = childEvents.find((e) => ['BREAST', 'BOTTLE', 'SOLIDS', 'COMBO'].includes(e.type));
        if (isNursing) {
          const activeSide = activeTimers?.breast?.activeSide || activeTimers?.breast?.side;
          const side = activeSide === 'RIGHT' ? (isDutch ? 'Rechts' : 'Right') : (isDutch ? 'Links' : 'Left');
          return {
            id: 'FEEDS',
            title: isDutch ? 'Voeding' : 'Feed',
            time: isDutch ? 'Nu bezig' : 'Nursing now',
            detail: `${isDutch ? 'Borst' : 'Nursing'} (${side})`,
            icon: Heart,
            colorClass: 'breast',
            modal: 'BREAST',
          };
        }
        if (!ev) {
          return {
            id: 'FEEDS',
            title: isDutch ? 'Voeding' : 'Feed',
            time: '—',
            detail: isDutch ? 'Geen voeding' : 'No feeds logged',
            icon: Utensils,
            colorClass: 'feed',
            modal: 'BREAST',
          };
        }
        const time = formatRelative(ev.beginDt, now, language);
        if (ev.type === 'BOTTLE') {
          const vol = ev.details?.volumeFloz ? formatVolume(ev.details.volumeFloz, preferences.volumeUnit) : '';
          return {
            id: 'FEEDS',
            title: isDutch ? 'Flesje' : 'Bottle',
            time,
            detail: vol || (isDutch ? 'Flesje' : 'Bottle'),
            icon: Milk,
            colorClass: 'bottle',
            modal: 'BOTTLE',
          };
        }
        if (ev.type === 'BREAST') {
          const side = (ev.details?.side || '').toUpperCase();
          const s = side.includes('LEFT') ? (isDutch ? 'Links' : 'Left') : side.includes('RIGHT') ? (isDutch ? 'Rechts' : 'Right') : (isDutch ? 'Beide' : 'Both');
          const dur = ev.durationMs ? formatDurationMs(ev.durationMs, language) : '';
          return {
            id: 'FEEDS',
            title: isDutch ? 'Borst' : 'Nursing',
            time,
            detail: dur ? `${s} (${dur})` : s,
            icon: Heart,
            colorClass: 'breast',
            modal: 'BREAST',
          };
        }
        if (ev.type === 'SOLIDS') {
          return {
            id: 'FEEDS',
            title: isDutch ? 'Hapjes' : 'Solids',
            time,
            detail: ev.details?.foodItems || (isDutch ? 'Vaste voeding' : 'Solids'),
            icon: Apple,
            colorClass: 'solids',
            modal: 'SOLIDS',
          };
        }
        return {
          id: 'FEEDS',
          title: isDutch ? 'Voeding' : 'Feed',
          time,
          detail: isDutch ? 'Voeding' : 'Feed',
          icon: Utensils,
          colorClass: 'feed',
          modal: 'BREAST',
        };
      }
      case 'BREAST': {
        const ev = childEvents.find((e) => e.type === 'BREAST');
        if (isNursing) {
          const activeSide = activeTimers?.breast?.activeSide || activeTimers?.breast?.side;
          const side = activeSide === 'RIGHT' ? (isDutch ? 'Rechts' : 'Right') : (isDutch ? 'Links' : 'Left');
          return {
            id: 'BREAST',
            title: isDutch ? 'Borstvoeding' : 'Nursing',
            time: isDutch ? 'Nu bezig' : 'Nursing now',
            detail: `${isDutch ? 'Aan de borst' : 'Nursing'} (${side})`,
            icon: Heart,
            colorClass: 'breast',
            modal: 'BREAST',
          };
        }
        return {
          id: 'BREAST',
          title: isDutch ? 'Borst' : 'Nursing',
          time: ev ? formatRelative(ev.beginDt, now, language) : '—',
          detail: ev ? (ev.durationMs ? formatDurationMs(ev.durationMs, language) : (isDutch ? 'Borstvoeding' : 'Nursing')) : (isDutch ? 'Geen sessies' : 'No nurse yet'),
          icon: Heart,
          colorClass: 'breast',
          modal: 'BREAST',
        };
      }
      case 'BOTTLE': {
        const ev = childEvents.find((e) => e.type === 'BOTTLE');
        const vol = ev?.details?.volumeFloz ? formatVolume(ev.details.volumeFloz, preferences.volumeUnit) : '';
        return {
          id: 'BOTTLE',
          title: isDutch ? 'Flesje' : 'Bottle',
          time: ev ? formatRelative(ev.beginDt, now, language) : '—',
          detail: vol || (isDutch ? 'Geen flesjes' : 'No bottles yet'),
          icon: Milk,
          colorClass: 'bottle',
          modal: 'BOTTLE',
        };
      }
      case 'SLEEP': {
        if (isSleeping) {
          const elapsed = activeTimers?.sleep?.startMs ? now - activeTimers.sleep.startMs : 0;
          return {
            id: 'SLEEP',
            title: isDutch ? 'Slaap' : 'Sleep',
            time: isDutch ? 'Nu actief' : 'Sleeping now',
            detail: elapsed > 0 ? formatDurationMs(elapsed, language) : (isDutch ? 'Slaapt' : 'Asleep'),
            icon: Moon,
            colorClass: 'sleep',
            modal: 'SLEEP',
          };
        }
        const ev = childEvents.find((e) => e.type === 'SLEEP');
        if (ev) {
          const sleepEnd = ev.endDt || (ev.beginDt + (ev.durationMs || 0));
          const dur = ev.durationMs ? formatDurationMs(ev.durationMs, language) : '';
          return {
            id: 'SLEEP',
            title: isDutch ? 'Slaap' : 'Sleep',
            time: formatRelative(sleepEnd, now, language),
            detail: dur ? `${dur} ${isDutch ? 'slaap' : 'sleep'}` : (isDutch ? 'Dutje' : 'Nap'),
            icon: Moon,
            colorClass: 'sleep',
            modal: 'SLEEP',
          };
        }
        return {
          id: 'SLEEP',
          title: isDutch ? 'Slaap' : 'Sleep',
          time: '—',
          detail: isDutch ? 'Geen slaapje' : 'No sleep logged',
          icon: Moon,
          colorClass: 'sleep',
          modal: 'SLEEP',
        };
      }
      case 'DIAPER': {
        const ev = childEvents.find((e) => e.type === 'DIAPER');
        if (ev) {
          const dt = (ev.details?.diaperType || '').toUpperCase();
          let desc = isDutch ? 'Nat' : 'Wet';
          if (dt === 'DIRTY') desc = isDutch ? 'Kaka' : 'Dirty';
          else if (dt === 'BOTH') desc = isDutch ? 'Nat & kaka' : 'Wet & dirty';
          else if (dt === 'CLEAN') desc = isDutch ? 'Schoon' : 'Clean';
          return {
            id: 'DIAPER',
            title: isDutch ? 'Pamper' : 'Diaper',
            time: formatRelative(ev.beginDt, now, language),
            detail: desc,
            icon: Sparkles,
            colorClass: 'diaper',
            modal: 'DIAPER',
          };
        }
        return {
          id: 'DIAPER',
          title: isDutch ? 'Pamper' : 'Diaper',
          time: '—',
          detail: isDutch ? 'Geen pamper' : 'No diaper',
          icon: Sparkles,
          colorClass: 'diaper',
          modal: 'DIAPER',
        };
      }
      case 'PUMP': {
        const ev = childEvents.find((e) => e.type === 'PUMP');
        if (isPumping) {
          const elapsed = activeTimers?.pump?.startMs ? now - activeTimers.pump.startMs : 0;
          return {
            id: 'PUMP',
            title: isDutch ? 'Afkolven' : 'Pump',
            time: isDutch ? 'Nu bezig' : 'Pumping now',
            detail: elapsed > 0 ? formatDurationMs(elapsed, language) : (isDutch ? 'Kolven' : 'Pumping'),
            icon: PumpIcon,
            colorClass: 'pump',
            modal: 'PUMP',
          };
        }
        if (ev) {
          const vol = ev.details?.volumeFloz ? formatVolume(ev.details.volumeFloz, preferences.volumeUnit) : '';
          const dur = ev.durationMs ? formatDurationMs(ev.durationMs, language) : '';
          return {
            id: 'PUMP',
            title: isDutch ? 'Afkolven' : 'Pump',
            time: formatRelative(ev.beginDt, now, language),
            detail: [vol, dur].filter(Boolean).join(' · ') || (isDutch ? 'Kolfsessie' : 'Pump session'),
            icon: PumpIcon,
            colorClass: 'pump',
            modal: 'PUMP',
          };
        }
        return {
          id: 'PUMP',
          title: isDutch ? 'Afkolven' : 'Pump',
          time: '—',
          detail: isDutch ? 'Geen sessies' : 'No pumping yet',
          icon: PumpIcon,
          colorClass: 'pump',
          modal: 'PUMP',
        };
      }
      case 'SOLIDS': {
        const ev = childEvents.find((e) => e.type === 'SOLIDS');
        return {
          id: 'SOLIDS',
          title: isDutch ? 'Hapjes' : 'Solids',
          time: ev ? formatRelative(ev.beginDt, now, language) : '—',
          detail: ev ? (ev.details?.foodItems || (isDutch ? 'Vaste voeding' : 'Solids')) : (isDutch ? 'Nog geen hapjes' : 'No solids yet'),
          icon: Apple,
          colorClass: 'solids',
          modal: 'SOLIDS',
        };
      }
      case 'GROWTH': {
        const ev = childEvents.find((e) => e.type === 'GROWTH');
        const det = ev?.details || {};
        const parts = [];
        if (det.weightKg) parts.push(`${det.weightKg} kg`);
        if (det.heightCm) parts.push(`${det.heightCm} cm`);
        return {
          id: 'GROWTH',
          title: isDutch ? 'Groei' : 'Growth',
          time: ev ? formatRelative(ev.beginDt, now, language) : '—',
          detail: parts.join(' · ') || (isDutch ? 'Meting' : 'Growth'),
          icon: Ruler,
          colorClass: 'growth',
          modal: 'GROWTH',
        };
      }
      case 'HEALTH': {
        const ev = childEvents.find((e) => e.type === 'HEALTH');
        const det = ev?.details || {};
        const temp = det.temperatureC ? `${det.temperatureC}°C` : '';
        return {
          id: 'HEALTH',
          title: isDutch ? 'Zorg' : 'Health',
          time: ev ? formatRelative(ev.beginDt, now, language) : '—',
          detail: temp || det.medicationName || (isDutch ? 'Geen meldingen' : 'All good'),
          icon: Stethoscope,
          colorClass: 'health',
          modal: 'HEALTH',
        };
      }
      case 'DAYCARE': {
        const ev = childEvents.find((e) => e.type === 'DAYCARE');
        return {
          id: 'DAYCARE',
          title: isDutch ? 'Opvang' : 'Daycare',
          time: ev ? formatRelative(ev.beginDt, now, language) : '—',
          detail: ev ? (ev.details?.daycareName || (isDutch ? 'Verblijf' : 'Daycare')) : (isDutch ? 'Geen opvang' : 'No daycare today'),
          icon: School,
          colorClass: 'daycare',
          modal: 'DAYCARE',
        };
      }
      case 'ROUTINE': {
        const ev = childEvents.find((e) => e.type === 'ROUTINE');
        const rName = ev?.details?.routineName ? formatRoutineName(ev.details.routineName, language, true) : '';
        return {
          id: 'ROUTINE',
          title: isDutch ? 'Routine' : 'Routine',
          time: ev ? formatRelative(ev.beginDt, now, language) : '—',
          detail: rName || (isDutch ? 'Activiteit' : 'Activity'),
          icon: Clock,
          colorClass: 'routine',
          modal: 'ROUTINE',
        };
      }
      case 'NOTE': {
        const ev = childEvents.find((e) => e.type === 'NOTE');
        return {
          title: isDutch ? 'Notitie' : 'Note',
          time: ev ? formatRelative(ev.beginDt, now, language) : '—',
          detail: ev?.note ? (ev.note.length > 20 ? ev.note.slice(0, 20) + '…' : ev.note) : (isDutch ? 'Dagboek' : 'Journal'),
          icon: BookOpen,
          colorClass: 'default',
          modal: 'NOTE',
        };
      }
      case 'MILESTONE': {
        const ev = childEvents.find((e) => e.type === 'MILESTONE');
        return {
          title: isDutch ? 'Mijlpaal' : 'Milestone',
          time: ev ? formatRelative(ev.beginDt, now, language) : '—',
          detail: ev?.details?.milestoneTitle || ev?.note || (isDutch ? 'Eerste keer' : 'Milestone'),
          icon: Award,
          colorClass: 'growth',
          modal: 'MILESTONE',
        };
      }
      default:
        return null;
    }
  };

  // Active status cards chosen by the user in preferences
  const configuredCardIds = preferences?.quickStatusCards && preferences.quickStatusCards.length > 0
    ? preferences.quickStatusCards
    : ['FEEDS', 'SLEEP', 'DIAPER'];

  const activeStatusCards = configuredCardIds
    .map((id) => getStatusCardInfo(id))
    .filter(Boolean);

  // All supported quick action definitions
  const ALL_ZEN_ACTIONS = [
    { id: 'BREAST', label: isDutch ? 'Borst' : 'Nursing', icon: Heart, colorClass: 'breast', modal: 'BREAST' },
    { id: 'BOTTLE', label: isDutch ? 'Flesje' : 'Bottle', icon: Milk, colorClass: 'bottle', modal: 'BOTTLE' },
    { id: 'SLEEP', label: isDutch ? 'Slaap' : 'Sleep', icon: Moon, colorClass: 'sleep', modal: 'SLEEP' },
    { id: 'DIAPER', label: isDutch ? 'Pamper' : 'Diaper', icon: Sparkles, colorClass: 'diaper', modal: 'DIAPER' },
    { id: 'PUMP', label: isDutch ? 'Kolven' : 'Pump', icon: PumpIcon, colorClass: 'pump', modal: 'PUMP' },
    { id: 'SOLIDS', label: isDutch ? 'Hapjes' : 'Solids', icon: Apple, colorClass: 'solids', modal: 'SOLIDS' },
    { id: 'GROWTH', label: isDutch ? 'Groei' : 'Growth', icon: Ruler, colorClass: 'growth', modal: 'GROWTH' },
    { id: 'HEALTH', label: isDutch ? 'Zorg' : 'Health', icon: Stethoscope, colorClass: 'health', modal: 'HEALTH' },
    { id: 'ROUTINE', label: isDutch ? 'Routine' : 'Routine', icon: Clock, colorClass: 'routine', modal: 'ROUTINE' },
    { id: 'DAYCARE', label: isDutch ? 'Opvang' : 'Daycare', icon: School, colorClass: 'daycare', modal: 'DAYCARE' },
    { id: 'NOTE', label: isDutch ? 'Notitie' : 'Note', icon: BookOpen, colorClass: 'default', modal: 'NOTE' },
    { id: 'MILESTONE', label: isDutch ? 'Mijlpaal' : 'Milestone', icon: Award, colorClass: 'growth', modal: 'MILESTONE' },
  ];

  // Active quick action pills chosen by user in preferences
  const selectedActionIds = preferences?.quickActionButtons && preferences.quickActionButtons.length > 0
    ? preferences.quickActionButtons
    : ['BREAST', 'BOTTLE', 'SLEEP', 'DIAPER'];

  const primaryActions = selectedActionIds
    .map((id) => ALL_ZEN_ACTIONS.find((a) => a.id === id))
    .filter(Boolean);

  const moreActions = ALL_ZEN_ACTIONS.filter((a) => !selectedActionIds.includes(a.id));

  // Group events by day (limit to recent 2 days for zen tranquility)
  const todayKey = toDateKey(now);
  const yesterdayKey = toDateKey(now - 86400000);

  const todayEvents = childEvents.filter(e => toDateKey(e.beginDt) === todayKey);
  const yesterdayEvents = childEvents.filter(e => toDateKey(e.beginDt) === yesterdayKey);

  const getEventSummary = (ev) => {
    const det = ev.details || {};
    switch (ev.type) {
      case 'BREAST': {
        const side = (det.side || '').toUpperCase();
        const sideText = side.includes('LEFT') ? (isDutch ? 'Links' : 'Left') : side.includes('RIGHT') ? (isDutch ? 'Rechts' : 'Right') : (isDutch ? 'Beide kanten' : 'Both sides');
        const dur = ev.durationMs ? ` · ${formatDurationMs(ev.durationMs, language)}` : '';
        return {
          title: isDutch ? 'Borstvoeding' : 'Nursing',
          detail: `${sideText}${dur}`,
          icon: Heart,
          colorClass: 'breast',
        };
      }
      case 'BOTTLE': {
        const vol = det.volumeFloz ? ` · ${formatVolume(det.volumeFloz, preferences.volumeUnit)}` : '';
        const milk = det.milkType === 'FORMULA' ? (isDutch ? 'Kunstvoeding' : 'Formula') : (isDutch ? 'Moedermelk' : 'Breast milk');
        return {
          title: isDutch ? 'Flesje' : 'Bottle',
          detail: `${milk}${vol}`,
          icon: Milk,
          colorClass: 'bottle',
        };
      }
      case 'SLEEP': {
        const dur = ev.durationMs ? formatDurationMs(ev.durationMs, language) : (isDutch ? 'Slaapje' : 'Nap');
        return {
          title: isDutch ? 'Slaap' : 'Sleep',
          detail: dur,
          icon: Moon,
          colorClass: 'sleep',
        };
      }
      case 'DIAPER': {
        const dt = (det.diaperType || '').toUpperCase();
        let desc = isDutch ? 'Nat' : 'Wet';
        if (dt === 'DIRTY') desc = isDutch ? 'Kaka' : 'Dirty';
        else if (dt === 'BOTH') desc = isDutch ? 'Nat & kaka' : 'Wet & dirty';
        else if (dt === 'CLEAN') desc = isDutch ? 'Schoon' : 'Clean';
        return {
          title: isDutch ? 'Pamper' : 'Diaper',
          detail: desc,
          icon: Sparkles,
          colorClass: 'diaper',
        };
      }
      case 'PUMP': {
        const vol = det.volumeFloz ? ` · ${formatVolume(det.volumeFloz, preferences.volumeUnit)}` : '';
        return {
          title: isDutch ? 'Afkolven' : 'Pump',
          detail: `${formatDurationMs(ev.durationMs, language)}${vol}`,
          icon: PumpIcon,
          colorClass: 'pump',
        };
      }
      case 'SOLIDS': {
        return {
          title: isDutch ? 'Vaste voeding' : 'Solids',
          detail: det.foodItems || (isDutch ? 'Hapjes' : 'Puree'),
          icon: Apple,
          colorClass: 'solids',
        };
      }
      case 'GROWTH': {
        const parts = [];
        if (det.weightKg) parts.push(`${det.weightKg} kg`);
        if (det.heightCm) parts.push(`${det.heightCm} cm`);
        return {
          title: isDutch ? 'Groei' : 'Growth',
          detail: parts.join(' · ') || (isDutch ? 'Meting' : 'Measurement'),
          icon: Ruler,
          colorClass: 'growth',
        };
      }
      case 'HEALTH': {
        const temp = det.temperatureC ? `${det.temperatureC}°C` : '';
        return {
          title: isDutch ? 'Gezondheid' : 'Health',
          detail: temp || det.medicationName || (isDutch ? 'Zorg' : 'Care'),
          icon: Stethoscope,
          colorClass: 'health',
        };
      }
      case 'DAYCARE': {
        return {
          title: isDutch ? 'Opvang' : 'Daycare',
          detail: det.daycareName || (isDutch ? 'Verblijf' : 'Stay'),
          icon: School,
          colorClass: 'daycare',
        };
      }
      case 'ROUTINE': {
        const rName = formatRoutineName(det.routineName, language, true);
        const dur = ev.durationMs ? ` (${formatDurationMs(ev.durationMs, language)})` : '';
        return {
          title: rName || (isDutch ? 'Routine' : 'Routine'),
          detail: ev.note ? `${ev.note}${dur}` : (dur ? dur.trim() : (isDutch ? 'Activiteit' : 'Activity')),
          icon: Clock,
          colorClass: 'routine',
        };
      }
      case 'NOTE': {
        return {
          title: isDutch ? 'Notitie' : 'Note',
          detail: ev.note || (isDutch ? 'Dagboek' : 'Journal'),
          icon: BookOpen,
          colorClass: 'default',
        };
      }
      case 'MILESTONE': {
        return {
          title: isDutch ? 'Mijlpaal' : 'Milestone',
          detail: det.milestoneTitle || ev.note || (isDutch ? 'Eerste keer' : 'First'),
          icon: Award,
          colorClass: 'growth',
        };
      }
      default: {
        return {
          title: ev.type,
          detail: ev.note || '',
          icon: Clock,
          colorClass: 'default',
        };
      }
    }
  };

  return (
    <div className="zen-minimal-container animate-fade-in" id="zen-minimal-container">
      {/* 1. Subtle, Quiet Reminder Pill (Only when reminders are overdue) */}
      {dueReminders && dueReminders.length > 0 && (
        <div
          className="zen-banner-pill"
          onClick={() => {
            triggerHaptic('light', preferences?.haptics);
            openModal('REMINDERS');
          }}
          role="button"
          tabIndex={0}
        >
          <div className="zen-banner-left">
            <BellRing size={13} className="zen-bell-leaf" />
            <span>
              <strong>{dueReminders.length} {isDutch ? 'herinnering te laat' : 'reminder due'}:</strong>{' '}
              {dueReminders.map(r => r.title || r.activityType).slice(0, 2).join(', ')}
            </span>
          </div>
          <span className="zen-banner-link">{isDutch ? 'Bekijken' : 'Review'}</span>
        </div>
      )}

      {/* 2. Active Timers Minimalist Bar (When any live timer is running) */}
      {(isNursing || isSleeping || isPumping) && (
        <div className="zen-active-timer-bar">
          <div className="zen-timer-info">
            <span className="zen-timer-pulse" />
            <span className="zen-timer-label">
              {isSleeping && (isDutch ? 'Slaaptimer actief' : 'Sleep timer active')}
              {isNursing && (isDutch ? `Borsttimer (${activeTimers.breast?.side === 'LEFT' ? 'Links' : 'Rechts'})` : `Nursing (${activeTimers.breast?.side})`)}
              {isPumping && (isDutch ? 'Kolftimer actief' : 'Pump timer active')}
            </span>
          </div>
          <div className="zen-timer-actions">
            {isNursing && (
              <button
                type="button"
                className="zen-timer-action-btn"
                onClick={() => {
                  triggerHaptic('light', preferences?.haptics);
                  switchBreastSide();
                }}
              >
                <RotateCcw size={12} />
                <span>{isDutch ? 'Wissel' : 'Switch'}</span>
              </button>
            )}
            <button
              type="button"
              className="zen-timer-action-btn finish"
              onClick={() => {
                triggerHaptic('success', preferences?.haptics);
                if (isNursing) stopBreastTimer();
                else if (isSleeping) stopSleepTimer();
                else if (isPumping) stopPumpTimer();
              }}
            >
              <Check size={12} />
              <span>{isDutch ? 'Klaar' : 'Done'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. The Zen Hero: Clean, Spacious State & Rhythm */}
      <section className={`zen-hero-card ${isSleeping ? 'is-asleep' : `is-awake awake-${wakeStatus?.status || 'green'}`}`}>
        <div className="zen-hero-header">
          <div className="zen-hero-state-row">
            <div className={`zen-aura-orb ${isSleeping ? 'sleeping' : 'awake'}`}>
              {isSleeping ? <Moon size={18} /> : <Sun size={18} />}
            </div>
            <div>
              <h1 className="zen-hero-title">
                {isSleeping
                  ? (isDutch ? `${babyName} slaapt rustig` : `${babyName} is resting`)
                  : (isDutch ? `${babyName} is wakker` : `${babyName} is awake`)}
              </h1>
              <div className="zen-hero-subtitle">
                {isSleeping
                  ? (isDutch ? 'Lekker aan het rusten' : 'Sleeping peacefully')
                  : (wakeStatus?.label && !wakeStatus.label.toLowerCase().includes('wakker')
                      ? `${getAwakeText()} · ${wakeStatus.label}`
                      : getAwakeText())}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="zen-customize-hint-btn"
            onClick={() => {
              triggerHaptic('light', preferences?.haptics);
              openModal('CUSTOMIZE_QUICK', { tab: 'status' });
            }}
            title={isDutch ? 'Statuskaarten aanpassen' : 'Customize status cards'}
            aria-label={isDutch ? 'Statuskaarten aanpassen' : 'Customize status cards'}
          >
            <SlidersHorizontal size={14} />
          </button>
        </div>


        {/* Dynamic At-a-Glance Status Metrics */}
        {activeStatusCards && activeStatusCards.length > 0 && (
          <div
            className="zen-hero-trio"
            style={{
              gridTemplateColumns: `repeat(${Math.min(activeStatusCards.length, 3)}, 1fr)`,
            }}
          >
            {activeStatusCards.map((card, idx) => {
              const CardIcon = card.icon;
              return (
                <button
                  key={`${card.id}-${idx}`}
                  type="button"
                  className="zen-trio-card"
                  onClick={() => {
                    triggerHaptic('light', preferences?.haptics);
                    openModal(card.modal);
                  }}
                >
                  <div className="zen-trio-icon-row">
                    <CardIcon size={14} className={`zen-icon-${card.colorClass}`} />
                    <span className="zen-trio-label">{card.title}</span>
                  </div>
                  <div className="zen-trio-time">{card.time}</div>
                  <div className="zen-trio-sub">{card.detail}</div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. Minimalist One-Touch Quick Log Bar */}
      <section className="zen-quicklog-section">
        <div className="zen-section-title">
          <span>{isDutch ? 'Snel registreren' : 'Quick Log'}</span>
          <button
            type="button"
            className="zen-customize-hint-btn"
            onClick={() => {
              triggerHaptic('light', preferences?.haptics);
              openModal('CUSTOMIZE_QUICK', { tab: 'actions' });
            }}
            title={isDutch ? 'Knoppen aanpassen' : 'Customize buttons'}
          >
            <SlidersHorizontal size={12} />
            <span>{isDutch ? 'Aanpassen' : 'Customize'}</span>
          </button>
        </div>

        <div className="zen-quicklog-bar">
          {primaryActions.map((act) => {
            const ActionIcon = act.icon;
            return (
              <button
                key={act.id}
                type="button"
                className="zen-log-pill"
                onClick={() => {
                  triggerHaptic('light', preferences?.haptics);
                  openModal(act.modal);
                }}
              >
                <ActionIcon size={15} className={`zen-pill-icon ${act.colorClass}`} />
                <span>{act.label}</span>
              </button>
            );
          })}

          <button
            type="button"
            className="zen-log-pill more"
            onClick={() => {
              triggerHaptic('light', preferences?.haptics);
              setShowMoreActions(true);
            }}
          >
            <Plus size={15} />
            <span>{isDutch ? 'Meer' : 'More'}</span>
          </button>
        </div>
      </section>

      {/* 5. The Zen Journal: Clean, Distraction-Free Daily Log */}
      <section className="zen-journal-section">
        <div className="zen-section-title">
          <span>{isDutch ? 'Vandaag' : 'Today'}</span>
          <span className="zen-count-tag">{todayEvents.length}</span>
        </div>

        {todayEvents.length === 0 ? (
          <div className="zen-journal-empty">
            <Flower2 size={24} className="zen-empty-icon" />
            <p>{isDutch ? 'Nog geen activiteiten vandaag geregistreerd.' : 'No activities logged today yet.'}</p>
            <span>{isDutch ? 'Tik hierboven om een voeding, slaapje of pamper te loggen.' : 'Tap an action above to start tracking.'}</span>
          </div>
        ) : (
          <div className="zen-journal-list">
            {todayEvents.map((ev) => {
              const summary = getEventSummary(ev);
              const Icon = summary.icon;
              return (
                <div
                  key={ev.id}
                  className="zen-journal-item"
                  onClick={() => openModal(ev.type, ev)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="zen-item-left">
                    <span className="zen-item-timestamp">{formatTime(ev.beginDt, language)}</span>
                    <div className={`zen-item-icon-circle ${summary.colorClass}`}>
                      <Icon size={14} />
                    </div>
                    <div className="zen-item-text">
                      <span className="zen-item-heading">{summary.title}</span>
                      <span className="zen-item-desc">{summary.detail}</span>
                    </div>
                  </div>

                  {ev.details?.caregiver && (
                    <span className="zen-item-caregiver">{ev.details.caregiver}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Yesterday's Journal (Quiet secondary list) */}
        {yesterdayEvents.length > 0 && (
          <>
            <div className="zen-section-title" style={{ marginTop: '1.5rem' }}>
              <span>{isDutch ? 'Gisteren' : 'Yesterday'}</span>
              <span className="zen-count-tag">{yesterdayEvents.length}</span>
            </div>

            <div className="zen-journal-list">
              {yesterdayEvents.slice(0, 5).map((ev) => {
                const summary = getEventSummary(ev);
                const Icon = summary.icon;
                return (
                  <div
                    key={ev.id}
                    className="zen-journal-item"
                    onClick={() => openModal(ev.type, ev)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="zen-item-left">
                      <span className="zen-item-timestamp">{formatTime(ev.beginDt, language)}</span>
                      <div className={`zen-item-icon-circle ${summary.colorClass}`}>
                        <Icon size={14} />
                      </div>
                      <div className="zen-item-text">
                        <span className="zen-item-heading">{summary.title}</span>
                        <span className="zen-item-desc">{summary.detail}</span>
                      </div>
                    </div>

                    {ev.details?.caregiver && (
                      <span className="zen-item-caregiver">{ev.details.caregiver}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* Clean Bottom Sheet for More Actions */}
      {showMoreActions && (
        <div
          className="modal-overlay animate-fade-in"
          onClick={() => setShowMoreActions(false)}
        >
          <div className="zen-more-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="zen-more-header">
              <span className="zen-more-title">{isDutch ? 'Andere activiteiten' : 'Other Activities'}</span>
              <button
                type="button"
                className="zen-more-close"
                onClick={() => setShowMoreActions(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="zen-more-grid">
              {(moreActions && moreActions.length > 0 ? moreActions : ALL_ZEN_ACTIONS).map((item) => {
                const ItemIcon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="zen-more-item"
                    onClick={() => {
                      setShowMoreActions(false);
                      openModal(item.modal || item.id);
                    }}
                  >
                    <div className={`zen-more-icon-box ${item.colorClass || ''}`}>
                      <ItemIcon size={18} />
                    </div>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className="zen-customize-sheet-link"
              onClick={() => {
                setShowMoreActions(false);
                openModal('CUSTOMIZE_QUICK', { tab: 'actions' });
              }}
            >
              <SlidersHorizontal size={14} />
              <span>{isDutch ? 'Snelle acties & statussen personaliseren' : 'Customize quick actions & status cards'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
