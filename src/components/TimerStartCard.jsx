import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Clock, Play } from 'lucide-react';
import { formatTimerClock } from '../utils/formatters';

/**
 * Reusable component for starting a live timer with custom start time options:
 * - "Now" (default 0m offset, starts at exact current second)
 * - Quick presets: 5m ago, 10m ago, 15m ago, 30m ago (accurate to the second)
 * - Exact time input (HH:MM or HH:MM:SS)
 */
export function TimerStartCard({
  title,
  subtitle,
  icon: Icon,
  iconColor = 'var(--color-terracotta)',
  iconBg = 'var(--color-terracotta-light)',
  actions = [], // e.g. [{ id, label, side, className, style }]
  onStart, // (startTs, action) => void
}) {
  const { language } = useApp();
  const isDutch = language === 'nl';

  const defaultTitle = isDutch ? 'Live timer starten' : 'Start Live Timer';
  const defaultSubtitle = isDutch ? 'Volg in real-time' : 'Track in real time';

  const formatCurrentTime = (date = new Date()) => {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const [offsetMinutes, setOffsetMinutes] = useState(0);
  const [timeStr, setTimeStr] = useState(() => formatCurrentTime());

  const handleSelectOffset = (mins) => {
    setOffsetMinutes(mins);
    if (mins === 0) {
      setTimeStr(formatCurrentTime());
    } else {
      const target = new Date(Date.now() - mins * 60000);
      setTimeStr(formatCurrentTime(target));
    }
  };

  const handleManualTimeChange = (e) => {
    const val = e.target.value;
    setTimeStr(val);
    setOffsetMinutes(null);
  };

  const getComputedStartTs = () => {
    if (offsetMinutes === 0) {
      return Date.now();
    }
    if (offsetMinutes !== null && offsetMinutes > 0) {
      return Date.now() - offsetMinutes * 60000;
    }
    if (!timeStr) return Date.now();
    const parts = timeStr.split(':').map(Number);
    const h = parts[0] || 0;
    const m = parts[1] || 0;
    const s = parts.length > 2 ? parts[2] : 0;
    const d = new Date();
    d.setHours(h, m, s, 0);
    if (d.getTime() > Date.now() + 60000) {
      d.setDate(d.getDate() - 1);
    }
    return d.getTime();
  };

  const handleTrigger = (action) => {
    const startTs = getComputedStartTs();
    if (onStart) {
      onStart(startTs, action);
    }
  };

  const elapsedMs = Math.max(0, Date.now() - getComputedStartTs());

  return (
    <div className="timer-start-card">
      {/* Card Header */}
      <div className="timer-start-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {Icon && (
            <div className="timer-start-icon" style={{ backgroundColor: iconBg, color: iconColor }}>
              <Icon size={16} />
            </div>
          )}
          <div>
            <div className="timer-start-title">{title || defaultTitle}</div>
            <div className="timer-start-subtitle">{subtitle || defaultSubtitle}</div>
          </div>
        </div>
      </div>

      {/* Starting Time Selection Controls */}
      <div className="timer-start-controls">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            <Clock size={13} />
            <span>{isDutch ? 'Gestart om:' : 'Started at:'}</span>
            <input
              type="time"
              step="1"
              className="timer-time-input"
              value={timeStr}
              onChange={handleManualTimeChange}
              title={isDutch ? 'Exacte starttijd instellen (uu:mm:ss)' : 'Set exact start time (hh:mm:ss)'}
              id="timer-start-time-input"
            />
          </div>

          {elapsedMs >= 1000 ? (
            <span className="timer-start-preview-pill active">
              {isDutch ? `Start met ${formatTimerClock(elapsedMs)} verstreken` : `Starts with ${formatTimerClock(elapsedMs)} elapsed`}
            </span>
          ) : (
            <span className="timer-start-preview-pill">
              {isDutch ? 'Start nu (00:00)' : 'Starts now (00:00)'}
            </span>
          )}
        </div>

        {/* Quick Offset Presets */}
        <div className="timer-quick-pills">
          <button
            type="button"
            className={`timer-quick-pill ${offsetMinutes === 0 ? 'active' : ''}`}
            onClick={() => handleSelectOffset(0)}
          >
            {isDutch ? 'Nu' : 'Now'}
          </button>
          <button
            type="button"
            className={`timer-quick-pill ${offsetMinutes === 5 ? 'active' : ''}`}
            onClick={() => handleSelectOffset(5)}
          >
            {isDutch ? '5m geleden' : '5m ago'}
          </button>
          <button
            type="button"
            className={`timer-quick-pill ${offsetMinutes === 10 ? 'active' : ''}`}
            onClick={() => handleSelectOffset(10)}
          >
            {isDutch ? '10m geleden' : '10m ago'}
          </button>
          <button
            type="button"
            className={`timer-quick-pill ${offsetMinutes === 15 ? 'active' : ''}`}
            onClick={() => handleSelectOffset(15)}
          >
            {isDutch ? '15m geleden' : '15m ago'}
          </button>
          <button
            type="button"
            className={`timer-quick-pill ${offsetMinutes === 30 ? 'active' : ''}`}
            onClick={() => handleSelectOffset(30)}
          >
            {isDutch ? '30m geleden' : '30m ago'}
          </button>
        </div>
      </div>

      {/* Trigger Action Buttons */}
      <div className="timer-start-actions">
        {actions.map((act, i) => (
          <button
            key={i}
            type="button"
            className={act.className || 'btn-primary'}
            style={act.style}
            onClick={() => handleTrigger(act)}
            id={act.id}
          >
            <Play size={13} style={{ marginRight: 4 }} />
            {act.label}
          </button>
        ))}
      </div>
    </div>
  );
}
