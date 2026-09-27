import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatDurationMs } from '../../utils/formatters';
import { Moon, X, Play, Clock, Trash2 } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

export function SleepModal() {
  const {
    activeModal,
    modalInitialData,
    closeModal,
    addEvent,
    updateEvent,
    deleteEvent,
    clearActiveTimer,
    startSleepTimer,
    preferences,
    t,
    language,
  } = useApp();
  const isDutch = language === 'nl';

  const isEditing = Boolean(modalInitialData && modalInitialData.id);
  const isFromActiveTimer = Boolean(modalInitialData?.fromActiveTimer === 'sleep');
  const isFromFinishedTimer = Boolean(!isEditing && (modalInitialData?.durationMs !== undefined || isFromActiveTimer));

  const [activeTab, setActiveTab] = useState(() => {
    if (isEditing || isFromFinishedTimer) return 'MANUAL';
    return 'TIMER';
  });

  const formatTimeHHMM = (d = new Date()) => {
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  };

  // Timer starting state
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
  const [sleepType, setSleepType] = useState(() => {
    return modalInitialData?.details?.sleepType || 'NAP';
  });

  const formatHHMM = (ts) => {
    const d = new Date(ts);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  };

  const [startDateStr] = useState(() => {
    const d = new Date(modalInitialData?.beginDt || (Date.now() - 45 * 60 * 1000));
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });

  const [startTime, setStartTime] = useState(() => {
    return formatHHMM(modalInitialData?.beginDt || (Date.now() - 45 * 60 * 1000));
  });

  const [endTime, setEndTime] = useState(() => {
    return formatHHMM(modalInitialData?.endDt || Date.now());
  });

  const [note, setNote] = useState(modalInitialData?.note || '');

  if (activeModal !== 'SLEEP') return null;

  // Calculate start & end timestamps accurately, handling overnight sleeps
  const calculateTimestamps = () => {
    const [y, mon, day] = startDateStr.split('-').map(Number);
    const [sh, sm] = (startTime || '00:00').split(':').map(Number);
    const [eh, em] = (endTime || '00:00').split(':').map(Number);

    const startObj = new Date(y, mon - 1, day, sh || 0, sm || 0, 0, 0);
    const endObj = new Date(y, mon - 1, day, eh || 0, em || 0, 0, 0);

    // If end is before start, baby slept past midnight into next day
    if (endObj.getTime() < startObj.getTime()) {
      endObj.setDate(endObj.getDate() + 1);
    }

    const startTs = startObj.getTime();
    const endTs = endObj.getTime();
    const durationMs = Math.max(0, endTs - startTs);

    return { startTs, endTs, durationMs };
  };

  const { startTs, endTs, durationMs } = calculateTimestamps();

  // Quick duration presets (30m, 45m, 1h, 1.5h, 2h, 3h)
  const quickDurations = [
    { mins: 30, label: '30m' },
    { mins: 45, label: '45m' },
    { mins: 60, label: '1h' },
    { mins: 90, label: '1.5h' },
    { mins: 120, label: '2h' },
    { mins: 180, label: '3h' },
  ];

  const handleApplyDuration = (mins) => {
    triggerHaptic('light', preferences?.haptics);
    const [sh, sm] = (startTime || '00:00').split(':').map(Number);
    const [y, mon, day] = startDateStr.split('-').map(Number);
    const startObj = new Date(y, mon - 1, day, sh || 0, sm || 0, 0, 0);
    const targetEndObj = new Date(startObj.getTime() + mins * 60000);
    setEndTime(formatHHMM(targetEndObj.getTime()));
  };

  const handleStartLiveTimer = () => {
    triggerHaptic('medium', preferences?.haptics);
    const startTs = getComputedStartTs();
    closeModal();
    startSleepTimer(startTs);
  };

  const handleSave = (e) => {
    e.preventDefault();
    const eventPayload = {
      type: 'SLEEP',
      beginDt: startTs,
      endDt: endTs,
      durationMs,
      details: {
        sleepType,
        durationSeconds: Math.round(durationMs / 1000),
      },
      note,
    };

    if (isEditing) {
      updateEvent(modalInitialData.id, eventPayload);
    } else {
      addEvent(eventPayload);
    }

    if (isFromActiveTimer) {
      clearActiveTimer('sleep');
    }

    closeModal();
  };

  const handleDelete = () => {
    triggerHaptic('warning', preferences?.haptics);
    if (isFromActiveTimer) {
      if (window.confirm(isDutch ? 'Weet je zeker dat je deze timer wilt wissen zonder op te slaan?' : 'Are you sure you want to discard this timer without logging?')) {
        clearActiveTimer('sleep');
        closeModal();
      }
    } else if (isEditing) {
      if (window.confirm(isDutch ? 'Ben je zeker dat je deze activiteit wil verwijderen?' : 'Are you sure you want to delete this event?')) {
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
            <div className="modal-title-icon" style={{ backgroundColor: 'var(--color-slate-light)', color: 'var(--color-slate)' }}>
              <Moon size={18} />
            </div>
            <h2>
              {isFromActiveTimer
                ? (isDutch ? 'Slaap afronden' : 'Finish Sleep')
                : (isEditing ? t('sleepModal.titleEdit') : t('sleepModal.titleAdd'))}
            </h2>
          </div>
          <button onClick={closeModal} style={{ color: 'var(--text-tertiary)' }} aria-label={t('common.close')}>
            <X size={20} />
          </button>
        </div>

        {/* Top Mode Toggle (hidden when editing or reviewing finished timer) */}
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

        {/* Tab 1: Start Live Sleep Timer */}
        {activeTab === 'TIMER' && !isEditing && !isFromFinishedTimer ? (
          <div className="modal-body" style={{ gap: '1.1rem', paddingTop: '0.9rem' }}>
            <div style={{ textAlign: 'center', padding: '0.4rem 0 0.1rem' }}>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                {isDutch ? 'Valt de baby in slaap?' : 'Is baby falling asleep?'}
              </p>
            </div>

            <button
              type="button"
              className="btn-primary"
              style={{
                width: '100%',
                minHeight: '56px',
                backgroundColor: 'var(--color-slate)',
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
              onClick={handleStartLiveTimer}
            >
              <Play size={18} fill="currentColor" />
              <span>
                {isDutch ? 'Slaaptimer starten' : 'Start Sleep Timer'}
                <span style={{ fontSize: '0.8rem', opacity: 0.9, marginLeft: '0.4rem', fontWeight: 500 }}>
                  ({timerOffsetMinutes === 0
                    ? (isDutch ? 'nu' : 'now')
                    : timerOffsetMinutes !== null
                      ? (isDutch ? `${timerOffsetMinutes}m geleden` : `${timerOffsetMinutes}m ago`)
                      : (isDutch ? `om ${timerTimeStr}` : `at ${timerTimeStr}`)})
                </span>
              </span>
            </button>

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
                  { offset: 30, label: '30m' },
                ].map(p => (
                  <button
                    key={p.offset}
                    type="button"
                    className={`quick-preset-pill ${timerOffsetMinutes === p.offset ? 'active slate' : ''}`}
                    onClick={() => handleSelectTimerOffset(p.offset)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Tab 2: Manual Past Sleep Form */
          <form onSubmit={handleSave}>
            <div className="modal-body">
              {/* Sleep Type (Nap vs Night) */}
              <div className="segmented-control">
                <button
                  type="button"
                  className={`segmented-btn ${sleepType === 'NAP' ? 'active' : ''}`}
                  onClick={() => {
                    setSleepType('NAP');
                    triggerHaptic('light', preferences?.haptics);
                  }}
                >
                  {isDutch ? 'Dutje' : 'Nap'}
                </button>
                <button
                  type="button"
                  className={`segmented-btn ${sleepType === 'NIGHT' ? 'active' : ''}`}
                  onClick={() => {
                    setSleepType('NIGHT');
                    triggerHaptic('light', preferences?.haptics);
                  }}
                >
                  {isDutch ? 'Nachtslaap' : 'Night Sleep'}
                </button>
              </div>

              {/* Quick Duration Presets */}
              <div>
                <label className="form-label" style={{ marginBottom: '0.45rem' }}>
                  {t('common.quickDuration')}
                </label>
                <div className="quick-presets-row">
                  {quickDurations.map(qd => {
                    const isSelected = Math.abs(durationMs - qd.mins * 60000) < 60000;
                    return (
                      <button
                        key={qd.mins}
                        type="button"
                        className={`quick-preset-pill ${isSelected ? 'active slate' : ''}`}
                        onClick={() => handleApplyDuration(qd.mins)}
                      >
                        {qd.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Start & End Times + Live Duration Badge */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                <div className="form-group">
                  <label className="form-label">{t('sleepModal.fellAsleep')}</label>
                  <input
                    type="time"
                    className="form-input"
                    style={{ minHeight: '42px', fontSize: '0.98rem', fontWeight: 700, textAlign: 'center' }}
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{t('sleepModal.wokeUp')}</label>
                  <input
                    type="time"
                    className="form-input"
                    style={{ minHeight: '42px', fontSize: '0.98rem', fontWeight: 700, textAlign: 'center' }}
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                  />
                </div>
              </div>

              {/* Total Duration Preview Banner */}
              <div style={{
                backgroundColor: 'var(--color-slate-light)',
                color: 'var(--color-slate)',
                borderRadius: 'var(--radius-md)',
                padding: '0.55rem 0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase' }}>
                  {t('common.duration')}
                </span>
                <span style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                  {formatDurationMs(durationMs, language)}
                </span>
              </div>

              {/* Notes */}
              <div className="form-group">
                <input
                  type="text"
                  className="form-input"
                  placeholder={isDutch ? 'In bedje gelegd, witte ruis...' : 'Crib transfer, white noise...'}
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
              <button type="button" className="btn-secondary" onClick={closeModal}>
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn-primary" style={{ backgroundColor: 'var(--color-slate)' }}>
                {isFromActiveTimer
                  ? (isDutch ? 'Sessie opslaan' : 'Save Session')
                  : (isEditing ? t('sleepModal.submitEdit') : t('sleepModal.submitAdd'))}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
