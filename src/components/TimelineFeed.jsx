import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { toDateKey, formatDateHeading } from '../utils/formatters';
import { TimelineItem } from './TimelineItem';
import { Sparkles, Calendar, Filter } from 'lucide-react';

export function TimelineFeed({ limitDays = null }) {
  const { events, activeChildId, openModal } = useApp();
  const [activeFilter, setActiveFilter] = useState('ALL');

  // Filter by active child
  const childEvents = events.filter(e => !e.childKey || e.childKey === activeChildId);

  // Apply category filter
  const filteredEvents = childEvents.filter(e => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'FEEDS') return ['BREAST', 'BOTTLE', 'SOLIDS', 'COMBO'].includes(e.type);
    if (activeFilter === 'SLEEP') return e.type === 'SLEEP';
    if (activeFilter === 'DIAPER') return e.type === 'DIAPER';
    if (activeFilter === 'PUMP') return e.type === 'PUMP';
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
    { id: 'ALL', label: 'All' },
    { id: 'FEEDS', label: 'Feeds' },
    { id: 'SLEEP', label: 'Sleep' },
    { id: 'DIAPER', label: 'Diapers' },
    { id: 'PUMP', label: 'Pumping' },
    { id: 'OTHER', label: 'Other' },
  ];

  return (
    <section className="timeline-section">
      <div className="timeline-header">
        <div className="section-label" style={{ margin: 0 }}>
          <span>Activity Timeline</span>
        </div>

        {/* Category Filters */}
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
      </div>

      {dayKeys.length === 0 ? (
        <div className="timeline-empty">
          <div className="empty-icon-wrap">
            <Sparkles size={28} />
          </div>
          <h3>No activity recorded yet</h3>
          <p>
            Log your baby's feeds, naps, or diapers above, or import your existing Nara Baby history in Settings!
          </p>
          <button className="btn-primary" onClick={() => openModal('BREAST')}>
            Log First Feed
          </button>
        </div>
      ) : (
        dayKeys.map(dateKey => (
          <div key={dateKey} className="timeline-day-group">
            <div className="timeline-day-label">
              <Calendar size={14} color="var(--text-tertiary)" />
              <span>{formatDateHeading(dateKey)}</span>
            </div>

            {groupedByDay[dateKey].map(ev => (
              <TimelineItem key={ev.id} event={ev} />
            ))}
          </div>
        ))
      )}
    </section>
  );
}
