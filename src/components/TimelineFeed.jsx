import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { toDateKey, formatDateHeading } from '../utils/formatters';
import { TimelineItem } from './TimelineItem';
import { GroupedDayActivity } from './GroupedDayActivity';
import { Sparkles, Calendar, Layers, Clock } from 'lucide-react';

export function TimelineFeed({ limitDays = null }) {
  const { events, activeChildId, openModal, language, t } = useApp();
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('grouped'); // 'grouped' | 'stream'
  const isDutch = language === 'nl';

  // Filter by active child
  const childEvents = events.filter(e => !e.childKey || e.childKey === activeChildId);

  // Apply category filter
  const filteredEvents = childEvents.filter(e => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'FEEDS') return ['BREAST', 'BOTTLE', 'SOLIDS', 'COMBO'].includes(e.type);
    if (activeFilter === 'SLEEP') return e.type === 'SLEEP';
    if (activeFilter === 'DIAPER') return e.type === 'DIAPER';
    if (activeFilter === 'PUMP') return e.type === 'PUMP';
    if (activeFilter === 'PHOTOS') return Boolean(e.photoUrl || e.details?.photoUrl);
    if (activeFilter === 'OTHER') return ['GROWTH', 'HEALTH', 'ROUTINE', 'MILESTONE', 'NOTE'].includes(e.type);
    return true;
  });

  // Group events by Date Key (YYYY-MM-DD)
  const groupedByDay = {};
  filteredEvents.forEach(ev => {
    const key = toDateKey(ev.beginDt);
    if (!groupedByDay[key]) groupedByDay[key] = [];
    groupedByDay[key].push(ev);
  });

  let dayKeys = Object.keys(groupedByDay).sort().reverse();
  if (limitDays) {
    dayKeys = dayKeys.slice(0, limitDays);
  }

  const filters = [
    { id: 'ALL', label: isDutch ? 'Alles' : 'All' },
    { id: 'FEEDS', label: isDutch ? 'Voeding' : 'Feeds' },
    { id: 'SLEEP', label: isDutch ? 'Slaap' : 'Sleep' },
    { id: 'DIAPER', label: isDutch ? 'Pampers' : 'Diapers' },
    { id: 'PUMP', label: isDutch ? 'Afkolven' : 'Pumping' },
    { id: 'PHOTOS', label: isDutch ? "Foto's 📸" : 'Photos 📸' },
    { id: 'OTHER', label: isDutch ? 'Overige' : 'Other' },
  ];

  return (
    <section className="timeline-section">
      <div className="timeline-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div className="section-label" style={{ margin: 0 }}>
            <span>{isDutch ? 'Activiteitenlogboek' : 'Activity Log'}</span>
          </div>

          {/* Grouped by Type vs Chronological Stream Toggle */}
          <div className="feed-view-mode-toggle">
            <button
              className={`feed-mode-btn ${viewMode === 'grouped' ? 'active' : ''}`}
              onClick={() => setViewMode('grouped')}
              title={isDutch ? 'Groepeer per type (Voeding, Slaap, Pampers, Overige)' : 'Group entries by type (Feeds, Sleep, Diapers, Other)'}
            >
              <Layers size={14} />
              <span>{isDutch ? 'Gegroepeerd' : 'Grouped'}</span>
            </button>
            <button
              className={`feed-mode-btn ${viewMode === 'stream' ? 'active' : ''}`}
              onClick={() => setViewMode('stream')}
              title={isDutch ? 'Chronologische tijdlijnweergave' : 'Chronological timeline stream'}
            >
              <Clock size={14} />
              <span>{isDutch ? 'Tijdlijn' : 'Stream'}</span>
            </button>
          </div>
        </div>

        {/* Category Filters (visible when in stream mode or filtering) */}
        {viewMode === 'stream' && (
          <div className="timeline-filters">
            {filters.map(f => (
              <button
                key={f.id}
                className={`filter-chip ${activeFilter === f.id ? 'active' : ''}`}
                onClick={() => setActiveFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {dayKeys.length === 0 ? (
        <div className="timeline-empty">
          <div className="empty-icon-wrap">
            <Sparkles size={28} />
          </div>
          <h3>{isDutch ? 'Nog geen activiteiten gelogd' : 'No activity recorded yet'}</h3>
          <p>
            {isDutch
              ? 'Registreer een voeding, dutje of pamper hierboven, of importeer bestaande gegevens bij Instellingen!'
              : "Log your baby's feeds, naps, or diapers above, or import your existing history in Settings!"}
          </p>
          <button className="btn-primary" onClick={() => openModal('BREAST')}>
            {isDutch ? 'Eerste activiteit loggen' : 'Log First Feed'}
          </button>
        </div>
      ) : (
        dayKeys.map((dateKey, dayIdx) => (
          <div key={dateKey} className="timeline-day-group">
            <div className="timeline-day-label">
              <Calendar size={14} color="var(--text-tertiary)" />
              <span>{formatDateHeading(dateKey, language)}</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 400 }}>
                ({groupedByDay[dateKey].length} {isDutch ? (groupedByDay[dateKey].length === 1 ? 'activiteit' : 'activiteiten') : (groupedByDay[dateKey].length === 1 ? 'entry' : 'entries')})
              </span>
            </div>

            {viewMode === 'grouped' ? (
              <GroupedDayActivity
                dateKey={dateKey}
                events={groupedByDay[dateKey]}
                defaultExpanded={dayIdx === 0} // expand first/today by default
              />
            ) : (
              groupedByDay[dateKey].map(ev => (
                <TimelineItem key={ev.id} event={ev} />
              ))
            )}
          </div>
        ))
      )}
    </section>
  );
}
