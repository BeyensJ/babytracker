import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatTime, formatDurationMs, formatVolume, formatWeight, formatLength, formatTemp, formatRoutineName } from '../utils/formatters';
import { syncService } from '../services/syncService';
import { triggerHaptic } from '../utils/haptics';
import { PhotoLightbox } from './PhotoLightbox';
import { SocialActionButtons } from './SocialActionButtons';
import {
  Heart,
  Milk,
  Moon,
  Sparkles,
  Apple,
  Ruler,
  Stethoscope,
  Clock,
  BookOpen,
  Award,
  User,
  Play,
  Camera,
  MessageCircle,
} from 'lucide-react';
import { PumpIcon } from './icons/PumpIcon';

export function TimelineItem({ event }) {
  const {
    events,
    activeTimers,
    preferences,
    openModal,
    resumeBreastTimerWithData,
    resumeSleepTimerWithData,
    resumePumpTimerWithData,
    toggleEventLike,
    activeCaregiver,
    language,
    t,
  } = useApp();
  const [showLightbox, setShowLightbox] = useState(false);
  const isDutch = language === 'nl';

  const det = event.details || {};
  const isMetric = preferences.weightUnit === 'kg';
  const likes = Array.isArray(event.likes) ? event.likes : [];
  const comments = Array.isArray(event.comments) ? event.comments : [];
  const activeCgId = activeCaregiver?.id || 'cg_mom';
  const isLikedByMe = likes.some(l => (typeof l === 'string' ? l === activeCgId : l.caregiverId === activeCgId));

  // Config by category
  const getConfig = () => {
    switch (event.type) {
      case 'BREAST': {
        const chips = [];
        const side = (det.side || '').toUpperCase();
        if (side === 'BOTH' || (det.leftDurationMs > 0 && det.rightDurationMs > 0)) {
          chips.push(
            isDutch
              ? `Beide kanten (L: ${formatDurationMs(det.leftDurationMs, language)}, R: ${formatDurationMs(det.rightDurationMs, language)})`
              : `Both Sides (L: ${formatDurationMs(det.leftDurationMs)}, R: ${formatDurationMs(det.rightDurationMs)})`
          );
        } else if (side.includes('LEFT') || det.leftDurationMs > 0) {
          const dur = det.leftDurationMs || event.durationMs;
          chips.push(dur ? `${isDutch ? 'Links' : 'Left'} · ${formatDurationMs(dur, language)}` : (isDutch ? 'Linkerkant' : 'Left Side'));
        } else if (side.includes('RIGHT') || det.rightDurationMs > 0) {
          const dur = det.rightDurationMs || event.durationMs;
          chips.push(dur ? `${isDutch ? 'Rechts' : 'Right'} · ${formatDurationMs(dur, language)}` : (isDutch ? 'Rechterkant' : 'Right Side'));
        } else {
          chips.push(formatDurationMs(event.durationMs, language) || (isDutch ? 'Borstvoeding' : 'Nursing'));
        }
        return {
          icon: Heart,
          badgeClass: 'breast',
          title: isDutch ? 'Borstvoeding' : 'Breastfeed',
          chips,
        };
      }
      case 'BOTTLE':
        return {
          icon: Milk,
          badgeClass: 'bottle',
          title: isDutch ? 'Flesje' : 'Bottle Feed',
          chips: [
            det.volumeFloz ? formatVolume(det.volumeFloz, preferences.volumeUnit) : '',
            det.milkType === 'FORMULA'
              ? (det.formulaName || (isDutch ? 'Kunstvoeding' : 'Formula'))
              : (isDutch ? 'Moedermelk' : 'Breast Milk'),
          ].filter(Boolean),
        };
      case 'COMBO':
        return {
          icon: Heart,
          badgeClass: 'breast',
          title: 'Combo Feed',
          chips: [
            det.volumeFloz ? formatVolume(det.volumeFloz, preferences.volumeUnit) : '',
            formatDurationMs(event.durationMs),
          ].filter(Boolean),
        };
      case 'SOLIDS':
        return {
          icon: Apple,
          badgeClass: 'solids',
          title: isDutch ? 'Vaste voeding' : 'Solid Food',
          chips: [det.food || (isDutch ? 'Hapje' : 'Meal'), det.reaction ? `${isDutch ? 'Reactie' : 'Reaction'}: ${det.reaction}` : ''].filter(Boolean),
        };
      case 'SLEEP': {
        const isOngoing = !event.durationMs && !event.endDt;
        return {
          icon: Moon,
          badgeClass: 'sleep',
          title: det.sleepType === 'NIGHT' ? (isDutch ? 'Nachtslaap' : 'Night Sleep') : (isDutch ? 'Dutje' : 'Nap'),
          chips: [isOngoing ? (isDutch ? 'Slaapt nu...' : 'Sleeping now...') : formatDurationMs(event.durationMs || (event.endDt - event.beginDt), language)],
        };
      }
      case 'DIAPER': {
        const parts = [];
        if (det.pee) parts.push(isDutch ? 'Nat' : 'Wet');
        if (det.poop) parts.push(isDutch ? 'Kaka' : 'Dirty');
        if (det.dry) parts.push(isDutch ? 'Droog' : 'Dry');

        const formatDesc = (str) => {
          if (!str) return '';
          return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('-');
        };

        const colorDesc = formatDesc(det.color);
        const textureDesc = formatDesc(det.texture);
        const colorTexture = [colorDesc, textureDesc].filter(Boolean).join(', ');

        return {
          icon: Sparkles,
          badgeClass: 'diaper',
          title: isDutch ? 'Pamper ververst' : 'Diaper Change',
          chips: [
            parts.length > 0 ? parts.join(' & ') : (isDutch ? 'Pamper' : 'Diaper'),
            colorTexture ? `(${colorTexture})` : '',
            det.blowout ? (isDutch ? '⚠️ Doorgelekt' : '⚠️ Blowout') : '',
            det.rash ? (isDutch ? 'Luieruitslag' : 'Rash') : '',
          ].filter(Boolean),
        };
      }
      case 'PUMP':
        return {
          icon: PumpIcon,
          badgeClass: 'pump',
          title: isDutch ? 'Afkolven' : 'Pumping',
          chips: [
            det.totalFloz
              ? formatVolume(det.totalFloz, preferences.volumeUnit)
              : '',
            (det.leftFloz || det.rightFloz) && det.totalFloz !== (det.leftFloz || 0)
              ? `L: ${formatVolume(det.leftFloz || 0, preferences.volumeUnit)} | R: ${formatVolume(det.rightFloz || 0, preferences.volumeUnit)}`
              : '',
            formatDurationMs(event.durationMs, language),
          ].filter(Boolean),
        };
      case 'GROWTH': {
        const chips = [];
        let title = isDutch ? 'Meting' : 'Growth Check';
        const hasWeight = det.weightKg || det.weightLb;
        const hasHeight = det.heightCm || det.heightIn;
        const hasHead = det.headCm || det.headIn;

        if (hasWeight && !hasHeight && !hasHead) title = isDutch ? 'Gewichtsmeting' : 'Weight Check';
        else if (hasHeight && !hasWeight && !hasHead) title = isDutch ? 'Lengtemeting' : 'Height Check';
        else if (hasHead && !hasWeight && !hasHeight) title = isDutch ? 'Hoofdomtrek' : 'Head Circumference';

        if (det.weightKg && isMetric) chips.push(`${det.weightKg} kg`);
        else if (det.weightLb) chips.push(formatWeight(det.weightLb, preferences.weightUnit));

        if (det.heightCm && preferences.lengthUnit === 'cm') chips.push(`${det.heightCm} cm`);
        else if (det.heightIn) chips.push(formatLength(det.heightIn, preferences.lengthUnit));

        if (det.headCm && preferences.lengthUnit === 'cm') chips.push(`${isDutch ? 'Hoofd' : 'Head'}: ${det.headCm} cm`);
        else if (det.headIn) chips.push(`${isDutch ? 'Hoofd' : 'Head'}: ${formatLength(det.headIn, preferences.lengthUnit)}`);

        return {
          icon: Ruler,
          badgeClass: 'growth',
          title,
          chips,
        };
      }
      case 'HEALTH': {
        const chips = [];
        let title = isDutch ? 'Gezondheid & Zorgen' : 'Health & Meds';
        if (det.medicineName) {
          title = isDutch ? 'Medicatie' : 'Medication';
          chips.push(det.medicineName);
          if (det.dosage) chips.push(det.dosage);
        } else if (det.temperatureC || det.temperatureF) {
          title = isDutch ? 'Temperatuurmeting' : 'Temperature Check';
          if (det.temperatureC && preferences.tempUnit === 'C') chips.push(`${det.temperatureC}°C`);
          else if (det.temperatureF) chips.push(formatTemp(det.temperatureF, preferences.tempUnit));
        } else if (det.doctorName) {
          title = isDutch ? 'Doktersbezoek' : 'Doctor Visit';
          chips.push(det.doctorName);
        } else if (det.vaccineName) {
          title = isDutch ? 'Vaccinatie' : 'Vaccine';
          chips.push(det.vaccineName);
        } else if (event.note) {
          title = isDutch ? 'Notitie gezondheid' : 'Health / Checkup Note';
        }

        return {
          icon: Stethoscope,
          badgeClass: 'health',
          title,
          chips,
        };
      }
      case 'ROUTINE':
        return {
          icon: Clock,
          badgeClass: 'routine',
          title: formatRoutineName(det.routineName, language, true),
          chips: [formatDurationMs(event.durationMs, language)],
        };
      case 'MILESTONE': {
        const isFirst = det.isBabyFirst;
        return {
          icon: Award,
          badgeClass: 'milestone',
          title: det.milestoneName || (isFirst ? (isDutch ? 'Eerste keer' : 'Baby First') : (isDutch ? 'Mijlpaal' : 'Milestone')),
          chips: [isFirst ? (isDutch ? '🌟 Eerste keer' : '🌟 Baby First') : (isDutch ? '🏆 Mijlpaal' : '🏆 Milestone')],
        };
      }
      case 'NOTE':
      default:
        return {
          icon: BookOpen,
          badgeClass: 'note',
          title: isDutch ? 'Notitie' : 'Journal Note',
          chips: [],
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  const handleResumeTimer = (e) => {
    if (e) e.stopPropagation();
    triggerHaptic('medium', preferences?.haptics);

    // If another timer is running of this type, ask for confirmation
    if (event.type === 'BREAST' && activeTimers?.breast?.running && activeTimers?.breast?.resumedEventId !== event.id) {
      if (!window.confirm(t('timeline.resumeConfirmNursing'))) {
        return;
      }
    } else if (event.type === 'SLEEP' && activeTimers?.sleep?.running && activeTimers?.sleep?.resumedEventId !== event.id) {
      if (!window.confirm(t('timeline.resumeConfirmSleep'))) {
        return;
      }
    } else if (event.type === 'PUMP' && activeTimers?.pump?.running && activeTimers?.pump?.resumedEventId !== event.id) {
      if (!window.confirm(t('timeline.resumeConfirmPump'))) {
        return;
      }
    }

    if (event.type === 'SLEEP') {
      resumeSleepTimerWithData(event);
    } else if (event.type === 'BREAST') {
      resumeBreastTimerWithData(event);
    } else if (event.type === 'PUMP') {
      resumePumpTimerWithData(event);
    }
  };

  const isCurrentlyRunning =
    (event.type === 'BREAST' && activeTimers?.breast?.resumedEventId === event.id) ||
    (event.type === 'SLEEP' && activeTimers?.sleep?.resumedEventId === event.id) ||
    (event.type === 'PUMP' && activeTimers?.pump?.resumedEventId === event.id);

  const isResumableType = ['SLEEP', 'BREAST', 'PUMP'].includes(event.type);

  // Find the last (most recent) event in this category
  const lastEventOfCategory = isResumableType
    ? (events || []).reduce((latest, cur) => {
        if (cur.type !== event.type) return latest;
        if (!latest) return cur;
        const curTs = cur.endDt || cur.beginDt;
        const latestTs = latest.endDt || latest.beginDt;
        return curTs > latestTs ? cur : latest;
      }, null)
    : null;

  const isLastOfCategory = lastEventOfCategory?.id === event.id;

  const endTs = event.endDt || (event.beginDt + (event.durationMs || 0));
  const timeSinceEndMs = Date.now() - endTs;
  // Resumable if within the last 12 hours, is the last timer in its category, and not running
  const isRecent = timeSinceEndMs >= -5 * 60 * 1000 && timeSinceEndMs < 12 * 60 * 60 * 1000;
  const isResumable = isResumableType && isLastOfCategory && isRecent && !isCurrentlyRunning;

  const resumeClass = event.type === 'BREAST' ? 'breast' : event.type === 'SLEEP' ? 'sleep' : 'pump';

  const handleCardClick = (e) => {
    // Only trigger if not clicking an interactive button or lightbox
    if (
      e.target.closest('button') ||
      e.target.closest('.timeline-item-photo-btn') ||
      e.target.closest('.photo-lightbox-overlay') ||
      e.target.closest('.photo-lightbox-container')
    ) {
      return;
    }
    triggerHaptic('light', preferences?.haptics);
    openModal('EVENT_DETAIL', event);
  };

  return (
    <div
      className="timeline-item-card clickable"
      onClick={handleCardClick}
      title={isDutch ? 'Tik om details te bekijken' : 'Tap to view details'}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openModal('EVENT_DETAIL', event);
        }
      }}
    >
      <div className="timeline-item-left">
        <div className={`item-badge-icon ${config.badgeClass}`}>
          <Icon size={18} />
        </div>

        <div className="item-content">
          <div className="item-title-row">
            <span className="item-title">{config.title}</span>
            {config.chips.map((chip, idx) => (
              <span key={idx} className="item-details-chip">
                {chip}
              </span>
            ))}
          </div>

          {event.note && <div className="item-note">{event.note}</div>}

          {(event.photoUrl || det.photoUrl) && (
            <div className="timeline-item-photo-wrap">
              <button
                type="button"
                className="timeline-item-photo-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowLightbox(true);
                }}
                title={isDutch ? 'Foto bekijken' : 'View photo'}
                aria-label={isDutch ? 'Foto bekijken' : 'View photo'}
              >
                <img
                  src={syncService.resolveMediaUrl(event.photoUrl || det.photoUrl)}
                  alt={event.note || config.title}
                  className="timeline-item-photo-img"
                  loading="lazy"
                />
                <div className="timeline-photo-badge">
                  <Camera size={11} />
                  <span>{isDutch ? 'Foto' : 'Photo'}</span>
                </div>
              </button>
            </div>
          )}

          {det.caregiver && (
            <div className="timeline-item-footer-meta">
              <div className="item-caregiver-tag">
                <User size={11} />
                <span>{t('timeline.loggedBy', { name: det.caregiver })}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="timeline-item-right">
        <div className="item-actions-row">
          <span className="item-time">{formatTime(event.beginDt, language)}</span>

          {isCurrentlyRunning ? (
            <span className={`timeline-item-active-badge ${resumeClass}`} title={t('timeline.activeTimer')}>
              <span className="timeline-pulse-dot" />
              <span className="active-badge-text">{t('timeline.activeTimer')}</span>
            </span>
          ) : isResumable ? (
            <button
              type="button"
              className={`timeline-item-resume-btn ${resumeClass}`}
              onClick={handleResumeTimer}
              title={t('timeline.resumeSession')}
              aria-label={t('timeline.resumeSession')}
            >
              <Play size={11} fill="currentColor" />
              <span className="resume-btn-text">{t('timeline.resume')}</span>
            </button>
          ) : null}

          <SocialActionButtons event={event} />
        </div>
      </div>

      {showLightbox && (event.photoUrl || det.photoUrl) && (
        <PhotoLightbox
          photoUrl={event.photoUrl || det.photoUrl}
          caption={event.note || config.title}
          timestamp={event.beginDt}
          event={event}
          language={language}
          onClose={() => setShowLightbox(false)}
        />
      )}
    </div>
  );
}
