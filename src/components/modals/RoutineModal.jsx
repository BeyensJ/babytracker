import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Clock, X } from 'lucide-react';

export function RoutineModal() {
  const { activeModal, modalInitialData, closeModal, addEvent, updateEvent, t, language } = useApp();

  const isEditing = Boolean(modalInitialData && modalInitialData.id);

  const [routineName, setRoutineName] = useState(() => modalInitialData?.details?.routineName || 'TUMMYTIME');
  const [durationMin, setDurationMin] = useState(() => {
    if (modalInitialData?.durationMs) {
      return Math.round(modalInitialData.durationMs / 60000);
    }
    return '';
  });
  const [note, setNote] = useState(modalInitialData?.note || '');
  const [timeStr, setTimeStr] = useState(() => {
    const d = new Date(modalInitialData?.beginDt || Date.now());
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  if (activeModal !== 'ROUTINE') return null;

  const routines = language === 'nl' ? [
    { id: 'TUMMYTIME', label: '🐢 Buiktijd' },
    { id: 'BATH', label: '🛁 In badje' },
    { id: 'OUTDOOR', label: '🌳 Wandeling' },
    { id: 'PLAY', label: '🧸 Spelen & ontdekken' },
    { id: 'READ', label: '📖 Boekje voorlezen' },
    { id: 'NAILTRIM', label: '✂️ Nageltjes knippen' },
  ] : [
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
    const finalDurationMin = durationMin === '' ? 10 : (Math.max(1, Number(durationMin)) || 10);
    const durationMs = finalDurationMin * 60000;

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
            <h2>{isEditing ? t('routineModal.titleEdit') : t('routineModal.titleAdd')}</h2>
          </div>
          <button onClick={closeModal} style={{ color: 'var(--text-tertiary)' }} aria-label={t('common.close')}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-body">
            {/* Routine Selector */}
            <div className="form-group">
              <label className="form-label">{t('routineModal.activityType')}</label>
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
              <label className="form-label">{t('common.duration')} ({language === 'nl' ? 'minuten' : 'minutes'})</label>
              <input
                type="number"
                min="1"
                max="240"
                className="form-input"
                placeholder="10"
                value={durationMin}
                onChange={e => setDurationMin(e.target.value)}
              />
            </div>

            {/* Time */}
            <div className="form-group">
              <label className="form-label">{t('common.time')}</label>
              <input
                type="time"
                className="form-input"
                value={timeStr}
                onChange={e => setTimeStr(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div className="form-group">
              <label className="form-label">{t('common.notes')}</label>
              <textarea
                className="form-textarea"
                rows="2"
                placeholder={language === 'nl' ? 'Contrastkaarten gekeken, genoot van warm water...' : 'High contrast cards, smiled, loved the warm water...'}
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={closeModal}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn-primary" style={{ backgroundColor: 'var(--color-mustard)' }}>
              {isEditing ? t('routineModal.submitEdit') : t('routineModal.submitAdd')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
