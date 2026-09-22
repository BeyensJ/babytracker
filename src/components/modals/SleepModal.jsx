import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatDurationMs } from '../../utils/formatters';
import { Moon, X } from 'lucide-react';
import { TimerStartCard } from '../TimerStartCard';

export function SleepModal() {
  const { activeModal, modalInitialData, closeModal, addEvent, updateEvent, startSleepTimer, t, language } = useApp();

  const isEditing = Boolean(modalInitialData && modalInitialData.id);

  const [sleepType, setSleepType] = useState(() => {
    return modalInitialData?.details?.sleepType || 'NAP';
  });

  const [startDate, setStartDate] = useState(() => {
    const d = new Date(modalInitialData?.beginDt || Date.now() - 60 * 60 * 1000);
    return d.toISOString().split('T')[0];
  });

  const [startTime, setStartTime] = useState(() => {
    const d = new Date(modalInitialData?.beginDt || Date.now() - 60 * 60 * 1000);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  const [endDate, setEndDate] = useState(() => {
    const d = new Date(modalInitialData?.endDt || Date.now());
    return d.toISOString().split('T')[0];
  });

  const [endTime, setEndTime] = useState(() => {
    const d = new Date(modalInitialData?.endDt || Date.now());
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  const [note, setNote] = useState(modalInitialData?.note || '');

  if (activeModal !== 'SLEEP') return null;

  // Calculate duration preview
  const startTs = new Date(`${startDate}T${startTime}`).getTime();
  const endTs = new Date(`${endDate}T${endTime}`).getTime();
  const durationMs = Math.max(0, endTs - startTs);

  const handleSave = (e) => {
    e.preventDefault();
    const eventPayload = {
      type: 'SLEEP',
      beginDt: startTs,
      endDt: endTs,
      durationMs,
      details: { sleepType },
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
            <div className="modal-title-icon" style={{ backgroundColor: 'var(--color-slate-light)', color: 'var(--color-slate)' }}>
              <Moon size={18} />
            </div>
            <h2>{isEditing ? t('sleepModal.titleEdit') : t('sleepModal.titleAdd')}</h2>
          </div>
          <button onClick={closeModal} style={{ color: 'var(--text-tertiary)' }} aria-label={t('common.close')}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-body">
            {/* Live Sleep Timer with Starting Time Option */}
            {!isEditing && (
              <TimerStartCard
                title={language === 'nl' ? 'Valt de baby in slaap?' : 'Baby Falling Asleep?'}
                subtitle={language === 'nl' ? 'Start een actieve slaaptimer met instelbare begintijd' : 'Start an active sleep timer with custom start time'}
                icon={Moon}
                iconColor="var(--color-slate)"
                iconBg="var(--color-slate-light)"
                actions={[
                  {
                    id: 'start-timer-sleep',
                    label: language === 'nl' ? 'Slaaptimer starten' : 'Start Sleep Timer',
                    className: 'btn-primary',
                    style: { padding: '0.45rem 1rem', fontSize: '0.8rem', backgroundColor: 'var(--color-slate)' },
                  },
                ]}
                onStart={(startTs) => {
                  closeModal();
                  startSleepTimer(startTs);
                }}
              />
            )}

            {/* Sleep Type (Nap vs Night) */}
            <div className="form-group">
              <label className="form-label">{language === 'nl' ? 'Type slaap' : 'Type of Sleep'}</label>
              <div className="segmented-control">
                <button
                  type="button"
                  className={`segmented-btn ${sleepType === 'NAP' ? 'active' : ''}`}
                  onClick={() => setSleepType('NAP')}
                >
                  {language === 'nl' ? 'Dutje' : 'Nap'}
                </button>
                <button
                  type="button"
                  className={`segmented-btn ${sleepType === 'NIGHT' ? 'active' : ''}`}
                  onClick={() => setSleepType('NIGHT')}
                >
                  {language === 'nl' ? 'Nachtslaap' : 'Night Sleep'}
                </button>
              </div>
            </div>

            {/* Duration Summary Callout */}
            <div style={{ backgroundColor: 'var(--color-slate-light)', color: 'var(--color-slate)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>{t('common.duration')}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '0.15rem' }}>
                {formatDurationMs(durationMs, language)}
              </div>
            </div>

            {/* Start & End Times */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">{t('sleepModal.fellAsleep')}</label>
                <input
                  type="time"
                  className="form-input"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('sleepModal.wokeUp')}</label>
                <input
                  type="time"
                  className="form-input"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="form-group">
              <label className="form-label">{t('common.notes')}</label>
              <textarea
                className="form-textarea"
                rows="2"
                placeholder={language === 'nl' ? 'In bed gelegd, witte ruis aan, rustgevend ritueel...' : 'Crib transfer, white noise on, soothing routine...'}
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={closeModal}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn-primary" style={{ backgroundColor: 'var(--color-slate)' }}>
              {isEditing ? t('sleepModal.submitEdit') : t('sleepModal.submitAdd')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
