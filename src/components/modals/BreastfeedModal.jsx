import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Heart, X, Clock, Play, Trash2 } from 'lucide-react';
import { formatDurationMs } from '../../utils/formatters';
import { triggerHaptic } from '../../utils/haptics';
import { PhotoUploadField } from '../PhotoUploadField';

export function BreastfeedModal() {
  const {
    activeModal,
    modalInitialData,
    closeModal,
    addEvent,
    updateEvent,
    deleteEvent,
    clearActiveTimer,
    startBreastTimer,
    preferences,
    t,
    language,
  } = useApp();
  const isDutch = language === 'nl';

  const isEditing = Boolean(modalInitialData && modalInitialData.id);
  const isFromActiveTimer = Boolean(modalInitialData?.fromActiveTimer === 'breast');
  const isFromFinishedTimer = Boolean(!isEditing && (modalInitialData?.durationMs || modalInitialData?.leftDurationMs || modalInitialData?.rightDurationMs || isFromActiveTimer));

  // If opening fresh to log, default mode can be 'TIMER' unless from finished timer or editing
  const [activeTab, setActiveTab] = useState(() => {
    if (isEditing || isFromFinishedTimer) return 'MANUAL';
    return 'TIMER';
  });

  // Timer tab state
  const formatTimeHHMM = (d = new Date()) => {
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  };

  const [timerOffsetMinutes, setTimerOffsetMinutes] = useState(0);
  const [timerTimeStr, setTimerTimeStr] = useState(() => formatTimeHHMM());

  const handleSelectTimerOffset = (mins) => {
    triggerHaptic('light', preferences?.haptics);
    setTimerOffsetMinutes(mins);
    if (mins === 0) {
      setTimerTimeStr(formatTimeHHMM());
    } else {
      const target = new Date(Date.now() - mins * 60000);
      setTimerTimeStr(formatTimeHHMM(target));
    }
  };

  const handleManualTimerTimeChange = (e) => {
    const val = e.target.value;
    setTimerTimeStr(val);
    setTimerOffsetMinutes(null);
  };

  const getComputedStartTs = () => {
    if (timerOffsetMinutes === 0) return Date.now();
    if (timerOffsetMinutes !== null && timerOffsetMinutes > 0) return Date.now() - timerOffsetMinutes * 60000;
    if (!timerTimeStr) return Date.now();
    const parts = timerTimeStr.split(':').map(Number);
    const h = parts[0] || 0;
    const m = parts[1] || 0;
    const d = new Date();
    d.setHours(h, m, 0, 0);
    if (d.getTime() > Date.now() + 60000) {
      d.setDate(d.getDate() - 1);
    }
    return d.getTime();
  };

  // Manual logging state
  const [side, setSide] = useState(modalInitialData?.details?.side || modalInitialData?.side || 'LEFT');
  const [leftMinutes, setLeftMinutes] = useState(() => {
    const ms = modalInitialData?.details?.leftDurationMs || modalInitialData?.leftDurationMs || 0;
    if (ms > 0) return Math.floor(ms / 60000);
    return '';
  });
  const [leftSeconds, setLeftSeconds] = useState(() => {
    const ms = modalInitialData?.details?.leftDurationMs || modalInitialData?.leftDurationMs || 0;
    if (ms > 0) return Math.round((ms % 60000) / 1000);
    return '';
  });
  const [rightMinutes, setRightMinutes] = useState(() => {
    const ms = modalInitialData?.details?.rightDurationMs || modalInitialData?.rightDurationMs || 0;
    if (ms > 0) return Math.floor(ms / 60000);
    return '';
  });
  const [rightSeconds, setRightSeconds] = useState(() => {
    const ms = modalInitialData?.details?.rightDurationMs || modalInitialData?.rightDurationMs || 0;
    if (ms > 0) return Math.round((ms % 60000) / 1000);
    return '';
  });

  const [photoUrl, setPhotoUrl] = useState(() => modalInitialData?.photoUrl || modalInitialData?.details?.photoUrl || null);
  const [note, setNote] = useState(modalInitialData?.note || '');
  const [timeStr, setTimeStr] = useState(() => {
    const d = new Date(modalInitialData?.beginDt || Date.now());
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  });

  if (activeModal !== 'BREAST') return null;

  const leftMs = side === 'RIGHT' ? 0 : (leftMinutes === '' && leftSeconds === '' ? 10 * 60 * 1000 : (Math.max(0, Number(leftMinutes) || 0) * 60 + Math.max(0, Number(leftSeconds) || 0)) * 1000);
  const rightMs = side === 'LEFT' ? 0 : (rightMinutes === '' && rightSeconds === '' ? 10 * 60 * 1000 : (Math.max(0, Number(rightMinutes) || 0) * 60 + Math.max(0, Number(rightSeconds) || 0)) * 1000);
  const totalDurationMs = leftMs + rightMs;

  const handleStartTimer = (startSide) => {
    triggerHaptic('medium', preferences?.haptics);
    const startTs = getComputedStartTs();
    closeModal();
    startBreastTimer(startSide, startTs);
  };

  const setQuickDuration = (targetSide, mins) => {
    triggerHaptic('light', preferences?.haptics);
    if (targetSide === 'LEFT') {
      setLeftMinutes(mins);
      setLeftSeconds(0);
    } else {
      setRightMinutes(mins);
      setRightSeconds(0);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    const parts = timeStr.split(':').map(Number);
    const h = parts[0] || 0;
    const m = parts[1] || 0;
    const dateObj = new Date(modalInitialData?.beginDt || Date.now());
    dateObj.setHours(h, m, 0, 0);
    const beginDt = dateObj.getTime();

    let finalLastActiveSide = modalInitialData?.details?.lastActiveSide || modalInitialData?.lastActiveSide;
    if (side === 'LEFT') {
      finalLastActiveSide = 'LEFT';
    } else if (side === 'RIGHT') {
      finalLastActiveSide = 'RIGHT';
    } else if (!finalLastActiveSide) {
      finalLastActiveSide = rightMs > 0 && leftMs === 0 ? 'RIGHT' : 'LEFT';
    }

    const eventPayload = {
      type: 'BREAST',
      beginDt,
      endDt: beginDt + totalDurationMs,
      durationMs: totalDurationMs,
      photoUrl: photoUrl || null,
      details: {
        side,
        lastActiveSide: finalLastActiveSide,
        leftDurationMs: leftMs,
        rightDurationMs: rightMs,
        leftDurationSeconds: Math.round(leftMs / 1000),
        rightDurationSeconds: Math.round(rightMs / 1000),
        totalDurationSeconds: Math.round(totalDurationMs / 1000),
        photoUrl: photoUrl || null,
      },
      note,
    };

    if (isEditing) {
      updateEvent(modalInitialData.id, eventPayload);
    } else {
      addEvent(eventPayload);
    }

    if (isFromActiveTimer) {
      clearActiveTimer('breast');
    }

    closeModal();
  };

  const handleDelete = () => {
    triggerHaptic('warning', preferences?.haptics);
    if (isFromActiveTimer) {
      if (window.confirm(t('common.discardTimerConfirm'))) {
        clearActiveTimer('breast');
        closeModal();
      }
    } else if (isEditing) {
      if (window.confirm(t('timeline.deleteConfirm'))) {
        deleteEvent(modalInitialData.id);
        closeModal();
      }
    }
  };

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-title-icon" style={{ backgroundColor: 'var(--color-terracotta-light)', color: 'var(--color-terracotta)' }}>
              <Heart size={18} />
            </div>
            <h2>
              {isFromActiveTimer
                ? (isDutch ? 'Borstvoeding afronden' : 'Finish Nursing')
                : (isEditing ? t('breastModal.titleEdit') : t('breastModal.titleAdd'))}
            </h2>
          </div>
          <button onClick={closeModal} style={{ color: 'var(--text-tertiary)' }} aria-label={t('common.close')}>
            <X size={20} />
          </button>
        </div>

        {/* Mode Switcher: Live Timer vs Manual Past Feed (hidden when editing or reviewing finished timer) */}
        {!isEditing && !isFromFinishedTimer && (
          <div style={{ padding: '0.65rem 1.15rem 0' }}>
            <div className="modal-mode-toggle">
              <button
                type="button"
                className={`modal-mode-btn ${activeTab === 'TIMER' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('TIMER');
                  triggerHaptic('light', preferences?.haptics);
                }}
              >
                {t('common.liveTimerTab')}
              </button>
              <button
                type="button"
                className={`modal-mode-btn ${activeTab === 'MANUAL' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('MANUAL');
                  triggerHaptic('light', preferences?.haptics);
                }}
              >
                {t('common.manualLogTab')}
              </button>
            </div>
          </div>
        )}

        {/* Tab 1: Live Timer Starting Card */}
        {activeTab === 'TIMER' && !isEditing && !isFromFinishedTimer ? (
          <div className="modal-body" style={{ gap: '1rem', paddingTop: '0.85rem' }}>
            <div style={{ textAlign: 'center', padding: '0.5rem 0 0.2rem' }}>
              <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                {isDutch ? 'Kies aan welke kant je begint met voeden:' : 'Choose which side you are starting on:'}
              </p>
            </div>

            {/* Direct 1-tap Start Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn-primary"
                style={{
                  minHeight: '64px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.2rem',
                  backgroundColor: 'var(--color-terracotta)',
                }}
                onClick={() => handleStartTimer('LEFT')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '1rem', fontWeight: 700 }}>
                  <Play size={16} fill="currentColor" />
                  <span>{t('timeline.leftSide')}</span>
                </div>
                <span style={{ fontSize: '0.72rem', opacity: 0.9 }}>
                  {timerOffsetMinutes === 0
                    ? (isDutch ? 'Start nu' : 'Start now')
                    : timerOffsetMinutes !== null
                      ? (isDutch ? `${timerOffsetMinutes}m geleden` : `${timerOffsetMinutes}m ago`)
                      : (isDutch ? `Om ${timerTimeStr}` : `At ${timerTimeStr}`)}
                </span>
              </button>

              <button
                type="button"
                className="btn-primary"
                style={{
                  minHeight: '64px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.2rem',
                  backgroundColor: 'var(--color-caramel)',
                }}
                onClick={() => handleStartTimer('RIGHT')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '1rem', fontWeight: 700 }}>
                  <Play size={16} fill="currentColor" />
                  <span>{t('timeline.rightSide')}</span>
                </div>
                <span style={{ fontSize: '0.72rem', opacity: 0.9 }}>
                  {timerOffsetMinutes === 0
                    ? (isDutch ? 'Start nu' : 'Start now')
                    : timerOffsetMinutes !== null
                      ? (isDutch ? `${timerOffsetMinutes}m geleden` : `${timerOffsetMinutes}m ago`)
                      : (isDutch ? `Om ${timerTimeStr}` : `At ${timerTimeStr}`)}
                </span>
              </button>
            </div>

            {/* Starting Time: Manual Time Input + Quick Offset Pills */}
            <div style={{
              backgroundColor: 'var(--bg-card-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 0.95rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  <Clock size={16} />
                  <span>{isDutch ? 'Starttijd:' : 'Start time:'}</span>
                </div>
                <input
                  type="time"
                  className="form-input"
                  style={{
                    width: 'auto',
                    minWidth: '105px',
                    minHeight: '38px',
                    padding: '0.35rem 0.6rem',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    textAlign: 'center',
                  }}
                  value={timerTimeStr}
                  onChange={handleManualTimerTimeChange}
                  title={isDutch ? 'Kies handmatig een exacte starttijd' : 'Choose exact start time manually'}
                />
              </div>

              <div className="quick-presets-row">
                {[
                  { offset: 0, label: isDutch ? 'Nu' : 'Now' },
                  { offset: 5, label: '5m' },
                  { offset: 10, label: '10m' },
                  { offset: 15, label: '15m' },
                ].map(p => (
                  <button
                    key={p.offset}
                    type="button"
                    className={`quick-preset-pill ${timerOffsetMinutes === p.offset ? 'active terracotta' : ''}`}
                    onClick={() => handleSelectTimerOffset(p.offset)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Tab 2: Manual Past Feed Form */
          <form onSubmit={handleSave}>
            <div className="modal-body">
              {/* Side Selector */}
              <div className="segmented-control">
                {['LEFT', 'BOTH', 'RIGHT'].map(s => (
                  <button
                    key={s}
                    type="button"
                    className={`segmented-btn ${side === s ? 'active' : ''}`}
                    onClick={() => {
                      setSide(s);
                      triggerHaptic('light', preferences?.haptics);
                      if (s === 'LEFT') {
                        setRightMinutes('');
                        setRightSeconds('');
                      } else if (s === 'RIGHT') {
                        setLeftMinutes('');
                        setLeftSeconds('');
                      }
                    }}
                  >
                    {s === 'LEFT' ? t('breastModal.left') : s === 'RIGHT' ? t('breastModal.right') : t('breastModal.both')}
                  </button>
                ))}
              </div>

              {/* Duration Inputs & Quick Presets with Seconds Input */}
              <div style={{ display: 'grid', gridTemplateColumns: side === 'BOTH' ? 'repeat(auto-fit, minmax(140px, 1fr))' : '1fr', gap: '0.65rem' }}>
                {(side === 'LEFT' || side === 'BOTH') && (
                  <div className="form-group" style={{ backgroundColor: 'var(--bg-card-subtle)', padding: '0.75rem 0.85rem', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                      <label className="form-label" style={{ marginBottom: 0, fontWeight: 700, fontSize: '0.86rem' }}>{t('breastModal.left')}</label>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flex: 1 }}>
                        <input
                          type="number"
                          min="0"
                          max="180"
                          className="form-input"
                          style={{ minHeight: '40px', padding: '0.35rem 0.3rem', textAlign: 'center', fontWeight: 700, fontSize: '0.98rem' }}
                          placeholder="10"
                          value={leftMinutes}
                          onChange={e => setLeftMinutes(e.target.value)}
                          aria-label={isDutch ? 'Minuten links' : 'Left minutes'}
                        />
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>min</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flex: 1 }}>
                        <input
                          type="number"
                          min="0"
                          max="59"
                          className="form-input"
                          style={{ minHeight: '40px', padding: '0.35rem 0.3rem', textAlign: 'center', fontWeight: 700, fontSize: '0.98rem' }}
                          placeholder="0"
                          value={leftSeconds}
                          onChange={e => setLeftSeconds(e.target.value)}
                          aria-label={isDutch ? 'Seconden links' : 'Left seconds'}
                        />
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>sec</span>
                      </div>
                    </div>

                    {/* Quick duration pills */}
                    <div className="quick-presets-row" style={{ marginTop: '0.55rem' }}>
                      {[5, 10, 15, 20].map(m => (
                        <button
                          key={m}
                          type="button"
                          className={`quick-preset-pill ${Number(leftMinutes) === m && Number(leftSeconds) === 0 ? 'active terracotta' : ''}`}
                          onClick={() => setQuickDuration('LEFT', m)}
                        >
                          {m}m
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {(side === 'RIGHT' || side === 'BOTH') && (
                  <div className="form-group" style={{ backgroundColor: 'var(--bg-card-subtle)', padding: '0.75rem 0.85rem', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                      <label className="form-label" style={{ marginBottom: 0, fontWeight: 700, fontSize: '0.86rem' }}>{t('breastModal.right')}</label>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flex: 1 }}>
                        <input
                          type="number"
                          min="0"
                          max="180"
                          className="form-input"
                          style={{ minHeight: '40px', padding: '0.35rem 0.3rem', textAlign: 'center', fontWeight: 700, fontSize: '0.98rem' }}
                          placeholder="10"
                          value={rightMinutes}
                          onChange={e => setRightMinutes(e.target.value)}
                          aria-label={isDutch ? 'Minuten rechts' : 'Right minutes'}
                        />
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>min</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flex: 1 }}>
                        <input
                          type="number"
                          min="0"
                          max="59"
                          className="form-input"
                          style={{ minHeight: '40px', padding: '0.35rem 0.3rem', textAlign: 'center', fontWeight: 700, fontSize: '0.98rem' }}
                          placeholder="0"
                          value={rightSeconds}
                          onChange={e => setRightSeconds(e.target.value)}
                          aria-label={isDutch ? 'Seconden rechts' : 'Right seconds'}
                        />
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>sec</span>
                      </div>
                    </div>

                    {/* Quick duration pills */}
                    <div className="quick-presets-row" style={{ marginTop: '0.55rem' }}>
                      {[5, 10, 15, 20].map(m => (
                        <button
                          key={m}
                          type="button"
                          className={`quick-preset-pill ${Number(rightMinutes) === m && Number(rightSeconds) === 0 ? 'active caramel' : ''}`}
                          onClick={() => setQuickDuration('RIGHT', m)}
                        >
                          {m}m
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Total Duration Summary & Time of Feed */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.65rem', alignItems: 'center' }}>
                <div style={{
                  backgroundColor: 'var(--color-terracotta-light)',
                  color: 'var(--color-terracotta)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.55rem 0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>{t('common.duration')}</span>
                  <span style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                    {formatDurationMs(totalDurationMs, language)}
                  </span>
                </div>

                <div className="form-group">
                  <input
                    type="time"
                    className="form-input"
                    value={timeStr}
                    onChange={e => setTimeStr(e.target.value)}
                  />
                </div>
              </div>

              {/* Photo Upload */}
              <div className="form-group">
                <PhotoUploadField
                  photoUrl={photoUrl}
                  onChange={setPhotoUrl}
                  language={language}
                  haptics={preferences?.haptics}
                  label={isDutch ? 'Foto toevoegen (optioneel) 📸' : 'Add Photo (Optional) 📸'}
                />
              </div>

              {/* Optional Notes */}
              <div className="form-group">
                <input
                  type="text"
                  className="form-input"
                  placeholder={t('common.notes')}
                  value={note}
                  onChange={e => setNote(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer">
              {(isEditing || isFromActiveTimer) && (
                <button
                  type="button"
                  className="btn-danger"
                  onClick={handleDelete}
                  title={isEditing ? t('common.delete') : (isDutch ? 'Timer wissen' : 'Discard timer')}
                >
                  <Trash2 size={16} />
                  <span>{isEditing ? t('common.delete') : (isDutch ? 'Wissen' : 'Delete')}</span>
                </button>
              )}
              <button
                type="submit"
                className="btn-primary"
                style={{ backgroundColor: 'var(--color-terracotta)' }}
              >
                {isFromActiveTimer
                  ? (isDutch ? 'Sessie opslaan' : 'Save Session')
                  : (isEditing ? t('breastModal.submitEdit') : t('breastModal.submitAdd'))}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
