import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  formatRelative,
  formatDurationMs,
  formatVolume,
  formatWeight,
  formatLength,
  formatTemp,
  formatRoutineName,
  getWakeWindowStatus,
} from '../utils/formatters';
import { triggerHaptic } from '../utils/haptics';
import {
  Utensils,
  Moon,
  Sun,
  Clock,
  Heart,
  Milk,
  Apple,
  Sparkles,
  Ruler,
  Stethoscope,
  BookOpen,
  Award,
  SlidersHorizontal,
} from 'lucide-react';
import { PumpIcon } from './icons/PumpIcon';

export function QuickStatusBanner() {
  const {
    events,
    activeChild,
    activeChildId,
    activeTimers,
    preferences,
    openModal,
    language,
    t,
  } = useApp();

  const [now, setNow] = useState(Date.now());
  const isDutch = language === 'nl';
  const isMetric = preferences.weightUnit === 'kg';

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  const childEvents = events.filter((e) => !e.childKey || e.childKey === activeChildId);

  // Active state calculations for sleep & pump
  const isSleeping = Boolean(activeTimers?.sleep?.running);
  const isPumping = Boolean(activeTimers?.pump?.running);
  const isNursing = Boolean(activeTimers?.breast?.running);

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

  const wakeStatus = isSleeping || awakeMs === -1
    ? { label: isDutch ? 'Slaapt nu' : 'Sleeping', status: 'neutral' }
    : getWakeWindowStatus(awakeMs, language);

  const getAwakeDurationText = () => {
    if (awakeMs <= 0) return isDutch ? 'Net wakker' : 'Just woke up';
    const mins = Math.floor(awakeMs / 60000);
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    const hUnit = isDutch ? 'u' : 'h';
    if (hrs === 0) return isDutch ? `${remMins} min wakker` : `${remMins}m awake`;
    return isDutch ? `${hrs}${hUnit} ${remMins}m wakker` : `${hrs}h ${remMins}m awake`;
  };

  const babyName = activeChild?.name || (isDutch ? 'Baby' : 'Baby');

  // Configured quick status cards from user preferences
  const activeCards = preferences?.quickStatusCards && preferences.quickStatusCards.length > 0
    ? preferences.quickStatusCards
    : ['FEEDS', 'SLEEP', 'PUMP'];

  // Card Metadata Builder
  const getCardInfo = (cardId) => {
    switch (cardId) {
      case 'FEEDS': {
        const ev = childEvents.find((e) => ['BREAST', 'BOTTLE', 'SOLIDS', 'COMBO'].includes(e.type));
        if (isNursing) {
          const side = activeTimers.breast.side === 'RIGHT' ? (isDutch ? 'Rechts' : 'Right') : (isDutch ? 'Links' : 'Left');
          return {
            id: 'FEEDS',
            label: isDutch ? 'Laatste voeding' : 'Last Fed',
            timeText: isDutch ? 'Nu bezig' : 'In progress',
            detail: isDutch ? `Borst (${side})` : `Nursing (${side})`,
            icon: Heart,
            badge: isDutch ? 'Actief' : 'Active',
            color: 'var(--color-breast)',
            bg: 'var(--color-breast-light)',
            actionModal: 'BREAST',
          };
        }
        if (!ev) {
          return {
            id: 'FEEDS',
            label: isDutch ? 'Laatste voeding' : 'Last Fed',
            timeText: '—',
            detail: isDutch ? 'Nog geen voeding' : 'No feeds yet',
            icon: Utensils,
            badge: null,
            color: 'var(--color-breast)',
            bg: 'var(--color-breast-light)',
            actionModal: 'BREAST',
          };
        }
        const det = ev.details || {};
        if (ev.type === 'BREAST') {
          const dur = formatDurationMs((det.leftDurationMs || 0) + (det.rightDurationMs || 0) || ev.durationMs, language);
          const side = (det.side || (det.rightDurationMs > 0 && det.leftDurationMs > 0 ? 'BOTH' : det.rightDurationMs > 0 ? 'RIGHT' : 'LEFT')).toUpperCase();
          let sideBadge = isDutch ? 'Borst' : 'Breast';
          if (side === 'LEFT') sideBadge = isDutch ? 'Links' : 'Left';
          else if (side === 'RIGHT') sideBadge = isDutch ? 'Rechts' : 'Right';
          else if (side === 'BOTH') sideBadge = isDutch ? 'Beide' : 'Both';
          return {
            id: 'FEEDS',
            label: isDutch ? 'Laatste voeding' : 'Last Fed',
            timeText: formatRelative(ev.beginDt, now, language),
            detail: dur ? `${isDutch ? 'Borst' : 'Nursing'} · ${dur}` : (isDutch ? 'Borstvoeding' : 'Nursing'),
            icon: Heart,
            badge: sideBadge,
            color: 'var(--color-breast)',
            bg: 'var(--color-breast-light)',
            actionModal: 'BREAST',
          };
        }
        if (ev.type === 'BOTTLE') {
          const vol = formatVolume(det.volumeFloz, preferences.volumeUnit);
          return {
            id: 'FEEDS',
            label: isDutch ? 'Laatste voeding' : 'Last Fed',
            timeText: formatRelative(ev.beginDt, now, language),
            detail: vol ? `${isDutch ? 'Fles' : 'Bottle'} · ${vol}` : (isDutch ? 'Flesje' : 'Bottle'),
            icon: Milk,
            badge: isDutch ? 'Fles' : 'Bottle',
            color: 'var(--color-bottle)',
            bg: 'var(--color-bottle-light)',
            actionModal: 'BOTTLE',
          };
        }
        if (ev.type === 'SOLIDS') {
          return {
            id: 'FEEDS',
            label: isDutch ? 'Laatste voeding' : 'Last Fed',
            timeText: formatRelative(ev.beginDt, now, language),
            detail: det.food ? (isDutch ? `Hapjes · ${det.food}` : `Solids · ${det.food}`) : (isDutch ? 'Vaste voeding' : 'Solid meal'),
            icon: Apple,
            badge: isDutch ? 'Hapjes' : 'Solids',
            color: 'var(--color-solids)',
            bg: 'var(--color-solids-light)',
            actionModal: 'SOLIDS',
          };
        }
        return {
          id: 'FEEDS',
          label: isDutch ? 'Laatste voeding' : 'Last Fed',
          timeText: formatRelative(ev.beginDt, now, language),
          detail: isDutch ? 'Voeding' : 'Feed',
          icon: Utensils,
          badge: isDutch ? 'Voeding' : 'Feed',
          color: 'var(--color-breast)',
          bg: 'var(--color-breast-light)',
          actionModal: 'BREAST',
        };
      }

      case 'BREAST': {
        const ev = childEvents.find((e) => e.type === 'BREAST');
        if (isNursing) {
          const side = activeTimers.breast.side === 'RIGHT' ? (isDutch ? 'Rechts' : 'Right') : (isDutch ? 'Links' : 'Left');
          return {
            id: 'BREAST',
            label: isDutch ? 'Borstvoeding' : 'Nursing',
            timeText: isDutch ? 'Nu bezig' : 'In progress',
            detail: `${isDutch ? 'Aan de borst' : 'Nursing'} (${side})`,
            icon: Heart,
            badge: isDutch ? 'Actief' : 'Active',
            color: 'var(--color-breast)',
            bg: 'var(--color-breast-light)',
            actionModal: 'BREAST',
          };
        }
        if (!ev) {
          return {
            id: 'BREAST',
            label: isDutch ? 'Borstvoeding' : 'Nursing',
            timeText: '—',
            detail: isDutch ? 'Nog niet gevoed' : 'No nurse yet',
            icon: Heart,
            badge: null,
            color: 'var(--color-breast)',
            bg: 'var(--color-breast-light)',
            actionModal: 'BREAST',
          };
        }
        const det = ev.details || {};
        const dur = formatDurationMs((det.leftDurationMs || 0) + (det.rightDurationMs || 0) || ev.durationMs, language);
        const side = (det.side || (det.rightDurationMs > 0 && det.leftDurationMs > 0 ? 'BOTH' : det.rightDurationMs > 0 ? 'RIGHT' : 'LEFT')).toUpperCase();
        let sideBadge = null;
        if (side === 'LEFT') sideBadge = isDutch ? 'Links' : 'Left';
        else if (side === 'RIGHT') sideBadge = isDutch ? 'Rechts' : 'Right';
        else if (side === 'BOTH') sideBadge = isDutch ? 'Beide' : 'Both';
        return {
          id: 'BREAST',
          label: isDutch ? 'Borstvoeding' : 'Nursing',
          timeText: formatRelative(ev.beginDt, now, language),
          detail: dur ? `${sideBadge ? `${sideBadge} · ` : ''}${dur}` : (isDutch ? 'Borstvoeding' : 'Nursing'),
          icon: Heart,
          badge: sideBadge,
          color: 'var(--color-breast)',
          bg: 'var(--color-breast-light)',
          actionModal: 'BREAST',
        };
      }

      case 'BOTTLE': {
        const ev = childEvents.find((e) => e.type === 'BOTTLE');
        if (!ev) {
          return {
            id: 'BOTTLE',
            label: isDutch ? 'Flesvoeding' : 'Bottle Feed',
            timeText: '—',
            detail: isDutch ? 'Nog geen flesje' : 'No bottle yet',
            icon: Milk,
            badge: null,
            color: 'var(--color-bottle)',
            bg: 'var(--color-bottle-light)',
            actionModal: 'BOTTLE',
          };
        }
        const det = ev.details || {};
        const vol = formatVolume(det.volumeFloz, preferences.volumeUnit);
        let milkTypeBadge = det.milkType === 'FORMULA' ? (isDutch ? 'Kunstvoeding' : 'Formula') : (isDutch ? 'Moedermelk' : 'Breast Milk');
        return {
          id: 'BOTTLE',
          label: isDutch ? 'Flesvoeding' : 'Bottle Feed',
          timeText: formatRelative(ev.beginDt, now, language),
          detail: vol ? `${vol}${det.formulaName ? ` (${det.formulaName})` : ''}` : milkTypeBadge,
          icon: Milk,
          badge: milkTypeBadge,
          color: 'var(--color-bottle)',
          bg: 'var(--color-bottle-light)',
          actionModal: 'BOTTLE',
        };
      }

      case 'SLEEP': {
        const ev = latestSleep;
        if (isSleeping) {
          return {
            id: 'SLEEP',
            label: isDutch ? 'Laatste slaap' : 'Last Sleep',
            timeText: activeTimers?.sleep?.startMs ? formatRelative(activeTimers.sleep.startMs, now, language) : (isDutch ? 'Slaapt nu' : 'Sleeping now'),
            detail: isDutch ? 'Slaapt momenteel' : 'Currently sleeping',
            icon: Moon,
            badge: isDutch ? 'Slaapt' : 'Sleeping',
            color: 'var(--color-sleep)',
            bg: 'var(--color-sleep-light)',
            actionModal: 'SLEEP',
          };
        }
        if (!ev) {
          return {
            id: 'SLEEP',
            label: isDutch ? 'Laatste slaap' : 'Last Sleep',
            timeText: '—',
            detail: isDutch ? 'Nog geen slaap' : 'No sleep yet',
            icon: Moon,
            badge: null,
            color: 'var(--color-sleep)',
            bg: 'var(--color-sleep-light)',
            actionModal: 'SLEEP',
          };
        }
        const det = ev.details || {};
        const type = det.sleepType === 'NIGHT' ? (isDutch ? 'Nacht' : 'Night') : (isDutch ? 'Dutje' : 'Nap');
        const dur = formatDurationMs(ev.durationMs || (ev.endDt ? ev.endDt - ev.beginDt : 0), language);
        return {
          id: 'SLEEP',
          label: isDutch ? 'Laatste slaap' : 'Last Sleep',
          timeText: formatRelative(ev.endDt || ev.beginDt, now, language),
          detail: dur ? `${type} · ${dur}` : type,
          icon: Moon,
          badge: type,
          color: 'var(--color-sleep)',
          bg: 'var(--color-sleep-light)',
          actionModal: 'SLEEP',
        };
      }

      case 'DIAPER': {
        const ev = childEvents.find((e) => e.type === 'DIAPER');
        if (!ev) {
          return {
            id: 'DIAPER',
            label: isDutch ? 'Laatste pamper' : 'Last Diaper',
            timeText: '—',
            detail: isDutch ? 'Nog geen pamper' : 'No diaper yet',
            icon: Sparkles,
            badge: null,
            color: 'var(--color-diaper)',
            bg: 'var(--color-diaper-light)',
            actionModal: 'DIAPER',
          };
        }
        const det = ev.details || {};
        const parts = [];
        if (det.pee) parts.push(isDutch ? 'Nat' : 'Wet');
        if (det.poop) parts.push(isDutch ? 'Kaka' : 'Dirty');
        if (det.dry) parts.push(isDutch ? 'Droog' : 'Dry');
        return {
          id: 'DIAPER',
          label: isDutch ? 'Laatste pamper' : 'Last Diaper',
          timeText: formatRelative(ev.beginDt, now, language),
          detail: parts.join(' & ') || (isDutch ? 'Pamper ververst' : 'Diaper Change'),
          icon: Sparkles,
          badge: det.blowout ? (isDutch ? 'Doorgelekt' : 'Blowout') : (det.poop ? (isDutch ? 'Kaka' : 'Dirty') : (isDutch ? 'Nat' : 'Wet')),
          color: 'var(--color-diaper)',
          bg: 'var(--color-diaper-light)',
          actionModal: 'DIAPER',
        };
      }

      case 'PUMP': {
        const ev = childEvents.find((e) => e.type === 'PUMP');
        if (isPumping) {
          const pSide = activeTimers?.pump?.side || 'BOTH';
          let sideBadge = isDutch ? 'Beide' : 'Both';
          if (pSide === 'LEFT') sideBadge = isDutch ? 'Links' : 'Left';
          else if (pSide === 'RIGHT') sideBadge = isDutch ? 'Rechts' : 'Right';
          return {
            id: 'PUMP',
            label: isDutch ? 'Laatste kolf' : 'Last Pumped',
            timeText: isDutch ? 'Nu bezig' : 'In progress',
            detail: isDutch ? `Kolven bezig (${sideBadge})` : `Pumping now (${sideBadge})`,
            icon: PumpIcon,
            badge: isDutch ? 'Actief' : 'Active',
            color: 'var(--color-pump)',
            bg: 'var(--color-pump-light)',
            actionModal: 'PUMP',
          };
        }
        if (!ev) {
          return {
            id: 'PUMP',
            label: isDutch ? 'Laatste kolf' : 'Last Pumped',
            timeText: '—',
            detail: isDutch ? 'Nog niet gekolfd' : 'No pump yet',
            icon: PumpIcon,
            badge: null,
            color: 'var(--color-pump)',
            bg: 'var(--color-pump-light)',
            actionModal: 'PUMP',
          };
        }
        const det = ev.details || {};
        let sideBadge = null;
        if (det.side === 'LEFT') sideBadge = isDutch ? 'Links' : 'Left';
        else if (det.side === 'RIGHT') sideBadge = isDutch ? 'Rechts' : 'Right';
        else if (det.side === 'BOTH') sideBadge = isDutch ? 'Beide' : 'Both';
        const parts = [];
        const vol = det.totalFloz
          ? formatVolume(det.totalFloz, preferences.volumeUnit)
          : (det.totalAmount ? `${det.totalAmount} ${det.volumeUnit || preferences.volumeUnit}` : '');
        if (vol) parts.push(vol);
        if (ev.durationMs > 0) parts.push(formatDurationMs(ev.durationMs, language));
        return {
          id: 'PUMP',
          label: isDutch ? 'Laatste kolf' : 'Last Pumped',
          timeText: formatRelative(ev.endDt || ev.beginDt, now, language),
          detail: parts.length > 0 ? parts.join(' · ') : (isDutch ? 'Kolfsessie' : 'Pump session'),
          icon: PumpIcon,
          badge: sideBadge,
          color: 'var(--color-pump)',
          bg: 'var(--color-pump-light)',
          actionModal: 'PUMP',
        };
      }

      case 'SOLIDS': {
        const ev = childEvents.find((e) => e.type === 'SOLIDS');
        if (!ev) {
          return {
            id: 'SOLIDS',
            label: isDutch ? 'Vaste voeding' : 'Solids',
            timeText: '—',
            detail: isDutch ? 'Nog geen hapje' : 'No solids yet',
            icon: Apple,
            badge: null,
            color: 'var(--color-solids)',
            bg: 'var(--color-solids-light)',
            actionModal: 'SOLIDS',
          };
        }
        const det = ev.details || {};
        return {
          id: 'SOLIDS',
          label: isDutch ? 'Vaste voeding' : 'Solids',
          timeText: formatRelative(ev.beginDt, now, language),
          detail: det.food || (isDutch ? 'Hapje' : 'Solid meal'),
          icon: Apple,
          badge: det.reaction ? det.reaction : (isDutch ? 'Hapje' : 'Solid'),
          color: 'var(--color-solids)',
          bg: 'var(--color-solids-light)',
          actionModal: 'SOLIDS',
        };
      }

      case 'GROWTH': {
        const ev = childEvents.find((e) => e.type === 'GROWTH');
        if (!ev) {
          return {
            id: 'GROWTH',
            label: isDutch ? 'Laatste meting' : 'Last Growth',
            timeText: '—',
            detail: isDutch ? 'Nog geen meting' : 'No growth data',
            icon: Ruler,
            badge: null,
            color: 'var(--color-growth)',
            bg: 'var(--color-growth-light)',
            actionModal: 'GROWTH',
          };
        }
        const det = ev.details || {};
        const parts = [];
        if (det.weightKg && isMetric) parts.push(`${det.weightKg} kg`);
        else if (det.weightLb) parts.push(formatWeight(det.weightLb, preferences.weightUnit));
        if (det.heightCm && preferences.lengthUnit === 'cm') parts.push(`${det.heightCm} cm`);
        else if (det.heightIn) parts.push(formatLength(det.heightIn, preferences.lengthUnit));
        if (det.headCm && preferences.lengthUnit === 'cm') parts.push(`${isDutch ? 'Hoofd' : 'Head'}: ${det.headCm} cm`);
        else if (det.headIn) parts.push(`${isDutch ? 'Hoofd' : 'Head'}: ${formatLength(det.headIn, preferences.lengthUnit)}`);
        const str = parts.join(' • ');
        return {
          id: 'GROWTH',
          label: isDutch ? 'Laatste meting' : 'Last Growth',
          timeText: formatRelative(ev.beginDt, now, language),
          detail: str || (isDutch ? 'Groei geregistreerd' : 'Growth recorded'),
          icon: Ruler,
          badge: isDutch ? 'Groei' : 'Growth',
          color: 'var(--color-growth)',
          bg: 'var(--color-growth-light)',
          actionModal: 'GROWTH',
        };
      }

      case 'HEALTH': {
        const ev = childEvents.find((e) => e.type === 'HEALTH');
        if (!ev) {
          return {
            id: 'HEALTH',
            label: isDutch ? 'Gezondheid' : 'Health',
            timeText: '—',
            detail: isDutch ? 'Geen registratie' : 'No records',
            icon: Stethoscope,
            badge: null,
            color: 'var(--color-health)',
            bg: 'var(--color-health-light)',
            actionModal: 'HEALTH',
          };
        }
        const det = ev.details || {};
        const title = det.medicineName || (det.temperatureC ? `${det.temperatureC}°C` : (det.doctorName || (isDutch ? 'Controle' : 'Checkup')));
        return {
          id: 'HEALTH',
          label: isDutch ? 'Gezondheid' : 'Health',
          timeText: formatRelative(ev.beginDt, now, language),
          detail: title,
          icon: Stethoscope,
          badge: det.medicineName ? (isDutch ? 'Medicatie' : 'Med') : (isDutch ? 'Medisch' : 'Health'),
          color: 'var(--color-health)',
          bg: 'var(--color-health-light)',
          actionModal: 'HEALTH',
        };
      }

      case 'ROUTINE': {
        const ev = childEvents.find((e) => e.type === 'ROUTINE');
        if (!ev) {
          return {
            id: 'ROUTINE',
            label: isDutch ? 'Routine' : 'Routine',
            timeText: '—',
            detail: isDutch ? 'Nog geen routine' : 'No routines',
            icon: Clock,
            badge: null,
            color: 'var(--color-routine)',
            bg: 'var(--color-routine-light)',
            actionModal: 'ROUTINE',
          };
        }
        const det = ev.details || {};
        const rName = formatRoutineName(det.routineName, language, true);
        return {
          id: 'ROUTINE',
          label: isDutch ? 'Routine' : 'Routine',
          timeText: formatRelative(ev.beginDt, now, language),
          detail: rName,
          icon: Clock,
          badge: isDutch ? 'Routine' : 'Routine',
          color: 'var(--color-routine)',
          bg: 'var(--color-routine-light)',
          actionModal: 'ROUTINE',
        };
      }

      case 'NOTE': {
        const ev = childEvents.find((e) => e.type === 'NOTE');
        if (!ev) {
          return {
            id: 'NOTE',
            label: isDutch ? 'Notitie' : 'Note',
            timeText: '—',
            detail: isDutch ? 'Nog geen notitie' : 'No notes',
            icon: BookOpen,
            badge: null,
            color: 'var(--color-note)',
            bg: 'var(--color-note-light)',
            actionModal: 'NOTE',
          };
        }
        return {
          id: 'NOTE',
          label: isDutch ? 'Notitie' : 'Note',
          timeText: formatRelative(ev.beginDt, now, language),
          detail: ev.note || (isDutch ? 'Dagboek' : 'Journal'),
          icon: BookOpen,
          badge: null,
          color: 'var(--color-note)',
          bg: 'var(--color-note-light)',
          actionModal: 'NOTE',
        };
      }

      case 'MILESTONE': {
        const ev = childEvents.find((e) => e.type === 'MILESTONE');
        if (!ev) {
          return {
            id: 'MILESTONE',
            label: isDutch ? 'Mijlpaal' : 'Milestone',
            timeText: '—',
            detail: isDutch ? 'Nog geen mijlpaal' : 'No milestone',
            icon: Award,
            badge: null,
            color: 'var(--color-milestone)',
            bg: 'var(--color-milestone-light)',
            actionModal: 'MILESTONE',
          };
        }
        return {
          id: 'MILESTONE',
          label: isDutch ? 'Mijlpaal' : 'Milestone',
          timeText: formatRelative(ev.beginDt, now, language),
          detail: ev.details?.milestoneName || (isDutch ? 'Mijlpaal' : 'Milestone'),
          icon: Award,
          badge: ev.details?.isBabyFirst ? (isDutch ? 'Eerste keer' : 'Baby First') : null,
          color: 'var(--color-milestone)',
          bg: 'var(--color-milestone-light)',
          actionModal: 'MILESTONE',
        };
      }

      default:
        return null;
    }
  };

  const handleOpenCustomize = (e) => {
    e.stopPropagation();
    triggerHaptic('light', preferences?.haptics);
    openModal('CUSTOMIZE_QUICK', { tab: 'status' });
  };

  return (
    <div className="hero-glance-card">
      {/* 1. Serene State Indicator (Awake / Sleeping) */}
      <div className="hero-glance-header">
        <div className="hero-state-wrap">
          <div className={`hero-state-badge ${isSleeping ? 'sleeping' : 'awake'}`}>
            {isSleeping ? <Moon size={14} /> : <Sun size={14} />}
            <span>
              {isSleeping
                ? (isDutch ? `${babyName} slaapt` : `${babyName} is Sleeping`)
                : (isDutch ? `${babyName} is wakker` : `${babyName} is Awake`)}
            </span>
          </div>

          <span className="hero-wake-duration">
            {isSleeping ? (
              activeTimers?.sleep?.startMs ? (
                isDutch
                  ? `Begonnen ${formatRelative(activeTimers.sleep.startMs, now, language)}`
                  : `Started ${formatRelative(activeTimers.sleep.startMs, now, language)}`
              ) : (isDutch ? 'Timer actief' : 'Timer active')
            ) : (
              getAwakeDurationText()
            )}
          </span>
        </div>

        {/* Right side: Wake Cue + Customize Gear Button */}
        <div className="hero-header-right-actions">
          {!isSleeping && (
            <div className={`hero-cue-pill ${wakeStatus.status}`}>
              <span className="hero-cue-dot" />
              <span>{wakeStatus.label}</span>
            </div>
          )}

          <button
            type="button"
            className="hero-customize-btn"
            onClick={handleOpenCustomize}
            title={isDutch ? 'Snelle statuskaarten aanpassen' : 'Customize quick status cards'}
            aria-label={isDutch ? 'Snelle statuskaarten aanpassen' : 'Customize quick status cards'}
          >
            <SlidersHorizontal size={14} />
          </button>
        </div>
      </div>

      {/* 2. Dynamically Configured Activity Glance Grid */}
      <div className={`hero-glance-grid count-${activeCards.length}`}>
        {activeCards.map((cardId) => {
          const info = getCardInfo(cardId);
          if (!info) return null;
          const CardIcon = info.icon;
          return (
            <button
              key={cardId}
              type="button"
              className={`glance-pill ${cardId.toLowerCase()}`}
              onClick={() => openModal(info.actionModal)}
              id={`glance-${cardId.toLowerCase()}-btn`}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '0.2rem' }}>
                <div
                  className="glance-icon-wrap"
                  style={{ backgroundColor: info.bg, color: info.color, marginBottom: 0 }}
                >
                  <CardIcon size={15} />
                </div>
                {info.badge && (
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.45rem',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: info.bg,
                      color: info.color,
                      letterSpacing: '0.02em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {info.badge}
                  </span>
                )}
              </div>
              <div className="glance-content">
                <span className="glance-label">{info.label}</span>
                <span className="glance-time">{info.timeText}</span>
                <span className="glance-sub">{info.detail}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
