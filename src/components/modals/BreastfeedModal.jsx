import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Heart, X, Clock } from 'lucide-react';
import { TimerStartCard } from '../TimerStartCard';

export function BreastfeedModal() {
  const { activeModal, modalInitialData, closeModal, addEvent, updateEvent, startBreastTimer } = useApp();

  const isEditing = Boolean(modalInitialData && modalInitialData.id);

  const [side, setSide] = useState(modalInitialData?.details?.side || modalInitialData?.side || 'LEFT');
  const [leftMinutes, setLeftMinutes] = useState(() => {
    const ms = modalInitialData?.details?.leftDurationMs || modalInitialData?.leftDurationMs || 0;
    return ms > 0 ? Math.round(ms / 60000) : (side === 'LEFT' || side === 'BOTH' ? 10 : 0);
  });
  const [rightMinutes, setRightMinutes] = useState(() => {
    const ms = modalInitialData?.details?.rightDurationMs || modalInitialData?.rightDurationMs || 0;
    return ms > 0 ? Math.round(ms / 60000) : (side === 'RIGHT' || side === 'BOTH' ? 10 : 0);
  });
  const [note, setNote] = useState(modalInitialData?.note || '');
  const [timeStr, setTimeStr] = useState(() => {
    const d = new Date(modalInitialData?.beginDt || Date.now());
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  if (activeModal !== 'BREAST') return null;

  const handleSave = (e) => {
    e.preventDefault();
    const [h, m] = timeStr.split(':').map(Number);
    const dateObj = new Date(modalInitialData?.beginDt || Date.now());
    dateObj.setHours(h, m, 0, 0);
    const beginDt = dateObj.getTime();

    const leftMs = Number(leftMinutes) * 60000;
    const rightMs = Number(rightMinutes) * 60000;
    const totalDurationMs = leftMs + rightMs;

    const eventPayload = {
      type: 'BREAST',
      beginDt,
      endDt: beginDt + totalDurationMs,
      durationMs: totalDurationMs,
      details: {
        side,
        leftDurationMs: leftMs,
        rightDurationMs: rightMs,
      },
      note,
    };

    if (isEditing) {
      updateEvent(modalInitialData.id, eventPayload);
    } else {
      addEvent(eventPayload);
    }

    closeModal();
  };

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-title-icon" style={{ backgroundColor: 'var(--color-terracotta-light)', color: 'var(--color-terracotta)' }}>
              <Heart size={18} />
            </div>
            <h2>{isEditing ? 'Edit Nursing' : 'Log Breastfeed'}</h2>
          </div>
          <button onClick={closeModal} style={{ color: 'var(--text-tertiary)' }} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-body">
            {/* Start Live Timer with Starting Time Option (if not editing) */}
            {!isEditing && (
              <TimerStartCard
                title="Start Nursing Timer"
                subtitle="Track live nursing with custom start time"
                icon={Heart}
                iconColor="var(--color-terracotta)"
                iconBg="var(--color-terracotta-light)"
                actions={[
                  {
                    id: 'start-timer-left',
                    label: 'Left',
                    side: 'LEFT',
                    className: 'btn-primary',
                    style: { padding: '0.4rem 0.85rem', fontSize: '0.78rem' },
                  },
                  {
                    id: 'start-timer-right',
                    label: 'Right',
                    side: 'RIGHT',
                    className: 'btn-primary',
                    style: { padding: '0.4rem 0.85rem', fontSize: '0.78rem', backgroundColor: 'var(--color-caramel)' },
                  },
                ]}
                onStart={(startTs, action) => {
                  closeModal();
                  startBreastTimer(action.side, startTs);
                }}
              />
            )}

            {/* Side Selector */}
            <div className="form-group">
              <label className="form-label">Breast Side</label>
              <div className="segmented-control">
                {['LEFT', 'BOTH', 'RIGHT'].map(s => (
                  <button
                    key={s}
                    type="button"
                    className={`segmented-btn ${side === s ? 'active' : ''}`}
                    onClick={() => {
                      setSide(s);
                      if (s === 'LEFT' && rightMinutes > 0) setRightMinutes(0);
                      if (s === 'RIGHT' && leftMinutes > 0) setLeftMinutes(0);
                    }}
                  >
                    {s === 'LEFT' ? 'Left Breast' : s === 'RIGHT' ? 'Right Breast' : 'Both Sides'}
                  </button>
                ))}
              </div>
            </div>

            {/* Durations */}
            <div style={{ display: 'grid', gridTemplateColumns: side === 'BOTH' ? '1fr 1fr' : '1fr', gap: '0.75rem' }}>
              {(side === 'LEFT' || side === 'BOTH') && (
                <div className="form-group">
                  <label className="form-label">Left Side (minutes)</label>
                  <input
                    type="number"
                    min="0"
                    max="180"
                    className="form-input"
                    value={leftMinutes}
                    onChange={e => setLeftMinutes(e.target.value)}
                  />
                </div>
              )}

              {(side === 'RIGHT' || side === 'BOTH') && (
                <div className="form-group">
                  <label className="form-label">Right Side (minutes)</label>
                  <input
                    type="number"
                    min="0"
                    max="180"
                    className="form-input"
                    value={rightMinutes}
                    onChange={e => setRightMinutes(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Time of Feed */}
            <div className="form-group">
              <label className="form-label">Time</label>
              <input
                type="time"
                className="form-input"
                value={timeStr}
                onChange={e => setTimeStr(e.target.value)}
              />
            </div>

            {/* Note */}
            <div className="form-group">
              <label className="form-label">Notes (optional)</label>
              <textarea
                className="form-textarea"
                rows="2"
                placeholder="Good latch, sleepy, etc."
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {isEditing ? 'Save Changes' : 'Log Feed'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
