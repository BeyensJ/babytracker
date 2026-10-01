import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatTime, formatDurationMs, formatVolume, formatWeight, formatLength, formatTemp, formatRoutineName } from '../utils/formatters';
import { syncService } from '../services/syncService';
import { PhotoLightbox } from './PhotoLightbox';
import {
  Utensils,
  Moon,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  Heart,
  Milk,
  Apple,
  Clock,
  User,
  Edit2,
  Trash2,
  MoreVertical,
  Scale,
  Stethoscope,
  Award,
  BookOpen,
  Play,
} from 'lucide-react';
import { PumpIcon } from './icons/PumpIcon';

export function GroupedDayActivity({ dateKey, events, defaultExpanded = true }) {
  const {
    events: allEvents,
    activeTimers,
    preferences,
    openModal,
    deleteEvent,
    resumeBreastTimerWithData,
    resumeSleepTimerWithData,
    resumePumpTimerWithData,
    language,
    t,
  } = useApp();
  const isDutch = language === 'nl';
  const isMetric = preferences.weightUnit === 'kg';
  const isMetricVol = preferences.volumeUnit === 'ml';

  const handleResume = (event) => {
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

    if (event.type === 'BREAST') {
      resumeBreastTimerWithData(event);
    } else if (event.type === 'SLEEP') {
      resumeSleepTimerWithData(event);
    } else if (event.type === 'PUMP') {
      resumePumpTimerWithData(event);
    }
  };

  // Group events into 5 buckets
  const feeds = [];
  const pumps = [];
  const sleeps = [];
  const diapers = [];
  const others = [];

  events.forEach(ev => {
    if (['BREAST', 'BOTTLE', 'SOLIDS', 'COMBO'].includes(ev.type)) {
      feeds.push(ev);
    } else if (ev.type === 'PUMP') {
      pumps.push(ev);
    } else if (ev.type === 'SLEEP') {
      sleeps.push(ev);
    } else if (ev.type === 'DIAPER') {
      diapers.push(ev);
    } else {
      others.push(ev);
    }
  });

  // Calculate Feed Metrics
  let totalNursingMs = 0;
  let totalBottleVol = 0;
  let solidsCount = 0;
  feeds.forEach(f => {
    const det = f.details || {};
    if (f.type === 'BREAST' || f.type === 'COMBO') {
      totalNursingMs += (det.leftDurationMs || 0) + (det.rightDurationMs || 0) || f.durationMs || 0;
    }
    if (f.type === 'BOTTLE' || f.type === 'COMBO') {
      totalBottleVol += det.volumeFloz || 0;
    }
    if (f.type === 'SOLIDS') {
      solidsCount++;
    }
  });

  let feedSummaryText = isDutch
    ? `${feeds.length} voeding${feeds.length === 1 ? '' : 'en'}`
    : `${feeds.length} Feed${feeds.length === 1 ? '' : 's'}`;
  const feedSubParts = [];
  if (totalNursingMs > 0) {
    feedSubParts.push(isDutch ? `${formatDurationMs(totalNursingMs, language)} borst` : `${formatDurationMs(totalNursingMs)} Nursing`);
  }
  if (totalBottleVol > 0) feedSubParts.push(formatVolume(totalBottleVol, preferences.volumeUnit));
  if (solidsCount > 0) {
    feedSubParts.push(isDutch ? `${solidsCount} hapje${solidsCount === 1 ? '' : 's'}` : `${solidsCount} Solid${solidsCount === 1 ? '' : 's'}`);
  }
  if (feedSubParts.length > 0) {
    feedSummaryText += ` · ${feedSubParts.join(', ')}`;
  }

  // Calculate Pumping Metrics
  let totalPumpFloz = 0;
  let totalPumpDurationMs = 0;
  pumps.forEach(p => {
    const det = p.details || {};
    totalPumpFloz += det.totalFloz || det.volumeFloz || 0;
    totalPumpDurationMs += p.durationMs || (p.endDt ? p.endDt - p.beginDt : 0);
  });

  let pumpSummaryText = isDutch
    ? `${pumps.length} kolfsessie${pumps.length === 1 ? '' : 's'}`
    : `${pumps.length} Pump Session${pumps.length === 1 ? '' : 's'}`;
  const pumpSubParts = [];
  if (totalPumpFloz > 0) {
    pumpSubParts.push(formatVolume(totalPumpFloz, preferences.volumeUnit));
  }
  if (totalPumpDurationMs > 0) {
    pumpSubParts.push(formatDurationMs(totalPumpDurationMs, language));
  }
  if (pumpSubParts.length > 0) {
    pumpSummaryText += ` · ${pumpSubParts.join(', ')}`;
  }

  // Calculate Sleep Metrics
  let totalSleepMs = 0;
  let napCount = 0;
  let nightCount = 0;
  sleeps.forEach(s => {
    const dur = s.durationMs || (s.endDt ? s.endDt - s.beginDt : 0);
    totalSleepMs += dur;
    const isNight = s.details?.sleepType === 'NIGHT';
    if (isNight) nightCount++;
    else napCount++;
  });

  let sleepSummaryText = isDutch
    ? `${formatDurationMs(totalSleepMs, language)} totaal`
    : `${formatDurationMs(totalSleepMs)} Total`;
  const sleepBreakdown = [];
  if (napCount > 0) {
    sleepBreakdown.push(isDutch ? `${napCount} dutje${napCount === 1 ? '' : 's'}` : `${napCount} Nap${napCount === 1 ? '' : 's'}`);
  }
  if (nightCount > 0) {
    sleepBreakdown.push(isDutch ? `${nightCount} nacht` : `${nightCount} Night`);
  }
  if (sleepBreakdown.length > 0) {
    sleepSummaryText += ` · ${sleepBreakdown.join(', ')}`;
  }

  // Calculate Diaper Metrics
  let wetCount = 0;
  let dirtyCount = 0;
  let blowoutCount = 0;
  diapers.forEach(d => {
    const det = d.details || {};
    if (det.pee) wetCount++;
    if (det.poop) dirtyCount++;
    if (det.blowout) blowoutCount++;
  });

  let diaperSummaryText = isDutch
    ? `${diapers.length} pamper${diapers.length === 1 ? '' : 's'}`
    : `${diapers.length} Change${diapers.length === 1 ? '' : 's'}`;
  const diaperParts = [];
  if (wetCount > 0) diaperParts.push(isDutch ? `${wetCount} nat` : `${wetCount} Wet`);
  if (dirtyCount > 0) diaperParts.push(isDutch ? `${dirtyCount} kaka` : `${dirtyCount} Dirty`);
  if (diaperParts.length > 0) {
    diaperSummaryText += ` · ${diaperParts.join(', ')}`;
  }
  if (blowoutCount > 0) {
    diaperSummaryText += isDutch ? ` (⚠️ ${blowoutCount} doorgelekt)` : ` (⚠️ ${blowoutCount} Blowout)`;
  }

  return (
    <div className="grouped-day-container">
      {/* 1. Feeds Section */}
      {feeds.length > 0 && (
        <CategoryCard
          categoryKey="feeds"
          title={isDutch ? 'Voeding' : 'Feeding'}
          icon={Utensils}
          colorClass="feed"
          count={feeds.length}
          summaryText={feedSummaryText}
          events={feeds}
          defaultOpen={defaultExpanded}
          renderItem={(ev) => (
            <FeedItemRow
              key={ev.id}
              event={ev}
              preferences={preferences}
              language={language}
              onEdit={openModal}
              onDelete={deleteEvent}
              onResume={handleResume}
              activeTimers={activeTimers}
              allEvents={allEvents}
            />
          )}
        />
      )}

      {/* 2. Sleep Section */}
      {sleeps.length > 0 && (
        <CategoryCard
          categoryKey="sleep"
          title={isDutch ? 'Slaap' : 'Sleep'}
          icon={Moon}
          colorClass="sleep"
          count={sleeps.length}
          summaryText={sleepSummaryText}
          events={sleeps}
          defaultOpen={defaultExpanded}
          renderItem={(ev) => (
            <SleepItemRow
              key={ev.id}
              event={ev}
              language={language}
              onEdit={openModal}
              onDelete={deleteEvent}
              onResume={handleResume}
              activeTimers={activeTimers}
              allEvents={allEvents}
            />
          )}
        />
      )}

      {/* 3. Pumping Section */}
      {pumps.length > 0 && (
        <CategoryCard
          categoryKey="pumping"
          title={isDutch ? 'Afkolven' : 'Pumping'}
          icon={PumpIcon}
          colorClass="pump"
          count={pumps.length}
          summaryText={pumpSummaryText}
          events={pumps}
          defaultOpen={defaultExpanded}
          renderItem={(ev) => (
            <PumpItemRow
              key={ev.id}
              event={ev}
              preferences={preferences}
              language={language}
              onEdit={openModal}
              onDelete={deleteEvent}
              onResume={handleResume}
              activeTimers={activeTimers}
              allEvents={allEvents}
            />
          )}
        />
      )}

      {/* 4. Diapers Section */}
      {diapers.length > 0 && (
        <CategoryCard
          categoryKey="diaper"
          title={isDutch ? 'Pampers' : 'Diapers'}
          icon={Sparkles}
          colorClass="diaper"
          count={diapers.length}
          summaryText={diaperSummaryText}
          events={diapers}
          defaultOpen={defaultExpanded}
          renderItem={(ev) => <DiaperItemRow key={ev.id} event={ev} language={language} onEdit={openModal} onDelete={deleteEvent} />}
        />
      )}

      {/* 5. Other Activities Section */}
      {others.length > 0 && (
        <CategoryCard
          categoryKey="others"
          title={isDutch ? 'Overige activiteiten' : 'Other Activities'}
          icon={Layers}
          colorClass="other"
          count={others.length}
          summaryText={isDutch ? `${others.length} registratie${others.length === 1 ? '' : 's'}` : `${others.length} Activities`}
          events={others}
          defaultOpen={defaultExpanded}
          renderItem={(ev) => (
            <OtherItemRow
              key={ev.id}
              event={ev}
              preferences={preferences}
              language={language}
              onEdit={openModal}
              onDelete={deleteEvent}
            />
          )}
        />
      )}
    </div>
  );
}

/**
 * Reusable Category Group Card with Collapsible Items
 */
function CategoryCard({ categoryKey, title, icon: Icon, colorClass, count, summaryText, events, defaultOpen, renderItem }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`grouped-activity-card ${colorClass}`}>
      <div
        className="grouped-card-header"
        onClick={() => setIsOpen(!isOpen)}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
      >
        <div className="grouped-header-left">
          <div className={`grouped-badge-wrap ${colorClass}`}>
            <Icon size={18} />
          </div>
          <div className="grouped-header-meta">
            <div className="grouped-title-row">
              <span className="grouped-title">{title}</span>
              <span className="grouped-count-pill">{count}</span>
            </div>
            <span className="grouped-summary-text">{summaryText}</span>
          </div>
        </div>

        <button
          className="grouped-toggle-btn"
          type="button"
          aria-label={isOpen ? 'Collapse items' : 'Expand items'}
        >
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {isOpen && (
        <div className="grouped-items-list">
          {events.map(renderItem)}
        </div>
      )}
    </div>
  );
}

/**
 * Feed Item Row
 */
/**
 * Feed Item Row
 */
function FeedItemRow({ event, preferences, language, onEdit, onDelete, onResume, activeTimers, allEvents }) {
  const isDutch = language === 'nl';
  const det = event.details || {};
  let label = isDutch ? 'Voeding' : 'Feed';
  let detailChip = '';

  const isResumableType = event.type === 'BREAST';
  const lastEvent = isResumableType
    ? (allEvents || []).reduce((latest, cur) => {
        if (cur.type !== event.type) return latest;
        if (!latest) return cur;
        const curTs = cur.endDt || cur.beginDt;
        const latestTs = latest.endDt || latest.beginDt;
        return curTs > latestTs ? cur : latest;
      }, null)
    : null;
  const isLastOfCategory = lastEvent?.id === event.id;

  const isCurrentlyRunning = event.type === 'BREAST' && activeTimers?.breast?.resumedEventId === event.id;
  const endTs = event.endDt || (event.beginDt + (event.durationMs || 0));
  const timeSinceEndMs = Date.now() - endTs;
  const isRecent = timeSinceEndMs >= -5 * 60 * 1000 && timeSinceEndMs < 12 * 60 * 60 * 1000;
  const isResumable = isResumableType && isLastOfCategory && isRecent && !isCurrentlyRunning;

  if (event.type === 'BREAST') {
    label = isDutch ? 'Borst' : 'Nurse';
    const side = (det.side || '').toUpperCase();
    if (side === 'BOTH' || (det.leftDurationMs > 0 && det.rightDurationMs > 0)) {
      detailChip = isDutch
        ? `Beide (L: ${formatDurationMs(det.leftDurationMs, language)}, R: ${formatDurationMs(det.rightDurationMs, language)})`
        : `Both (L: ${formatDurationMs(det.leftDurationMs)}, R: ${formatDurationMs(det.rightDurationMs)})`;
    } else if (side.includes('LEFT') || det.leftDurationMs > 0) {
      const dur = det.leftDurationMs || event.durationMs;
      detailChip = dur ? `${isDutch ? 'Links' : 'Left'} · ${formatDurationMs(dur, language)}` : (isDutch ? 'Linkerkant' : 'Left Side');
    } else if (side.includes('RIGHT') || det.rightDurationMs > 0) {
      const dur = det.rightDurationMs || event.durationMs;
      detailChip = dur ? `${isDutch ? 'Rechts' : 'Right'} · ${formatDurationMs(dur, language)}` : (isDutch ? 'Rechterkant' : 'Right Side');
    } else {
      detailChip = formatDurationMs(event.durationMs, language) || (isDutch ? 'Borstvoeding' : 'Nursing');
    }
  } else if (event.type === 'BOTTLE') {
    label = isDutch ? 'Flesje' : 'Bottle';
    const volStr = det.volumeFloz ? formatVolume(det.volumeFloz, preferences.volumeUnit) : '';
    const milkStr = det.milkType === 'FORMULA'
      ? (det.formulaName || (isDutch ? 'Kunstvoeding' : 'Formula'))
      : (isDutch ? 'Moedermelk' : 'Breast Milk');
    detailChip = [volStr, milkStr].filter(Boolean).join(' · ');
  } else if (event.type === 'SOLIDS') {
    label = isDutch ? 'Vaste voeding' : 'Solids';
    detailChip = [det.food || (isDutch ? 'Hapje' : 'Meal'), det.reaction ? `${isDutch ? 'Reactie' : 'Reaction'}: ${det.reaction}` : ''].filter(Boolean).join(' · ');
  } else if (event.type === 'COMBO') {
    label = isDutch ? 'Combo voeding' : 'Combo Feed';
    detailChip = [
      det.volumeFloz ? formatVolume(det.volumeFloz, preferences.volumeUnit) : '',
      formatDurationMs(event.durationMs, language),
    ].filter(Boolean).join(' · ');
  }

  return (
    <ItemRowTemplate
      event={event}
      label={label}
      detailChip={detailChip}
      language={language}
      onEdit={onEdit}
      onDelete={onDelete}
      onResume={onResume}
      isCurrentlyRunning={isCurrentlyRunning}
      isResumable={isResumable}
      categoryType={event.type === 'BOTTLE' ? 'bottle' : event.type === 'SOLIDS' ? 'solids' : 'breast'}
    />
  );
}

/**
 * Sleep Item Row
 */
function SleepItemRow({ event, language, onEdit, onDelete, onResume, activeTimers, allEvents }) {
  const isDutch = language === 'nl';
  const det = event.details || {};
  const isOngoing = !event.durationMs && !event.endDt;
  const isNight = det.sleepType === 'NIGHT';
  const label = isNight ? (isDutch ? 'Nachtslaap' : 'Night Sleep') : (isDutch ? 'Dutje' : 'Nap');
  const durationStr = isOngoing
    ? (isDutch ? 'Slaapt nu...' : 'Sleeping now...')
    : formatDurationMs(event.durationMs || (event.endDt - event.beginDt), language);

  const lastEvent = (allEvents || []).reduce((latest, cur) => {
    if (cur.type !== 'SLEEP') return latest;
    if (!latest) return cur;
    const curTs = cur.endDt || cur.beginDt;
    const latestTs = latest.endDt || latest.beginDt;
    return curTs > latestTs ? cur : latest;
  }, null);
  const isLastOfCategory = lastEvent?.id === event.id;

  const isCurrentlyRunning = activeTimers?.sleep?.resumedEventId === event.id;
  const endTs = event.endDt || (event.beginDt + (event.durationMs || 0));
  const timeSinceEndMs = Date.now() - endTs;
  const isRecent = timeSinceEndMs >= -5 * 60 * 1000 && timeSinceEndMs < 12 * 60 * 60 * 1000;
  const isResumable = isLastOfCategory && isRecent && !isCurrentlyRunning;

  return (
    <ItemRowTemplate
      event={event}
      label={label}
      detailChip={durationStr}
      language={language}
      onEdit={onEdit}
      onDelete={onDelete}
      onResume={onResume}
      isCurrentlyRunning={isCurrentlyRunning}
      isResumable={isResumable}
      categoryType="sleep"
    />
  );
}

/**
 * Diaper Item Row
 */
function DiaperItemRow({ event, language, onEdit, onDelete }) {
  const isDutch = language === 'nl';
  const det = event.details || {};
  const parts = [];
  if (det.pee) parts.push(isDutch ? 'Nat' : 'Wet');
  if (det.poop) parts.push(isDutch ? 'Kaka' : 'Dirty');
  if (det.dry) parts.push(isDutch ? 'Droog' : 'Dry');

  let desc = parts.join(' & ') || (isDutch ? 'Pamper' : 'Diaper');
  if (det.blowout) desc += isDutch ? ' ⚠️ Doorgelekt' : ' ⚠️ Blowout';
  if (det.rash) desc += isDutch ? ' (Luieruitslag)' : ' (Rash)';

  return (
    <ItemRowTemplate
      event={event}
      label={isDutch ? 'Pamper' : 'Diaper'}
      detailChip={desc}
      language={language}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
}

/**
 * Individual Pump Item Row in Grouped View
 */
function PumpItemRow({ event, preferences, language, onEdit, onDelete, onResume, activeTimers, allEvents }) {
  const isDutch = language === 'nl';
  const det = event.details || {};
  const label = isDutch ? 'Afkolven' : 'Pumping';

  const lastEvent = (allEvents || []).reduce((latest, cur) => {
    if (cur.type !== 'PUMP') return latest;
    if (!latest) return cur;
    const curTs = cur.endDt || cur.beginDt;
    const latestTs = latest.endDt || latest.beginDt;
    return curTs > latestTs ? cur : latest;
  }, null);
  const isLastOfCategory = lastEvent?.id === event.id;

  const isCurrentlyRunning = activeTimers?.pump?.resumedEventId === event.id;
  const endTs = event.endDt || (event.beginDt + (event.durationMs || 0));
  const timeSinceEndMs = Date.now() - endTs;
  const isRecent = timeSinceEndMs >= -5 * 60 * 1000 && timeSinceEndMs < 12 * 60 * 60 * 1000;
  const isResumable = isLastOfCategory && isRecent && !isCurrentlyRunning;

  // Build detail chip (volume, duration, side)
  const parts = [];
  if (det.totalFloz) {
    parts.push(formatVolume(det.totalFloz, preferences.volumeUnit));
  } else if (det.totalAmount) {
    parts.push(`${det.totalAmount} ${det.volumeUnit || preferences.volumeUnit}`);
  }
  if (event.durationMs > 0) {
    parts.push(formatDurationMs(event.durationMs, language));
  }
  if (det.side && det.side !== 'BOTH') {
    parts.push(det.side === 'LEFT' ? (isDutch ? 'Links' : 'Left') : (isDutch ? 'Rechts' : 'Right'));
  }
  const detailChip = parts.join(' · ');

  return (
    <ItemRowTemplate
      event={event}
      label={label}
      detailChip={detailChip}
      language={language}
      onEdit={onEdit}
      onDelete={onDelete}
      onResume={onResume}
      isCurrentlyRunning={isCurrentlyRunning}
      isResumable={isResumable}
      categoryType="pump"
    />
  );
}

/**
 * Other Activities Row (Growth, Health, Routine, Milestone, Note)
 */
function OtherItemRow({ event, preferences, language, onEdit, onDelete }) {
  const isDutch = language === 'nl';
  const det = event.details || {};
  let label = isDutch ? 'Activiteit' : 'Activity';
  let detailChip = '';

  if (event.type === 'GROWTH') {
    label = isDutch ? 'Groei' : 'Growth';
    const isMetric = preferences.weightUnit === 'kg';
    const parts = [];
    if (det.weightKg && isMetric) parts.push(`${det.weightKg} kg`);
    else if (det.weightLb) parts.push(formatWeight(det.weightLb, preferences.weightUnit));
    if (det.heightCm && preferences.lengthUnit === 'cm') parts.push(`${det.heightCm} cm`);
    detailChip = parts.join(' • ');
  } else if (event.type === 'HEALTH') {
    label = det.medicineName ? (isDutch ? 'Medicatie' : 'Medication') : (det.temperatureC || det.temperatureF ? (isDutch ? 'Temperatuur' : 'Temperature') : (isDutch ? 'Gezondheid' : 'Health'));
    detailChip = det.medicineName || (det.temperatureC ? `${det.temperatureC}°C` : '');
  } else if (event.type === 'ROUTINE') {
    label = formatRoutineName(det.routineName, language, true);
    detailChip = formatDurationMs(event.durationMs, language);
  } else if (event.type === 'MILESTONE') {
    label = det.milestoneName || (isDutch ? 'Mijlpaal' : 'Milestone');
    detailChip = det.isBabyFirst ? (isDutch ? '🌟 Eerste keer' : '🌟 Baby First') : (isDutch ? '🏆 Mijlpaal' : '🏆 Milestone');
  } else if (event.type === 'NOTE') {
    label = isDutch ? 'Notitie' : 'Journal Note';
  }

  return (
    <ItemRowTemplate
      event={event}
      label={label}
      detailChip={detailChip}
      language={language}
      onEdit={onEdit}
      onDelete={onDelete}
      categoryType={event.type.toLowerCase()}
    />
  );
}

/**
 * Base Item Row Template
 */
function ItemRowTemplate({
  event,
  label,
  detailChip,
  language = 'nl',
  onEdit,
  onDelete,
  onResume,
  isCurrentlyRunning = false,
  isResumable = false,
  categoryType = 'breast',
}) {
  const { openModal, preferences, t } = useApp();
  const [showLightbox, setShowLightbox] = useState(false);
  const isDutch = language === 'nl';
  const det = event.details || {};
  const photoUrl = event.photoUrl || det.photoUrl;

  const handleRowClick = (e) => {
    if (e.target.closest('button')) return;
    triggerHaptic('light', preferences?.haptics);
    openModal('EVENT_DETAIL', event);
  };

  return (
    <div
      className="grouped-item-row clickable"
      onClick={handleRowClick}
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
      <div className="grouped-item-left">
        <span className="grouped-item-time">{formatTime(event.beginDt, language)}</span>
        {photoUrl && (
          <button
            type="button"
            className="grouped-photo-thumb-btn"
            onClick={(e) => {
              e.stopPropagation();
              setShowLightbox(true);
            }}
            title={isDutch ? 'Foto bekijken' : 'View photo'}
            aria-label={isDutch ? 'Foto bekijken' : 'View photo'}
          >
            <img
              src={syncService.resolveMediaUrl(photoUrl)}
              alt={event.note || label}
              className="grouped-photo-thumb-img"
              loading="lazy"
            />
          </button>
        )}
        <div className="grouped-item-content">
          <div className="grouped-item-main">
            <span className="grouped-item-label">{label}</span>
            {detailChip && <span className="grouped-item-chip">{detailChip}</span>}
          </div>
          {event.note && <div className="grouped-item-note">{event.note}</div>}
          {det.caregiver && (
            <div className="grouped-caregiver-tag">
              <User size={10} />
              <span>{t('timeline.loggedBy', { name: det.caregiver })}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grouped-item-actions">
        {isCurrentlyRunning ? (
          <span className={`grouped-item-active-badge ${categoryType}`} title={t('timeline.activeTimer')}>
            <span className="timeline-pulse-dot" />
            <span className="grouped-active-text">{t('timeline.activeTimer')}</span>
          </span>
        ) : isResumable && onResume ? (
          <button
            type="button"
            className={`grouped-item-resume-btn ${categoryType}`}
            onClick={(e) => {
              e.stopPropagation();
              onResume(event);
            }}
            title={t('timeline.resumeSession')}
            aria-label={t('timeline.resumeSession')}
          >
            <Play size={10} fill="currentColor" />
            <span className="grouped-resume-text">{t('timeline.resume')}</span>
          </button>
        ) : null}
        <button
          className="grouped-item-btn"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(event.type, event);
          }}
          title={t('timeline.edit')}
          aria-label={t('timeline.edit')}
        >
          <Edit2 size={13} />
        </button>
        <button
          className="grouped-item-btn delete"
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm(t('timeline.deleteConfirm'))) {
              onDelete(event.id);
            }
          }}
          title={t('timeline.delete')}
          aria-label={t('timeline.delete')}
        >
          <Trash2 size={13} />
        </button>
      </div>

      {showLightbox && photoUrl && (
        <PhotoLightbox
          photoUrl={photoUrl}
          caption={event.note || label}
          timestamp={event.beginDt}
          language={language}
          onClose={() => setShowLightbox(false)}
        />
      )}
    </div>
  );
}
