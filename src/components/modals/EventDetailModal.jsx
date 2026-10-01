import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  formatTime,
  formatDateHeading,
  formatDurationMs,
  formatVolume,
  formatWeight,
  formatLength,
  formatTemp,
  formatRoutineName,
} from '../../utils/formatters';
import { syncService } from '../../services/syncService';
import { triggerHaptic } from '../../utils/haptics';
import { PhotoLightbox } from '../PhotoLightbox';
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
  Calendar,
  Edit2,
  Trash2,
  Play,
  Share2,
  X,
  Camera,
  Check,
  Eye,
  AlertTriangle,
  Info,
  Droplet,
  Flame,
  Shield,
  Tag,
} from 'lucide-react';
import { PumpIcon } from '../icons/PumpIcon';

export function EventDetailModal() {
  const {
    activeModal,
    modalInitialData: event,
    closeModal,
    openModal,
    deleteEvent,
    preferences,
    language,
    t,
    childList,
    activeChild,
    activeTimers,
    resumeBreastTimerWithData,
    resumeSleepTimerWithData,
    resumePumpTimerWithData,
  } = useApp();

  const [showLightbox, setShowLightbox] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);

  if (activeModal !== 'EVENT_DETAIL' || !event) return null;

  const isDutch = language === 'nl';
  const det = event.details || {};
  const isMetric = preferences.weightUnit === 'kg';
  const isMetricVol = preferences.volumeUnit === 'ml';
  const photoUrl = event.photoUrl || det.photoUrl;

  // Find associated baby
  const targetChild = (childList || []).find((c) => c.id === (event.childKey || event.childId)) || activeChild;

  // Calculate baby age at time of event
  const calculateAgeAtEvent = () => {
    if (!targetChild?.birthdate) return '';
    const bDate = new Date(targetChild.birthdate).getTime();
    const evDate = event.beginDt || Date.now();
    const diffMs = evDate - bDate;
    if (diffMs < 0) return '';
    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    const months = Math.floor(days / 30.4375);
    const remDays = Math.floor(days % 30.4375);
    if (months === 0) return isDutch ? `${days} dag${days === 1 ? '' : 'en'}` : `${days} day${days === 1 ? '' : 's'}`;
    if (remDays === 0) return isDutch ? `${months} maand${months === 1 ? '' : 'en'}` : `${months} month${months === 1 ? '' : 's'}`;
    return isDutch
      ? `${months} mnd en ${remDays} dg`
      : `${months} mo and ${remDays} d`;
  };

  const babyAgeAtLog = calculateAgeAtEvent();

  // Date and Time strings
  const dateStr = formatDateHeading(new Date(event.beginDt).toISOString().split('T')[0], language);
  const startTimeStr = formatTime(event.beginDt, language);
  const endTimeStr = event.endDt ? formatTime(event.endDt, language) : null;
  const durationStr = event.durationMs ? formatDurationMs(event.durationMs, language) : null;

  // Resumability check
  const isCurrentlyRunning =
    (event.type === 'BREAST' && activeTimers?.breast?.resumedEventId === event.id) ||
    (event.type === 'SLEEP' && activeTimers?.sleep?.resumedEventId === event.id) ||
    (event.type === 'PUMP' && activeTimers?.pump?.resumedEventId === event.id);

  const isResumableType = ['SLEEP', 'BREAST', 'PUMP'].includes(event.type);
  const endTs = event.endDt || (event.beginDt + (event.durationMs || 0));
  const timeSinceEndMs = Date.now() - endTs;
  const isRecent = timeSinceEndMs >= -5 * 60 * 1000 && timeSinceEndMs < 12 * 60 * 60 * 1000;
  const isResumable = isResumableType && isRecent && !isCurrentlyRunning;

  // Actions
  const handleEdit = () => {
    triggerHaptic('light', preferences?.haptics);
    closeModal();
    // Open the respective edit modal
    const modalType = event.type === 'COMBO' ? 'BREAST' : event.type;
    openModal(modalType, event);
  };

  const handleDelete = () => {
    triggerHaptic('warning', preferences?.haptics);
    if (window.confirm(t('eventDetail.deleteConfirm'))) {
      deleteEvent(event.id);
      closeModal();
    }
  };

  const handleResume = () => {
    triggerHaptic('medium', preferences?.haptics);
    if (event.type === 'BREAST') {
      if (activeTimers?.breast?.running && activeTimers?.breast?.resumedEventId !== event.id) {
        if (!window.confirm(t('timeline.resumeConfirmNursing'))) return;
      }
      resumeBreastTimerWithData(event);
    } else if (event.type === 'SLEEP') {
      if (activeTimers?.sleep?.running && activeTimers?.sleep?.resumedEventId !== event.id) {
        if (!window.confirm(t('timeline.resumeConfirmSleep'))) return;
      }
      resumeSleepTimerWithData(event);
    } else if (event.type === 'PUMP') {
      if (activeTimers?.pump?.running && activeTimers?.pump?.resumedEventId !== event.id) {
        if (!window.confirm(t('timeline.resumeConfirmPump'))) return;
      }
      resumePumpTimerWithData(event);
    }
    closeModal();
  };

  const handleShare = async () => {
    triggerHaptic('light', preferences?.haptics);
    const summaryText = buildSummaryText();

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Baby Tracker - ${config.title}`,
          text: summaryText,
        });
        return;
      } catch (e) {
        if (e.name !== 'AbortError') console.warn('Share failed:', e);
      }
    }

    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2500);
    } catch {
      alert(summaryText);
    }
  };

  // Build summary text for sharing/exporting
  const buildSummaryText = () => {
    const lines = [
      `👶 ${targetChild?.name || 'Baby'} · ${config.title}`,
      `📅 ${dateStr} @ ${startTimeStr}${endTimeStr ? ` – ${endTimeStr}` : ''}${durationStr ? ` (${durationStr})` : ''}`,
    ];
    if (det.caregiver) lines.push(`👤 ${t('eventDetail.caregiver')}: ${det.caregiver}`);
    if (event.note) lines.push(`📝 ${event.note}`);
    return lines.join('\n');
  };

  // Category Configuration & Detailed Content
  const getCategoryConfig = () => {
    switch (event.type) {
      case 'BREAST': {
        const side = (det.side || '').toUpperCase();
        let sideText = t('eventDetail.bothBreasts');
        if (side === 'LEFT' || (det.leftDurationMs > 0 && !det.rightDurationMs)) {
          sideText = t('eventDetail.leftBreast');
        } else if (side === 'RIGHT' || (det.rightDurationMs > 0 && !det.leftDurationMs)) {
          sideText = t('eventDetail.rightBreast');
        }

        return {
          icon: Heart,
          categoryName: t('eventDetail.breastfeeding'),
          title: isDutch ? 'Borstvoeding' : 'Breastfeed',
          themeColor: 'var(--color-breast)',
          themeBg: 'var(--color-breast-light)',
          badgeClass: 'breast',
          heroValue: durationStr || (isDutch ? 'Sessie voltooid' : 'Completed'),
          heroSub: sideText,
          sections: [
            {
              label: t('eventDetail.totalNursing'),
              value: durationStr || '—',
            },
            {
              label: t('eventDetail.leftBreast'),
              value: det.leftDurationMs ? formatDurationMs(det.leftDurationMs, language) : '—',
            },
            {
              label: t('eventDetail.rightBreast'),
              value: det.rightDurationMs ? formatDurationMs(det.rightDurationMs, language) : '—',
            },
            det.lastSide && {
              label: t('eventDetail.lastSide'),
              value: det.lastSide === 'LEFT' ? t('eventDetail.leftBreast') : t('eventDetail.rightBreast'),
            },
          ].filter(Boolean),
        };
      }

      case 'BOTTLE': {
        const volStr = det.volumeFloz ? formatVolume(det.volumeFloz, preferences.volumeUnit) : '—';
        const leftoverStr = det.leftoverFloz ? formatVolume(det.leftoverFloz, preferences.volumeUnit) : null;
        let milkTypeLabel = t('eventDetail.breastMilk');
        if (det.milkType === 'FORMULA') milkTypeLabel = t('eventDetail.formula');
        else if (det.milkType === 'COW_MILK') milkTypeLabel = t('eventDetail.cowMilk');
        else if (det.milkType === 'WATER') milkTypeLabel = t('eventDetail.water');

        return {
          icon: Milk,
          categoryName: t('eventDetail.bottleFeeding'),
          title: isDutch ? 'Flesvoeding' : 'Bottle Feed',
          themeColor: 'var(--color-bottle)',
          themeBg: 'var(--color-bottle-light)',
          badgeClass: 'bottle',
          heroValue: volStr,
          heroSub: milkTypeLabel,
          sections: [
            { label: t('eventDetail.volumeFed'), value: volStr },
            { label: t('eventDetail.milkType'), value: milkTypeLabel },
            det.formulaName && { label: t('eventDetail.formulaBrand'), value: det.formulaName },
            leftoverStr && { label: t('eventDetail.leftover'), value: leftoverStr },
            det.tempNote && { label: isDutch ? 'Temperatuur melk' : 'Temperature', value: det.tempNote },
          ].filter(Boolean),
        };
      }

      case 'SLEEP': {
        const isOngoing = !event.durationMs && !event.endDt;
        const sleepType = det.sleepType === 'NIGHT' ? t('eventDetail.nightSleep') : t('eventDetail.nap');

        return {
          icon: Moon,
          categoryName: t('eventDetail.sleepSession'),
          title: sleepType,
          themeColor: 'var(--color-sleep)',
          themeBg: 'var(--color-sleep-light)',
          badgeClass: 'sleep',
          heroValue: isOngoing ? t('eventDetail.ongoingSleep') : (durationStr || '—'),
          heroSub: sleepType,
          sections: [
            { label: t('eventDetail.sleepDuration'), value: isOngoing ? t('eventDetail.ongoingSleep') : (durationStr || '—') },
            { label: isDutch ? 'Slaaptype' : 'Sleep Type', value: sleepType },
            { label: t('eventDetail.startTime'), value: startTimeStr },
            endTimeStr && { label: t('eventDetail.endTime'), value: endTimeStr },
            det.location && { label: t('eventDetail.sleepQuality'), value: det.location },
            det.wakeUpReason && { label: isDutch ? 'Reden ontwaken' : 'Wake Reason', value: det.wakeUpReason },
          ].filter(Boolean),
        };
      }

      case 'DIAPER': {
        const parts = [];
        if (det.pee) parts.push(t('eventDetail.wet'));
        if (det.poop) parts.push(t('eventDetail.dirty'));
        if (det.dry) parts.push(t('eventDetail.dry'));

        const formatWord = (str) => {
          if (!str) return '';
          return str.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        };

        const colorStr = formatWord(det.color);
        const textureStr = formatWord(det.texture);

        return {
          icon: Sparkles,
          categoryName: t('eventDetail.diaperChange'),
          title: isDutch ? 'Pamper ververst' : 'Diaper Change',
          themeColor: 'var(--color-diaper)',
          themeBg: 'var(--color-diaper-light)',
          badgeClass: 'diaper',
          heroValue: parts.join(' & ') || (isDutch ? 'Pamper' : 'Diaper'),
          heroSub: [colorStr, textureStr].filter(Boolean).join(' · ') || (isDutch ? 'Verversing' : 'Change'),
          sections: [
            { label: t('eventDetail.diaperStatus'), value: parts.join(' & ') || '—' },
            colorStr && { label: t('eventDetail.stoolColor'), value: colorStr },
            textureStr && { label: t('eventDetail.stoolTexture'), value: textureStr },
            det.blowout && { label: isDutch ? 'Status doorlekken' : 'Leakage', value: t('eventDetail.blowout') },
            det.rash && { label: isDutch ? 'Luieruitslag' : 'Diaper Rash', value: isDutch ? '⚠️ Roodheid / Uitslag' : '⚠️ Rash Observed' },
            det.creamApplied && { label: t('eventDetail.creamApplied'), value: isDutch ? 'Ja, zalf aangebracht' : 'Yes, cream applied' },
          ].filter(Boolean),
        };
      }

      case 'PUMP': {
        const volStr = det.totalFloz
          ? formatVolume(det.totalFloz, preferences.volumeUnit)
          : (det.totalAmount ? `${det.totalAmount} ${det.volumeUnit || preferences.volumeUnit}` : '—');

        let storageLabel = null;
        if (det.storageLocation === 'FRIDGE') storageLabel = t('eventDetail.storageFridge');
        else if (det.storageLocation === 'FREEZER') storageLabel = t('eventDetail.storageFreezer');
        else if (det.storageLocation === 'USED_IMMEDIATELY') storageLabel = t('eventDetail.storageUsed');

        return {
          icon: PumpIcon,
          categoryName: t('eventDetail.pumpingSession'),
          title: isDutch ? 'Afkolven' : 'Pumping',
          themeColor: 'var(--color-pump)',
          themeBg: 'var(--color-pump-light)',
          badgeClass: 'pump',
          heroValue: volStr,
          heroSub: durationStr ? `${durationStr}` : (isDutch ? 'Opbrengst' : 'Yield'),
          sections: [
            { label: t('eventDetail.totalPumped'), value: volStr },
            durationStr && { label: t('eventDetail.duration'), value: durationStr },
            (det.leftFloz || det.leftAmount) && {
              label: t('eventDetail.leftPumped'),
              value: det.leftFloz ? formatVolume(det.leftFloz, preferences.volumeUnit) : `${det.leftAmount} ${preferences.volumeUnit}`,
            },
            (det.rightFloz || det.rightAmount) && {
              label: t('eventDetail.rightPumped'),
              value: det.rightFloz ? formatVolume(det.rightFloz, preferences.volumeUnit) : `${det.rightAmount} ${preferences.volumeUnit}`,
            },
            storageLabel && { label: t('eventDetail.storage'), value: storageLabel },
          ].filter(Boolean),
        };
      }

      case 'SOLIDS': {
        return {
          icon: Apple,
          categoryName: t('eventDetail.solidsMeal'),
          title: det.food || (isDutch ? 'Vaste voeding' : 'Solids'),
          themeColor: 'var(--color-solids)',
          themeBg: 'var(--color-solids-light)',
          badgeClass: 'solids',
          heroValue: det.food || (isDutch ? 'Hapje' : 'Meal'),
          heroSub: det.reaction ? `${isDutch ? 'Reactie' : 'Reaction'}: ${det.reaction}` : (isDutch ? 'Hapje' : 'Solid Food'),
          sections: [
            { label: t('eventDetail.foodItem'), value: det.food || '—' },
            det.mealType && { label: isDutch ? 'Maaltijd' : 'Meal Type', value: det.mealType },
            det.portion && { label: t('eventDetail.portion'), value: det.portion },
            det.reaction && { label: t('eventDetail.reaction'), value: det.reaction },
            det.isFirstTime && { label: isDutch ? 'Eerste keer' : 'Baby First', value: t('eventDetail.firstTime') },
          ].filter(Boolean),
        };
      }

      case 'GROWTH': {
        const weightVal = det.weightKg && isMetric
          ? `${det.weightKg} kg`
          : (det.weightLb ? formatWeight(det.weightLb, preferences.weightUnit) : null);

        const heightVal = det.heightCm && preferences.lengthUnit === 'cm'
          ? `${det.heightCm} cm`
          : (det.heightIn ? formatLength(det.heightIn, preferences.lengthUnit) : null);

        const headVal = det.headCm && preferences.lengthUnit === 'cm'
          ? `${det.headCm} cm`
          : (det.headIn ? formatLength(det.headIn, preferences.lengthUnit) : null);

        const primaryVal = weightVal || heightVal || headVal || (isDutch ? 'Meting' : 'Measurement');

        return {
          icon: Ruler,
          categoryName: t('eventDetail.growthMeasurement'),
          title: isDutch ? 'Groei & Metingen' : 'Growth & Measurements',
          themeColor: 'var(--color-growth)',
          themeBg: 'var(--color-growth-light)',
          badgeClass: 'growth',
          heroValue: primaryVal,
          heroSub: isDutch ? 'Groeicurve meting' : 'Growth Record',
          sections: [
            weightVal && { label: t('eventDetail.weight'), value: weightVal },
            heightVal && { label: t('eventDetail.height'), value: heightVal },
            headVal && { label: t('eventDetail.headCircumference'), value: headVal },
            det.percentileWeight && { label: isDutch ? 'Gewichtspercentiel' : 'Weight Percentile', value: `P${det.percentileWeight}` },
          ].filter(Boolean),
        };
      }

      case 'HEALTH': {
        let heroVal = isDutch ? 'Gezondheidsregistratie' : 'Health Check';
        let heroSub = isDutch ? 'Medisch & Zorgen' : 'Health & Meds';

        if (det.medicineName) {
          heroVal = det.medicineName;
          heroSub = det.dosage || (isDutch ? 'Medicatie' : 'Medication');
        } else if (det.temperatureC || det.temperatureF) {
          const tempVal = det.temperatureC && preferences.tempUnit === 'C'
            ? `${det.temperatureC}°C`
            : formatTemp(det.temperatureF, preferences.tempUnit);
          heroVal = tempVal;
          const tempNum = Number(det.temperatureC || (det.temperatureF ? (det.temperatureF - 32) * 5 / 9 : 0));
          if (tempNum >= 38.0) heroSub = t('eventDetail.tempFever');
          else if (tempNum >= 37.5) heroSub = t('eventDetail.tempElevated');
          else heroSub = t('eventDetail.tempNormal');
        } else if (det.doctorName) {
          heroVal = det.doctorName;
          heroSub = t('eventDetail.doctorVisit');
        } else if (det.vaccineName) {
          heroVal = det.vaccineName;
          heroSub = t('eventDetail.vaccine');
        }

        return {
          icon: Stethoscope,
          categoryName: t('eventDetail.healthCheckup'),
          title: isDutch ? 'Gezondheid & Zorgen' : 'Health & Care',
          themeColor: 'var(--color-health)',
          themeBg: 'var(--color-health-light)',
          badgeClass: 'health',
          heroValue: heroVal,
          heroSub: heroSub,
          sections: [
            det.medicineName && { label: t('eventDetail.medication'), value: det.medicineName },
            det.dosage && { label: t('eventDetail.dosage'), value: det.dosage },
            (det.temperatureC || det.temperatureF) && {
              label: t('eventDetail.temperature'),
              value: det.temperatureC && preferences.tempUnit === 'C' ? `${det.temperatureC}°C` : formatTemp(det.temperatureF, preferences.tempUnit),
            },
            det.doctorName && { label: t('eventDetail.doctorName'), value: det.doctorName },
            det.clinic && { label: isDutch ? 'Praktijk / Ziekenhuis' : 'Clinic / Hospital', value: det.clinic },
            det.vaccineName && { label: t('eventDetail.vaccine'), value: det.vaccineName },
            det.symptoms && { label: t('eventDetail.symptoms'), value: det.symptoms },
          ].filter(Boolean),
        };
      }

      case 'ROUTINE': {
        const rTitle = formatRoutineName(det.routineName, language, true);
        return {
          icon: Clock,
          categoryName: t('eventDetail.routineActivity'),
          title: rTitle,
          themeColor: 'var(--color-routine)',
          themeBg: 'var(--color-routine-light)',
          badgeClass: 'routine',
          heroValue: rTitle,
          heroSub: durationStr || (isDutch ? 'Voltooid' : 'Completed'),
          sections: [
            { label: t('eventDetail.routineType'), value: rTitle },
            durationStr && { label: t('eventDetail.duration'), value: durationStr },
          ].filter(Boolean),
        };
      }

      case 'MILESTONE': {
        return {
          icon: Award,
          categoryName: t('eventDetail.milestoneTitle'),
          title: det.milestoneName || (isDutch ? 'Mijlpaal' : 'Milestone'),
          themeColor: 'var(--color-milestone)',
          themeBg: 'var(--color-milestone-light)',
          badgeClass: 'milestone',
          heroValue: det.milestoneName || (isDutch ? 'Mijlpaal bereikt 🎉' : 'Milestone achieved 🎉'),
          heroSub: det.isBabyFirst ? t('eventDetail.babyFirst') : (isDutch ? 'Ontwikkeling' : 'Development'),
          sections: [
            { label: isDutch ? 'Mijlpaal' : 'Milestone', value: det.milestoneName || '—' },
            det.isBabyFirst && { label: isDutch ? 'Eerste keer' : 'Baby First', value: t('eventDetail.babyFirst') },
            babyAgeAtLog && { label: isDutch ? 'Leeftijd baby' : 'Age at milestone', value: babyAgeAtLog },
          ].filter(Boolean),
        };
      }

      case 'NOTE':
      default: {
        return {
          icon: BookOpen,
          categoryName: t('eventDetail.journalNote'),
          title: isDutch ? 'Dagboeknotitie' : 'Journal Note',
          themeColor: 'var(--color-note)',
          themeBg: 'var(--color-note-light)',
          badgeClass: 'note',
          heroValue: isDutch ? 'Notitie' : 'Note',
          heroSub: dateStr,
          sections: [],
        };
      }
    }
  };

  const config = getCategoryConfig();
  const Icon = config.icon;

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="event-detail-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="event-detail-header">
          <div className="event-detail-title-wrap">
            <div className={`event-detail-icon-circle ${config.badgeClass}`}>
              <Icon size={20} />
            </div>
            <div className="event-detail-title-texts">
              <span className="event-detail-category">{config.categoryName}</span>
              <h2 className="event-detail-main-title">{config.title}</h2>
            </div>
          </div>

          <div className="event-detail-header-actions">
            <button
              type="button"
              className="event-detail-action-icon-btn"
              onClick={handleShare}
              title={t('eventDetail.share')}
              aria-label={t('eventDetail.share')}
            >
              <Share2 size={18} />
            </button>
            <button
              type="button"
              className="event-detail-action-icon-btn close"
              onClick={closeModal}
              title={t('eventDetail.close')}
              aria-label={t('eventDetail.close')}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="event-detail-body">
          {/* Toast on copied */}
          {copiedToast && (
            <div className="event-detail-toast">
              <Check size={14} />
              <span>{t('eventDetail.copied')}</span>
            </div>
          )}

          {/* Hero Highlight Banner */}
          <div className="event-detail-hero-banner" style={{ background: config.themeBg, borderColor: config.themeColor }}>
            <div className="event-detail-hero-left">
              <div className="event-detail-hero-value" style={{ color: config.themeColor }}>
                {config.heroValue}
              </div>
              <div className="event-detail-hero-sub">{config.heroSub}</div>
            </div>
            <div className="event-detail-hero-timing">
              <Clock size={13} />
              <span>{startTimeStr}{endTimeStr ? ` – ${endTimeStr}` : ''}</span>
            </div>
          </div>

          {/* Detailed Attributes Grid */}
          {config.sections && config.sections.length > 0 && (
            <div className="event-detail-section">
              <div className="event-detail-section-title">
                <Tag size={14} />
                <span>{isDutch ? 'Details & Gegevens' : 'Specific Details'}</span>
              </div>
              <div className="event-detail-grid">
                {config.sections.map((item, idx) => (
                  <div key={idx} className="event-detail-grid-item">
                    <span className="event-detail-item-label">{item.label}</span>
                    <span className="event-detail-item-value">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attached Photo Card (if available) */}
          {photoUrl && (
            <div className="event-detail-section">
              <div className="event-detail-section-title">
                <Camera size={14} />
                <span>{t('eventDetail.photo')}</span>
              </div>
              <div className="event-detail-photo-card" onClick={() => setShowLightbox(true)}>
                <img
                  src={syncService.resolveMediaUrl(photoUrl)}
                  alt={event.note || config.title}
                  className="event-detail-photo-img"
                />
                <div className="event-detail-photo-overlay">
                  <Eye size={18} />
                  <span>{t('eventDetail.viewPhoto')}</span>
                </div>
              </div>
            </div>
          )}

          {/* Notes Card */}
          {event.note && (
            <div className="event-detail-section">
              <div className="event-detail-section-title">
                <BookOpen size={14} />
                <span>{t('eventDetail.notes')}</span>
              </div>
              <div className="event-detail-note-card">
                <p>{event.note}</p>
              </div>
            </div>
          )}

          {/* Meta & Audit Info */}
          <div className="event-detail-meta-box">
            <div className="event-detail-meta-row">
              <span className="event-detail-meta-label">
                <Calendar size={13} />
                <span>{t('eventDetail.timing')}</span>
              </span>
              <span className="event-detail-meta-val">
                {dateStr} · {startTimeStr}
              </span>
            </div>

            <div className="event-detail-meta-row">
              <span className="event-detail-meta-label">
                <User size={13} />
                <span>{t('eventDetail.baby')}</span>
              </span>
              <span className="event-detail-meta-val">
                {targetChild?.name || 'Baby'}{babyAgeAtLog ? ` (${babyAgeAtLog})` : ''}
              </span>
            </div>

            {det.caregiver && (
              <div className="event-detail-meta-row">
                <span className="event-detail-meta-label">
                  <Shield size={13} />
                  <span>{t('eventDetail.caregiver')}</span>
                </span>
                <span className="event-detail-meta-val caregiver-pill">
                  {det.caregiver}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action Footer */}
        <div className="event-detail-footer">
          <div className="event-detail-footer-left">
            <button
              type="button"
              className="event-detail-footer-btn delete"
              onClick={handleDelete}
              title={t('eventDetail.delete')}
            >
              <Trash2 size={16} />
              <span>{t('eventDetail.delete')}</span>
            </button>
          </div>

          <div className="event-detail-footer-right">
            {isResumable && (
              <button
                type="button"
                className="event-detail-footer-btn resume"
                onClick={handleResume}
                title={t('eventDetail.resume')}
              >
                <Play size={15} fill="currentColor" />
                <span>{t('eventDetail.resume')}</span>
              </button>
            )}

            <button
              type="button"
              className="event-detail-footer-btn edit"
              onClick={handleEdit}
              title={t('eventDetail.edit')}
            >
              <Edit2 size={16} />
              <span>{t('eventDetail.edit')}</span>
            </button>
          </div>
        </div>

        {/* Lightbox for attached image */}
        {showLightbox && photoUrl && (
          <PhotoLightbox
            photoUrl={photoUrl}
            caption={event.note || config.title}
            timestamp={event.beginDt}
            language={language}
            onClose={() => setShowLightbox(false)}
          />
        )}
      </div>
    </div>
  );
}
