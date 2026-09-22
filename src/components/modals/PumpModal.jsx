import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Pipette, X } from 'lucide-react';
import { TimerStartCard } from '../TimerStartCard';

export function PumpModal() {
  const { activeModal, modalInitialData, closeModal, addEvent, updateEvent, preferences, startPumpTimer } = useApp();

  const isEditing = Boolean(modalInitialData && modalInitialData.id);
  const isMetric = preferences.volumeUnit === 'ml';

  const [leftFloz, setLeftFloz] = useState(() => modalInitialData?.details?.leftFloz || 2.0);
  const [rightFloz, setRightFloz] = useState(() => modalInitialData?.details?.rightFloz || 2.0);
  const [durationMin, setDurationMin] = useState(() => {
    const ms = modalInitialData?.durationMs || 15 * 60 * 1000;
    return Math.round(ms / 60000);
  });
  const [note, setNote] = useState(modalInitialData?.note || '');
  const [timeStr, setTimeStr] = useState(() => {
    const d = new Date(modalInitialData?.beginDt || Date.now());
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  if (activeModal !== 'PUMP') return null;

  const totalFloz = (parseFloat(leftFloz) || 0) + (parseFloat(rightFloz) || 0);

  const handleSave = (e) => {
    e.preventDefault();
    const [h, m] = timeStr.split(':').map(Number);
    const dateObj = new Date(modalInitialData?.beginDt || Date.now());
    dateObj.setHours(h, m, 0, 0);
    const beginDt = dateObj.getTime();
    const durationMs = Number(durationMin) * 60000;

    const eventPayload = {
      type: 'PUMP',
      beginDt,
      endDt: beginDt + durationMs,
      durationMs,
      details: {
        leftFloz: Number(leftFloz) || 0,
        rightFloz: Number(rightFloz) || 0,
        totalFloz: Math.round(totalFloz * 10) / 10,
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
            <div className="modal-title-icon" style={{ backgroundColor: 'var(--color-berry-light)', color: 'var(--color-berry)' }}>
              <Pipette size={18} />
            </div>
            <h2>{isEditing ? 'Edit Pump Session' : 'Log Pumping'}</h2>
          </div>
          <button onClick={closeModal} style={{ color: 'var(--text-tertiary)' }} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-body">
            {!isEditing && (
              <TimerStartCard
                title="Active Pumping Session"
                subtitle="Track live pumping with custom start time"
                icon={Pipette}
                iconColor="var(--color-berry)"
                iconBg="var(--color-berry-light)"
                actions={[
                  {
                    id: 'start-timer-pump',
                    label: 'Start Pump Timer',
                    className: 'btn-primary',
                    style: { padding: '0.45rem 1rem', fontSize: '0.8rem', backgroundColor: 'var(--color-berry)' },
                  },
                ]}
                onStart={(startTs) => {
                  closeModal();
                  startPumpTimer('BOTH', startTs);
                }}
              />
            )}

            {/* Total Volume Preview */}
            <div style={{ backgroundColor: 'var(--color-berry-light)', color: 'var(--color-berry)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Total Expressed</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '0.15rem' }}>
                {isMetric ? `${Math.round(totalFloz * 29.5735)} mL` : `${Math.round(totalFloz * 10) / 10} oz`}
              </div>
            </div>

            {/* Left & Right Volumes */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Left Side ({isMetric ? 'mL' : 'oz'})</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  className="form-input"
                  value={leftFloz}
                  onChange={e => setLeftFloz(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Right Side ({isMetric ? 'mL' : 'oz'})</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  className="form-input"
                  value={rightFloz}
                  onChange={e => setRightFloz(e.target.value)}
                />
              </div>
            </div>

            {/* Duration */}
            <div className="form-group">
              <label className="form-label">Duration (minutes)</label>
              <input
                type="number"
                min="1"
                max="120"
                className="form-input"
                value={durationMin}
                onChange={e => setDurationMin(e.target.value)}
              />
            </div>

            {/* Time of Pump */}
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
                placeholder="Stored in fridge bag, morning pump..."
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" style={{ backgroundColor: 'var(--color-berry)' }}>
              {isEditing ? 'Save Changes' : 'Log Pump'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
