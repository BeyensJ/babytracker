import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Clock, X } from 'lucide-react';

export function RoutineModal() {
  const { activeModal, modalInitialData, closeModal, addEvent, updateEvent } = useApp();

  const isEditing = Boolean(modalInitialData && modalInitialData.id);

  const [routineName, setRoutineName] = useState(() => modalInitialData?.details?.routineName || 'TUMMYTIME');
  const [durationMin, setDurationMin] = useState(() => {
    const ms = modalInitialData?.durationMs || 10 * 60 * 1000;
    return Math.round(ms / 60000);
  });
  const [note, setNote] = useState(modalInitialData?.note || '');
  const [timeStr, setTimeStr] = useState(() => {
    const d = new Date(modalInitialData?.beginDt || Date.now());
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  if (activeModal !== 'ROUTINE') return null;

  const routines = [
    { id: 'TUMMYTIME', label: '🐢 Tummy Time' },
    { id: 'BATH', label: '🛁 Bath Time' },
    { id: 'OUTDOOR', label: '🌳 Outdoor Walk' },
    { id: 'PLAY', label: '🧸 Active Play' },
    { id: 'READ', label: '📖 Story Reading' },
    { id: 'NAILTRIM', label: '✂️ Nail Trim' },
  ];

  const handleSave = (e) => {
    e.preventDefault();
    const [h, m] = timeStr.split(':').map(Number);
    const dateObj = new Date(modalInitialData?.beginDt || Date.now());
    dateObj.setHours(h, m, 0, 0);
    const beginDt = dateObj.getTime();
    const durationMs = Number(durationMin) * 60000;

    const eventPayload = {
      type: 'ROUTINE',
      beginDt,
      endDt: beginDt + durationMs,
      durationMs,
      details: { routineName },
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
            <div className="modal-title-icon" style={{ backgroundColor: 'var(--color-mustard-light)', color: 'var(--color-mustard)' }}>
              <Clock size={18} />
            </div>
            <h2>{isEditing ? 'Edit Routine' : 'Log Routine'}</h2>
          </div>
          <button onClick={closeModal} style={{ color: 'var(--text-tertiary)' }} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-body">
            {/* Routine Selector */}
            <div className="form-group">
              <label className="form-label">Activity</label>
              <div className="chip-grid">
                {routines.map(r => (
                  <button
                    key={r.id}
                    type="button"
                    className={`chip-btn ${routineName === r.id ? 'selected' : ''}`}
                    onClick={() => setRoutineName(r.id)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div className="form-group">
              <label className="form-label">Duration (minutes)</label>
              <input
                type="number"
                min="1"
                max="240"
                className="form-input"
                value={durationMin}
                onChange={e => setDurationMin(e.target.value)}
              />
            </div>

            {/* Time */}
            <div className="form-group">
              <label className="form-label">Time</label>
              <input
                type="time"
                className="form-input"
                value={timeStr}
                onChange={e => setTimeStr(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div className="form-group">
              <label className="form-label">Notes (optional)</label>
              <textarea
                className="form-textarea"
                rows="2"
                placeholder="High contrast cards, smiled, loved the warm water..."
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" style={{ backgroundColor: 'var(--color-mustard)' }}>
              {isEditing ? 'Save Changes' : 'Log Routine'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
