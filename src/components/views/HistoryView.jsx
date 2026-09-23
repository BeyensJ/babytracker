import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { toDateKey, formatDateHeading } from '../../utils/formatters';
import { TimelineItem } from '../TimelineItem';
import { Search, Calendar, Filter, FileText } from 'lucide-react';

export function HistoryView() {
  const { events, activeChildId, t, language } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [selectedDate, setSelectedDate] = useState('');

  // Filter events by child
  const childEvents = events.filter(e => !e.childKey || e.childKey === activeChildId);

  // Apply filters and search
  const filteredEvents = childEvents.filter(ev => {
    // Category filter
    if (activeFilter === 'FEEDS' && !['BREAST', 'BOTTLE', 'SOLIDS', 'COMBO'].includes(ev.type)) return false;
    if (activeFilter === 'SLEEP' && ev.type !== 'SLEEP') return false;
    if (activeFilter === 'DIAPER' && ev.type !== 'DIAPER') return false;
    if (activeFilter === 'PUMP' && ev.type !== 'PUMP') return false;
    if (activeFilter === 'GROWTH' && ev.type !== 'GROWTH') return false;
    if (activeFilter === 'HEALTH' && ev.type !== 'HEALTH') return false;
    if (activeFilter === 'MILESTONE' && ev.type !== 'MILESTONE') return false;

    // Date filter
    if (selectedDate) {
      const evDateKey = toDateKey(ev.beginDt);
      if (evDateKey !== selectedDate) return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const detStr = JSON.stringify(ev.details || {}).toLowerCase();
      const noteStr = (ev.note || '').toLowerCase();
      const typeStr = ev.type.toLowerCase();
      if (!detStr.includes(q) && !noteStr.includes(q) && !typeStr.includes(q)) {
        return false;
      }
    }

    return true;
  });

  // Group by day
  const groupedByDay = {};
  filteredEvents.forEach(ev => {
    const key = toDateKey(ev.beginDt);
    if (!groupedByDay[key]) groupedByDay[key] = [];
    groupedByDay[key].push(ev);
  });

  const dayKeys = Object.keys(groupedByDay).sort().reverse();

  const filters = [
    { id: 'ALL', label: t('history.filterAll') },
    { id: 'FEEDS', label: t('categories.feeding') },
    { id: 'SLEEP', label: t('categories.SLEEP') },
    { id: 'DIAPER', label: t('categories.DIAPER') },
    { id: 'PUMP', label: t('categories.PUMP') },
    { id: 'GROWTH', label: t('categories.GROWTH') },
    { id: 'HEALTH', label: t('categories.HEALTH') },
    { id: 'MILESTONE', label: t('categories.firsts') },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2>{t('history.title')}</h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {t('history.recordsCount', { count: filteredEvents.length })}
          </span>
        </div>
      </div>

      {/* Search and Date Filter Bar */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={16} color="var(--text-tertiary)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '2.2rem', paddingRight: '0.8rem' }}
            placeholder={t('history.searchPlaceholder')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <input
          type="date"
          className="form-input"
          style={{ width: 'auto' }}
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
        />

        {selectedDate && (
          <button
            className="btn-secondary"
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
            onClick={() => setSelectedDate('')}
          >
            {t('history.clearDate')}
          </button>
        )}
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

      {/* Event Feed */}
      {dayKeys.length === 0 ? (
        <div className="timeline-empty">
          <FileText size={32} color="var(--text-tertiary)" />
          <h3>{t('history.noEventsTitle')}</h3>
          <p>{t('history.noEventsDesc')}</p>
        </div>
      ) : (
        dayKeys.map(dateKey => (
          <div key={dateKey} className="timeline-day-group">
            <div className="timeline-day-label">
              <Calendar size={14} color="var(--text-tertiary)" />
              <span>{formatDateHeading(dateKey, language)}</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 400 }}>
                {t('history.entriesCount', { count: groupedByDay[dateKey].length })}
              </span>
            </div>

            {groupedByDay[dateKey].map(ev => (
              <TimelineItem key={ev.id} event={ev} />
            ))}
          </div>
        ))
      )}
    </div>
  );
}
