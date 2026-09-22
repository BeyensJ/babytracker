import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatTime, formatDurationMs, formatVolume, formatWeight, formatLength, formatTemp } from '../utils/formatters';
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
  Pipette,
} from 'lucide-react';

export function GroupedDayActivity({ dateKey, events, defaultExpanded = true }) {
  const { preferences, openModal, deleteEvent } = useApp();
  const isMetric = preferences.weightUnit === 'kg';
  const isMetricVol = preferences.volumeUnit === 'ml';

  // Group events into 4 buckets
  const feeds = [];
  const sleeps = [];
  const diapers = [];
  const others = [];

  events.forEach(ev => {
    if (['BREAST', 'BOTTLE', 'SOLIDS', 'COMBO'].includes(ev.type)) {
      feeds.push(ev);
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

  let feedSummaryText = `${feeds.length} Feed${feeds.length === 1 ? '' : 's'}`;
  const feedSubParts = [];
  if (totalNursingMs > 0) feedSubParts.push(`${formatDurationMs(totalNursingMs)} Nursing`);
  if (totalBottleVol > 0) feedSubParts.push(formatVolume(totalBottleVol, preferences.volumeUnit));
  if (solidsCount > 0) feedSubParts.push(`${solidsCount} Solid${solidsCount === 1 ? '' : 's'}`);
  if (feedSubParts.length > 0) {
    feedSummaryText += ` · ${feedSubParts.join(', ')}`;
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

  let sleepSummaryText = `${formatDurationMs(totalSleepMs)} Total`;
  const sleepBreakdown = [];
  if (napCount > 0) sleepBreakdown.push(`${napCount} Nap${napCount === 1 ? '' : 's'}`);
  if (nightCount > 0) sleepBreakdown.push(`${nightCount} Night`);
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

  let diaperSummaryText = `${diapers.length} Change${diapers.length === 1 ? '' : 's'}`;
  const diaperParts = [];
  if (wetCount > 0) diaperParts.push(`${wetCount} Wet`);
  if (dirtyCount > 0) diaperParts.push(`${dirtyCount} Dirty`);
  if (diaperParts.length > 0) {
    diaperSummaryText += ` · ${diaperParts.join(', ')}`;
  }
  if (blowoutCount > 0) {
    diaperSummaryText += ` (⚠️ ${blowoutCount} Blowout)`;
  }

  return (
    <div className="grouped-day-container">
      {/* 1. Feeds Section */}
      {feeds.length > 0 && (
        <CategoryCard
          categoryKey="feeds"
          title="Feeding"
          icon={Utensils}
          colorClass="feed"
          count={feeds.length}
          summaryText={feedSummaryText}
          events={feeds}
          defaultOpen={defaultExpanded}
          renderItem={(ev) => <FeedItemRow key={ev.id} event={ev} preferences={preferences} onEdit={openModal} onDelete={deleteEvent} />}
        />
      )}

      {/* 2. Sleep Section */}
      {sleeps.length > 0 && (
        <CategoryCard
          categoryKey="sleep"
          title="Sleep"
          icon={Moon}
          colorClass="sleep"
          count={sleeps.length}
          summaryText={sleepSummaryText}
          events={sleeps}
          defaultOpen={defaultExpanded}
          renderItem={(ev) => <SleepItemRow key={ev.id} event={ev} onEdit={openModal} onDelete={deleteEvent} />}
        />
      )}

      {/* 3. Diapers Section */}
      {diapers.length > 0 && (
        <CategoryCard
          categoryKey="diaper"
          title="Diapers"
          icon={Sparkles}
          colorClass="diaper"
          count={diapers.length}
          summaryText={diaperSummaryText}
          events={diapers}
          defaultOpen={defaultExpanded}
          renderItem={(ev) => <DiaperItemRow key={ev.id} event={ev} onEdit={openModal} onDelete={deleteEvent} />}
        />
      )}

      {/* 4. Other Activities Section */}
      {others.length > 0 && (
        <CategoryCard
          categoryKey="other"
          title="Other Activities"
          icon={Layers}
          colorClass="other"
          count={others.length}
          summaryText={`${others.length} Logged Item${others.length === 1 ? '' : 's'}`}
          events={others}
          defaultOpen={defaultExpanded}
          renderItem={(ev) => <OtherItemRow key={ev.id} event={ev} preferences={preferences} onEdit={openModal} onDelete={deleteEvent} />}
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
function FeedItemRow({ event, preferences, onEdit, onDelete }) {
  const det = event.details || {};
  let label = 'Feed';
  let detailChip = '';

  if (event.type === 'BREAST') {
    label = 'Nurse';
    const side = (det.side || '').toUpperCase();
    if (side === 'BOTH' || (det.leftDurationMs > 0 && det.rightDurationMs > 0)) {
      detailChip = `Both (L: ${formatDurationMs(det.leftDurationMs)}, R: ${formatDurationMs(det.rightDurationMs)})`;
    } else if (side.includes('LEFT') || det.leftDurationMs > 0) {
      const dur = det.leftDurationMs || event.durationMs;
      detailChip = dur ? `Left · ${formatDurationMs(dur)}` : 'Left Side';
    } else if (side.includes('RIGHT') || det.rightDurationMs > 0) {
      const dur = det.rightDurationMs || event.durationMs;
      detailChip = dur ? `Right · ${formatDurationMs(dur)}` : 'Right Side';
    } else {
      detailChip = formatDurationMs(event.durationMs) || 'Nursing';
    }
  } else if (event.type === 'BOTTLE') {
    label = 'Bottle';
    const volStr = det.volumeFloz ? formatVolume(det.volumeFloz, preferences.volumeUnit) : '';
    const milkStr = det.milkType === 'FORMULA' ? (det.formulaName || 'Formula') : 'Breast Milk';
    detailChip = [volStr, milkStr].filter(Boolean).join(' · ');
  } else if (event.type === 'SOLIDS') {
    label = 'Solids';
    detailChip = [det.food || 'Meal', det.reaction ? `Reaction: ${det.reaction}` : ''].filter(Boolean).join(' · ');
  } else if (event.type === 'COMBO') {
    label = 'Combo Feed';
    detailChip = [
      det.volumeFloz ? formatVolume(det.volumeFloz, preferences.volumeUnit) : '',
      formatDurationMs(event.durationMs),
    ].filter(Boolean).join(' · ');
  }

  return (
    <ItemRowTemplate
      event={event}
      label={label}
      detailChip={detailChip}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
}

/**
 * Sleep Item Row
 */
function SleepItemRow({ event, onEdit, onDelete }) {
  const det = event.details || {};
  const isOngoing = !event.durationMs && !event.endDt;
  const isNight = det.sleepType === 'NIGHT';
  const label = isNight ? 'Night Sleep' : 'Nap';
  const durationStr = isOngoing
    ? 'Sleeping now...'
    : formatDurationMs(event.durationMs || (event.endDt - event.beginDt));

  return (
    <ItemRowTemplate
      event={event}
      label={label}
      detailChip={durationStr}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
}

/**
 * Diaper Item Row
 */
function DiaperItemRow({ event, onEdit, onDelete }) {
  const det = event.details || {};
  const parts = [];
  if (det.pee) parts.push('Wet');
  if (det.poop) parts.push('Dirty');
  if (det.dry) parts.push('Dry');

  let desc = parts.join(' & ') || 'Diaper';
  if (det.blowout) desc += ' ⚠️ Blowout';
  if (det.rash) desc += ' (Rash)';

  return (
    <ItemRowTemplate
      event={event}
      label="Diaper"
      detailChip={desc}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
}

/**
 * Other Activities Row (Pump, Growth, Health, Routine, Milestone, Note)
 */
function OtherItemRow({ event, preferences, onEdit, onDelete }) {
  const det = event.details || {};
  let label = 'Activity';
  let detailChip = '';

  if (event.type === 'PUMP') {
    label = 'Pumping';
    detailChip = det.totalFloz
      ? formatVolume(det.totalFloz, preferences.volumeUnit)
      : formatDurationMs(event.durationMs);
  } else if (event.type === 'GROWTH') {
    label = 'Growth';
    const isMetric = preferences.weightUnit === 'kg';
    const parts = [];
    if (det.weightKg && isMetric) parts.push(`${det.weightKg} kg`);
    else if (det.weightLb) parts.push(formatWeight(det.weightLb, preferences.weightUnit));
    if (det.heightCm && preferences.lengthUnit === 'cm') parts.push(`${det.heightCm} cm`);
    detailChip = parts.join(' • ');
  } else if (event.type === 'HEALTH') {
    label = det.medicineName ? 'Medication' : (det.temperatureC || det.temperatureF ? 'Temperature' : 'Health');
    detailChip = det.medicineName || (det.temperatureC ? `${det.temperatureC}°C` : '');
  } else if (event.type === 'ROUTINE') {
    label = det.routineName || 'Routine';
    detailChip = formatDurationMs(event.durationMs);
  } else if (event.type === 'MILESTONE') {
    label = det.milestoneName || 'Milestone';
    detailChip = det.isBabyFirst ? '🌟 Baby First' : '🏆 Milestone';
  } else if (event.type === 'NOTE') {
    label = 'Journal Note';
  }

  return (
    <ItemRowTemplate
      event={event}
      label={label}
      detailChip={detailChip}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
}

/**
 * Base Item Row Template
 */
function ItemRowTemplate({ event, label, detailChip, onEdit, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const det = event.details || {};

  return (
    <div className="grouped-item-row">
      <div className="grouped-item-left">
        <span className="grouped-item-time">{formatTime(event.beginDt)}</span>
        <div className="grouped-item-content">
          <div className="grouped-item-main">
            <span className="grouped-item-label">{label}</span>
            {detailChip && <span className="grouped-item-chip">{detailChip}</span>}
          </div>
          {event.note && <div className="grouped-item-note">{event.note}</div>}
          {det.caregiver && (
            <div className="grouped-caregiver-tag">
              <User size={10} />
              <span>{det.caregiver}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grouped-item-actions">
        <button
          className="grouped-item-btn"
          onClick={() => onEdit(event.type, event)}
          title="Edit"
        >
          <Edit2 size={13} />
        </button>
        <button
          className="grouped-item-btn delete"
          onClick={() => {
            if (window.confirm('Delete this entry?')) {
              onDelete(event.id);
            }
          }}
          title="Delete"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
