import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Heart, X, Clock } from 'lucide-react';
import { TimerStartCard } from '../TimerStartCard';
import { formatDurationMs } from '../../utils/formatters';

export function BreastfeedModal() {
  const { activeModal, modalInitialData, closeModal, addEvent, updateEvent, startBreastTimer, t, language } = useApp();

  const isEditing = Boolean(modalInitialData && modalInitialData.id);

  const [side, setSide] = useState(modalInitialData?.details?.side || modalInitialData?.side || 'LEFT');
  const [leftMinutes, setLeftMinutes] = useState(() => {
    const ms = modalInitialData?.details?.leftDurationMs || modalInitialData?.leftDurationMs || 0;
    if (ms > 0) return Math.floor(ms / 60000);
    return (side === 'LEFT' || side === 'BOTH') ? 10 : 0;
  });
  const [leftSeconds, setLeftSeconds] = useState(() => {
    const ms = modalInitialData?.details?.leftDurationMs || modalInitialData?.leftDurationMs || 0;
    if (ms > 0) return Math.round((ms % 60000) / 1000);
    return 0;
  });
  const [rightMinutes, setRightMinutes] = useState(() => {
    const ms = modalInitialData?.details?.rightDurationMs || modalInitialData?.rightDurationMs || 0;
    if (ms > 0) return Math.floor(ms / 60000);
    return (side === 'RIGHT' || side === 'BOTH') ? 10 : 0;
  });
  const [rightSeconds, setRightSeconds] = useState(() => {
    const ms = modalInitialData?.details?.rightDurationMs || modalInitialData?.rightDurationMs || 0;
    if (ms > 0) return Math.round((ms % 60000) / 1000);
    return 0;
  });
  const [note, setNote] = useState(modalInitialData?.note || '');
  const [timeStr, setTimeStr] = useState(() => {
    const d = new Date(modalInitialData?.beginDt || Date.now());
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  });

  if (activeModal !== 'BREAST') return null;

  const leftMs = (Math.max(0, Number(leftMinutes) || 0) * 60 + Math.max(0, Number(leftSeconds) || 0)) * 1000;
  const rightMs = (Math.max(0, Number(rightMinutes) || 0) * 60 + Math.max(0, Number(rightSeconds) || 0)) * 1000;
  const totalDurationMs = leftMs + rightMs;

  const handleSave = (e) => {
    e.preventDefault();
    const parts = timeStr.split(':').map(Number);
    const h = parts[0] || 0;
    const m = parts[1] || 0;
    const s = parts.length > 2 ? parts[2] : 0;
    const dateObj = new Date(modalInitialData?.beginDt || Date.now());
    dateObj.setHours(h, m, s, 0);
    const beginDt = dateObj.getTime();

    const eventPayload = {
      type: 'BREAST',
      beginDt,
      endDt: beginDt + totalDurationMs,
      durationMs: totalDurationMs,
      details: {
        side,
        leftDurationMs: leftMs,
        rightDurationMs: rightMs,
        leftDurationSeconds: Math.round(leftMs / 1000),
        rightDurationSeconds: Math.round(rightMs / 1000),
        totalDurationSeconds: Math.round(totalDurationMs / 1000),
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
            <h2>{isEditing ? t('breastModal.titleEdit') : t('breastModal.titleAdd')}</h2>
          </div>
          <button onClick={closeModal} style={{ color: 'var(--text-tertiary)' }} aria-label={t('common.close')}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-body">
            {/* Start Live Timer with Starting Time Option (if not editing) */}
            {!isEditing && (
              <TimerStartCard
                title={t('breastModal.startTimer')}
                subtitle={language === 'nl' ? 'Live borstvoeding bijhouden met starttijd' : 'Track live nursing with custom start time'}
                icon={Heart}
                iconColor="var(--color-terracotta)"
                iconBg="var(--color-terracotta-light)"
                actions={[
                  {
                    id: 'start-timer-left',
                    label: t('timeline.leftSide'),
                    side: 'LEFT',
                    className: 'btn-primary',
                    style: { padding: '0.4rem 0.85rem', fontSize: '0.78rem' },
                  },
                  {
                    id: 'start-timer-right',
                    label: t('timeline.rightSide'),
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
              <label className="form-label">{t('breastModal.side')}</label>
              <div className="segmented-control">
                {['LEFT', 'BOTH', 'RIGHT'].map(s => (
                  <button
                    key={s}
                    type="button"
                    className={`segmented-btn ${side === s ? 'active' : ''}`}
                    onClick={() => {
                      setSide(s);
                      if (s === 'LEFT') {
                        setRightMinutes(0);
                        setRightSeconds(0);
                        if (Number(leftMinutes) === 0 && Number(leftSeconds) === 0) setLeftMinutes(10);
                      } else if (s === 'RIGHT') {
                        setLeftMinutes(0);
                        setLeftSeconds(0);
                        if (Number(rightMinutes) === 0 && Number(rightSeconds) === 0) setRightMinutes(10);
                      } else if (s === 'BOTH') {
                        if (Number(leftMinutes) === 0 && Number(leftSeconds) === 0) setLeftMinutes(10);
                        if (Number(rightMinutes) === 0 && Number(rightSeconds) === 0) setRightMinutes(10);
                      }
                    }}
                  >
                    {s === 'LEFT' ? t('breastModal.left') : s === 'RIGHT' ? t('breastModal.right') : t('breastModal.both')}
                  </button>
                ))}
              </div>
            </div>

            {/* Durations with Minutes and Seconds */}
            <div style={{ display: 'grid', gridTemplateColumns: side === 'BOTH' ? '1fr 1fr' : '1fr', gap: '0.75rem' }}>
              {(side === 'LEFT' || side === 'BOTH') && (
                <div className="form-group">
                  <label className="form-label">{t('breastModal.left')}</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="number"
                        min="0"
                        max="180"
                        className="form-input"
                        style={{ paddingRight: '2rem' }}
                        value={leftMinutes}
                        onChange={e => setLeftMinutes(e.target.value)}
                        placeholder="0"
                      />
                      <span style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: 'var(--text-tertiary)', pointerEvents: 'none' }}>
                        min
                      </span>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        className="form-input"
                        style={{ paddingRight: '2rem' }}
                        value={leftSeconds}
                        onChange={e => setLeftSeconds(e.target.value)}
                        placeholder="0"
                      />
                      <span style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: 'var(--text-tertiary)', pointerEvents: 'none' }}>
                        sec
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {(side === 'RIGHT' || side === 'BOTH') && (
                <div className="form-group">
                  <label className="form-label">{t('breastModal.right')}</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="number"
                        min="0"
                        max="180"
                        className="form-input"
                        style={{ paddingRight: '2rem' }}
                        value={rightMinutes}
                        onChange={e => setRightMinutes(e.target.value)}
                        placeholder="0"
                      />
                      <span style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: 'var(--text-tertiary)', pointerEvents: 'none' }}>
                        min
                      </span>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        className="form-input"
                        style={{ paddingRight: '2rem' }}
                        value={rightSeconds}
                        onChange={e => setRightSeconds(e.target.value)}
                        placeholder="0"
                      />
                      <span style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: 'var(--text-tertiary)', pointerEvents: 'none' }}>
                        sec
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Total Duration Summary Callout */}
            <div style={{ backgroundColor: 'var(--color-terracotta-light)', color: 'var(--color-terracotta)', borderRadius: 'var(--radius-md)', padding: '0.65rem 0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{t('common.duration')}</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                {formatDurationMs(totalDurationMs, language)}
              </span>
            </div>

            {/* Time of Feed */}
            <div className="form-group">
              <label className="form-label">{t('common.time')}</label>
              <input
                type="time"
                step="1"
                className="form-input"
                value={timeStr}
                onChange={e => setTimeStr(e.target.value)}
              />
            </div>

            {/* Note */}
            <div className="form-group">
              <label className="form-label">{t('common.notes')}</label>
              <textarea
                className="form-textarea"
                rows="2"
                placeholder={t('common.notes')}
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={closeModal}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn-primary">
              {isEditing ? t('breastModal.submitEdit') : t('breastModal.submitAdd')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
