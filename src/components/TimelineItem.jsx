import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatTime, formatDurationMs, formatVolume, formatWeight, formatLength, formatTemp, formatRoutineName } from '../utils/formatters';
import { syncService } from '../services/syncService';
import { PhotoLightbox } from './PhotoLightbox';
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
  MoreVertical,
  Edit2,
  Trash2,
  User,
  Play,
  Camera,
} from 'lucide-react';
import { PumpIcon } from './icons/PumpIcon';

export function TimelineItem({ event }) {
  const {
    events,
    activeTimers,
    preferences,
    deleteEvent,
    openModal,
    resumeBreastTimerWithData,
    resumeSleepTimerWithData,
    resumePumpTimerWithData,
    language,
    t,
  } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const isDutch = language === 'nl';

  const det = event.details || {};
  const isMetric = preferences.weightUnit === 'kg';

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
          badgeClass: 'feed',
          title: isDutch ? 'Borstvoeding' : 'Breastfeed',
          chips,
        };
      }
      case 'BOTTLE':
        return {
          icon: Milk,
          badgeClass: 'feed',
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
          badgeClass: 'feed',
          title: 'Combo Feed',
          chips: [
            det.volumeFloz ? formatVolume(det.volumeFloz, preferences.volumeUnit) : '',
            formatDurationMs(event.durationMs),
          ].filter(Boolean),
        };
      case 'SOLIDS':
        return {
          icon: Apple,
          badgeClass: 'feed',
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
        else if (hasHead && !hasWeight && !hasHeight) title = isDutch ? 'Hoofdomtrek' : 'Head Circumference';

        if (det.weightKg && isMetric) chips.push(`${det.weightKg} kg`);
        else if (det.weightLb) chips.push(formatWeight(det.weightLb, preferences.weightUnit));

        if (det.heightCm && preferences.lengthUnit === 'cm') chips.push(`${det.heightCm} cm`);
        else if (det.heightIn) chips.push(formatLength(det.heightIn, preferences.lengthUnit));

        if (det.headCm && preferences.lengthUnit === 'cm') chips.push(`${isDutch ? 'Hoofd' : 'Head'}: ${det.headCm} cm`);
        else if (det.headIn) chips.push(`${isDutch ? 'Hoofd' : 'Head'}: ${formatLength(det.headIn, preferences.lengthUnit)}`);

        return {
          icon: Ruler,
          badgeClass: 'grow',
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
          badgeClass: 'note',
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

  const handleEdit = () => {
    setMenuOpen(false);
    openModal(event.type, event);
  };

  const handleDelete = () => {
    setMenuOpen(false);
    triggerHaptic('warning', preferences?.haptics);
    if (window.confirm(t('timeline.deleteConfirm'))) {
      deleteEvent(event.id);
    }
  };

  const handleResumeTimer = (e) => {
    if (e) e.stopPropagation();
    setMenuOpen(false);
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
    // Only trigger if not clicking an interactive button
    if (e.target.closest('button') || e.target.closest('.timeline-item-photo-btn')) {
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
            <div className="item-caregiver-tag">
              <User size={11} />
              <span>{t('timeline.loggedBy', { name: det.caregiver })}</span>
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

          <div style={{ position: 'relative' }}>
            <button
              className="item-menu-btn"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={t('timeline.activityMenu')}
            >
              <MoreVertical size={16} />
            </button>

            {menuOpen && (
              <>
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 30 }}
                  onClick={() => setMenuOpen(false)}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    backgroundColor: 'var(--bg-card)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-lg)',
                    border: '1px solid var(--border-subtle)',
                    padding: '0.35rem',
                    zIndex: 35,
                    minWidth: 140,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.2rem',
                  }}
                >
                  {isResumable && (
                    <button
                      onClick={handleResumeTimer}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.45rem 0.65rem',
                        fontSize: '0.8rem',
                        color: 'var(--color-terracotta)',
                        fontWeight: 600,
                        borderRadius: 'var(--radius-sm)',
                        width: '100%',
                        textAlign: 'left',
                      }}
                    >
                      <Play size={13} fill="currentColor" />
                      {t('timeline.resumeSession')}
                    </button>
                  )}
                  <button
                    onClick={handleEdit}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.45rem 0.65rem',
                      fontSize: '0.8rem',
                      color: 'var(--text-primary)',
                      borderRadius: 'var(--radius-sm)',
                      width: '100%',
                      textAlign: 'left',
                    }}
                  >
                    <Edit2 size={13} />
                    {t('timeline.edit')}
                  </button>
                  <button
                    onClick={handleDelete}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.45rem 0.65rem',
                      fontSize: '0.8rem',
                      color: 'var(--status-red)',
                      borderRadius: 'var(--radius-sm)',
                      width: '100%',
                      textAlign: 'left',
                    }}
                  >
                    <Trash2 size={13} />
                    {t('timeline.delete')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showLightbox && (event.photoUrl || det.photoUrl) && (
        <PhotoLightbox
          photoUrl={event.photoUrl || det.photoUrl}
          caption={event.note || config.title}
          timestamp={event.beginDt}
          language={language}
          onClose={() => setShowLightbox(false)}
        />
      )}
    </div>
  );
}
