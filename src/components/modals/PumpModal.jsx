import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { triggerHaptic } from '../../utils/haptics';
import { X, Plus, Minus, Play, Clock, Trash2 } from 'lucide-react';
import { PumpIcon } from '../icons/PumpIcon';
import { formatDurationMs } from '../../utils/formatters';

export function PumpModal() {
  const {
    activeModal,
    modalInitialData,
    closeModal,
    addEvent,
    updateEvent,
    deleteEvent,
    clearActiveTimer,
    preferences,
    startPumpTimer,
    t,
    language,
  } = useApp();
  const isDutch = language === 'nl';

  const isEditing = Boolean(modalInitialData && modalInitialData.id);
  const isFromActiveTimer = Boolean(modalInitialData?.fromActiveTimer === 'pump');
  const isFromFinishedTimer = Boolean(!isEditing && (modalInitialData?.durationMs || isFromActiveTimer));
  const defaultUnit = preferences.volumeUnit === 'ml' ? 'ml' : 'oz';

  const [activeTab, setActiveTab] = useState(() => {
    if (isEditing || isFromFinishedTimer) return 'MANUAL';
    return 'TIMER';
  });

  const [unit, setUnit] = useState(() => {
    return modalInitialData?.details?.volumeUnit || defaultUnit;
  });

  const [side, setSide] = useState(() => {
    return modalInitialData?.details?.side || 'BOTH';
  });

  const formatTimeHHMM = (d = new Date()) => {
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  };

  // Timer tab state
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

  const getInitialValue = (valFloz, valMl) => {
    if (unit === 'ml') {
      if (valMl !== undefined && valMl !== null) return valMl;
      if (valFloz !== undefined && valFloz !== null) return Math.round(valFloz * 29.5735);
      return '';
    } else {
      if (valFloz !== undefined && valFloz !== null) return Math.round(valFloz * 100) / 100;
      if (valMl !== undefined && valMl !== null) return Math.round((valMl / 29.5735) * 100) / 100;
      return '';
    }
  };

  const [leftAmount, setLeftAmount] = useState(() => {
    const initSide = modalInitialData?.details?.side || 'BOTH';
    if (initSide === 'RIGHT') return 0;
    return getInitialValue(modalInitialData?.details?.leftFloz, modalInitialData?.details?.leftAmount);
  });

  const [rightAmount, setRightAmount] = useState(() => {
    const initSide = modalInitialData?.details?.side || 'BOTH';
    if (initSide === 'LEFT') return 0;
    return getInitialValue(modalInitialData?.details?.rightFloz, modalInitialData?.details?.rightAmount);
  });

  const [durationMin, setDurationMin] = useState(() => {
    if (modalInitialData?.durationMs) {
      return Math.max(1, Math.floor(modalInitialData.durationMs / 60000));
    }
    return '';
  });

  const [note, setNote] = useState(modalInitialData?.note || '');

  const [timeStr, setTimeStr] = useState(() => {
    const d = new Date(modalInitialData?.beginDt || Date.now());
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  });

  if (activeModal !== 'PUMP') return null;

  const isMl = unit === 'ml';
  const defaultSideVal = isMl ? 50 : 1.7;
  const numLeft = side === 'RIGHT' ? 0 : (leftAmount === '' ? (rightAmount !== '' ? 0 : defaultSideVal) : (parseFloat(leftAmount) || 0));
  const numRight = side === 'LEFT' ? 0 : (rightAmount === '' ? (leftAmount !== '' ? 0 : defaultSideVal) : (parseFloat(rightAmount) || 0));
  const totalAmount = isMl
    ? Math.round(numLeft + numRight)
    : Math.round((numLeft + numRight) * 10) / 10;

  // Unit Switching
  const handleToggleUnit = (newUnit) => {
    if (newUnit === unit) return;
    triggerHaptic('light', preferences?.haptics);
    if (newUnit === 'ml') {
      setLeftAmount((prev) => Math.round((parseFloat(prev) || 0) * 29.5735));
      setRightAmount((prev) => Math.round((parseFloat(prev) || 0) * 29.5735));
    } else {
      setLeftAmount((prev) => Math.round(((parseFloat(prev) || 0) / 29.5735) * 10) / 10);
      setRightAmount((prev) => Math.round(((parseFloat(prev) || 0) / 29.5735) * 10) / 10);
    }
    setUnit(newUnit);
  };

  const handleSideChange = (newSide) => {
    triggerHaptic('light', preferences?.haptics);
    setSide(newSide);
    if (newSide === 'LEFT') {
      setRightAmount(0);
    } else if (newSide === 'RIGHT') {
      setLeftAmount(0);
    }
  };

  const adjustSide = (target, delta) => {
    triggerHaptic('light', preferences?.haptics);
    const startVal = isMl ? 50 : 1.7;
    if (target === 'LEFT') {
      setLeftAmount((prev) => {
        const cur = prev === '' ? startVal : (parseFloat(prev) || 0);
        return isMl ? Math.max(0, Math.round(cur + delta)) : Math.max(0, Math.round((cur + delta) * 10) / 10);
      });
    } else {
      setRightAmount((prev) => {
        const cur = prev === '' ? startVal : (parseFloat(prev) || 0);
        return isMl ? Math.max(0, Math.round(cur + delta)) : Math.max(0, Math.round((cur + delta) * 10) / 10);
      });
    }
  };

  const copyLeftToRight = () => {
    triggerHaptic('light', preferences?.haptics);
    setRightAmount(leftAmount);
  };

  const handleStartLiveTimer = () => {
    triggerHaptic('medium', preferences?.haptics);
    const startTs = getComputedStartTs();
    closeModal();
    startPumpTimer(side, startTs);
  };

  const handleSave = (e) => {
    e.preventDefault();
    const parts = timeStr.split(':').map(Number);
    const h = parts[0] || 0;
    const m = parts[1] || 0;
    const dateObj = new Date(modalInitialData?.beginDt || Date.now());
    dateObj.setHours(h, m, 0, 0);
    const beginDt = dateObj.getTime();
    const finalDurationMin = durationMin === '' ? 15 : (Math.max(0, Number(durationMin)) || 15);
    const durationMs = finalDurationMin * 60 * 1000;

    const finalLeftFloz = isMl ? numLeft / 29.5735 : numLeft;
    const finalRightFloz = isMl ? numRight / 29.5735 : numRight;
    const finalTotalFloz = isMl ? totalAmount / 29.5735 : totalAmount;

    const eventPayload = {
      type: 'PUMP',
      beginDt,
      endDt: beginDt + durationMs,
      durationMs,
      details: {
        side,
        volumeUnit: unit,
        leftAmount: numLeft,
        rightAmount: numRight,
        totalAmount,
        leftFloz: Math.round(finalLeftFloz * 10000) / 10000,
        rightFloz: Math.round(finalRightFloz * 10000) / 10000,
        totalFloz: Math.round(finalTotalFloz * 10000) / 10000,
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
      clearActiveTimer('pump');
    }

    closeModal();
  };

  const handleDelete = () => {
    triggerHaptic('warning', preferences?.haptics);
    if (isFromActiveTimer) {
      if (window.confirm(t('common.discardTimerConfirm'))) {
        clearActiveTimer('pump');
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
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div
              className="modal-title-icon"
              style={{
                backgroundColor: 'var(--color-berry-light)',
                color: 'var(--color-berry)',
              }}
            >
              <PumpIcon size={18} />
            </div>
            <h2>
              {isFromActiveTimer
                ? (isDutch ? 'Kolven afronden' : 'Finish Pumping')
                : (isEditing ? t('pumpModal.titleEdit') : t('pumpModal.titleAdd'))}
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

        {/* Tab 1: Live Pump Timer */}
        {activeTab === 'TIMER' && !isEditing && !isFromFinishedTimer ? (
          <div className="modal-body" style={{ gap: '1.1rem', paddingTop: '0.9rem' }}>
            {/* Side selector */}
            <div className="form-group">
              <label className="form-label">{t('pumpModal.sideSelection')}</label>
              <div className="segmented-control">
                <button
                  type="button"
                  className={`segmented-btn ${side === 'BOTH' ? 'active' : ''}`}
                  onClick={() => handleSideChange('BOTH')}
                >
                  {t('pumpModal.bothSides')}
                </button>
                <button
                  type="button"
                  className={`segmented-btn ${side === 'LEFT' ? 'active' : ''}`}
                  onClick={() => handleSideChange('LEFT')}
                >
                  {t('pumpModal.leftOnly')}
                </button>
                <button
                  type="button"
                  className={`segmented-btn ${side === 'RIGHT' ? 'active' : ''}`}
                  onClick={() => handleSideChange('RIGHT')}
                >
                  {t('pumpModal.rightOnly')}
                </button>
              </div>
            </div>

            <button
              type="button"
              className="btn-primary"
              style={{
                width: '100%',
                minHeight: '56px',
                backgroundColor: 'var(--color-berry)',
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
                {isDutch ? 'Kolftimer starten' : 'Start Pump Timer'}
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
                ].map(p => (
                  <button
                    key={p.offset}
                    type="button"
                    className={`quick-preset-pill ${timerOffsetMinutes === p.offset ? 'active berry' : ''}`}
                    onClick={() => handleSelectTimerOffset(p.offset)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Tab 2: Manual Past Pump Form */
          <form onSubmit={handleSave}>
            <div className="modal-body">
              {/* Side Selection */}
              <div className="segmented-control">
                <button
                  type="button"
                  className={`segmented-btn ${side === 'BOTH' ? 'active' : ''}`}
                  onClick={() => handleSideChange('BOTH')}
                >
                  {t('pumpModal.bothSides')}
                </button>
                <button
                  type="button"
                  className={`segmented-btn ${side === 'LEFT' ? 'active' : ''}`}
                  onClick={() => handleSideChange('LEFT')}
                >
                  {t('pumpModal.leftOnly')}
                </button>
                <button
                  type="button"
                  className={`segmented-btn ${side === 'RIGHT' ? 'active' : ''}`}
                  onClick={() => handleSideChange('RIGHT')}
                >
                  {t('pumpModal.rightOnly')}
                </button>
              </div>

              {/* Total Expressed Summary Banner + Unit Switcher */}
              <div style={{
                backgroundColor: 'var(--color-berry-light)',
                color: 'var(--color-berry)',
                border: '1px solid rgba(136, 103, 123, 0.2)',
                borderRadius: 'var(--radius-md)',
                padding: '0.65rem 0.95rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {t('pumpModal.totalExpressed')}
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, lineHeight: 1.1 }}>
                    {totalAmount} <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{unit}</span>
                  </div>
                </div>

                <div className="bottle-unit-toggle">
                  <button
                    type="button"
                    className={`bottle-unit-btn ${unit === 'ml' ? 'active' : ''}`}
                    style={{ backgroundColor: unit === 'ml' ? 'var(--color-berry)' : 'transparent' }}
                    onClick={() => handleToggleUnit('ml')}
                  >
                    mL
                  </button>
                  <button
                    type="button"
                    className={`bottle-unit-btn ${unit === 'oz' ? 'active' : ''}`}
                    style={{ backgroundColor: unit === 'oz' ? 'var(--color-berry)' : 'transparent' }}
                    onClick={() => handleToggleUnit('oz')}
                  >
                    oz
                  </button>
                </div>
              </div>

              {/* Side Volume Inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: side === 'BOTH' ? '1fr 1fr' : '1fr', gap: '0.65rem' }}>
                {(side === 'LEFT' || side === 'BOTH') && (
                  <div className="pump-side-card" style={{ padding: '0.65rem 0.85rem' }}>
                    <div className="pump-side-header">
                      <span className="pump-side-title">{t('pumpModal.leftSide')}</span>
                      {side === 'BOTH' && (
                        <button
                          type="button"
                          className="pump-chip-btn"
                          onClick={copyLeftToRight}
                          title={t('pumpModal.copyToRight')}
                        >
                          ➔ R
                        </button>
                      )}
                    </div>
                    <div className="pump-input-row">
                      <button
                        type="button"
                        className="pump-stepper-btn"
                        onClick={() => adjustSide('LEFT', isMl ? -5 : -0.2)}
                        aria-label={isDutch ? 'Hoeveelheid verlagen' : 'Decrease amount'}
                      >
                        <Minus size={15} />
                      </button>
                      <input
                        type="number"
                        step={isMl ? '1' : '0.1'}
                        min="0"
                        className="pump-amount-input"
                        placeholder={isMl ? '50' : '1.7'}
                        value={leftAmount}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setLeftAmount(isNaN(val) ? '' : Math.max(0, val));
                        }}
                      />
                      <button
                        type="button"
                        className="pump-stepper-btn"
                        onClick={() => adjustSide('LEFT', isMl ? 5 : 0.2)}
                        aria-label={isDutch ? 'Hoeveelheid verhogen' : 'Increase amount'}
                      >
                        <Plus size={15} />
                      </button>
                    </div>
                  </div>
                )}

                {(side === 'RIGHT' || side === 'BOTH') && (
                  <div className="pump-side-card" style={{ padding: '0.65rem 0.85rem' }}>
                    <div className="pump-side-header">
                      <span className="pump-side-title">{t('pumpModal.rightSide')}</span>
                    </div>
                    <div className="pump-input-row">
                      <button
                        type="button"
                        className="pump-stepper-btn"
                        onClick={() => adjustSide('RIGHT', isMl ? -5 : -0.2)}
                        aria-label={isDutch ? 'Hoeveelheid verlagen' : 'Decrease amount'}
                      >
                        <Minus size={15} />
                      </button>
                      <input
                        type="number"
                        step={isMl ? '1' : '0.1'}
                        min="0"
                        className="pump-amount-input"
                        placeholder={isMl ? '50' : '1.7'}
                        value={rightAmount}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setRightAmount(isNaN(val) ? '' : Math.max(0, val));
                        }}
                      />
                      <button
                        type="button"
                        className="pump-stepper-btn"
                        onClick={() => adjustSide('RIGHT', isMl ? 5 : 0.2)}
                        aria-label={isDutch ? 'Hoeveelheid verhogen' : 'Increase amount'}
                      >
                        <Plus size={15} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Duration with Quick Presets */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>
                    {t('common.duration')} ({durationMin || 15} min)
                  </label>
                  <div className="quick-presets-row">
                    {[10, 15, 20, 30].map((m) => (
                      <button
                        key={m}
                        type="button"
                        className={`quick-preset-pill ${durationMin === m ? 'active berry' : ''}`}
                        onClick={() => {
                          triggerHaptic('light', preferences?.haptics);
                          setDurationMin(m);
                        }}
                      >
                        {m}m
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Time & Notes */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '0.65rem' }}>
                <div className="form-group">
                  <input
                    type="time"
                    className="form-input"
                    value={timeStr}
                    onChange={(e) => setTimeStr(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <input
                    type="text"
                    className="form-input"
                    placeholder={t('common.notes')}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
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
                style={{ backgroundColor: 'var(--color-berry)' }}
              >
                {isFromActiveTimer
                  ? (isDutch ? 'Sessie opslaan' : 'Save Session')
                  : (isEditing ? t('pumpModal.submitEdit') : t('pumpModal.submitAdd'))}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
