import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { triggerHaptic } from '../../utils/haptics';
import { Pipette, X, Plus, Minus, ArrowRightLeft, Clock } from 'lucide-react';
import { TimerStartCard } from '../TimerStartCard';
import { formatDurationMs } from '../../utils/formatters';

export function PumpModal() {
  const { activeModal, modalInitialData, closeModal, addEvent, updateEvent, preferences, startPumpTimer, t, language } = useApp();
  const isDutch = language === 'nl';

  const isEditing = Boolean(modalInitialData && modalInitialData.id);
  const defaultUnit = preferences.volumeUnit === 'ml' ? 'ml' : 'oz';

  const [unit, setUnit] = useState(() => {
    return modalInitialData?.details?.volumeUnit || defaultUnit;
  });

  const [side, setSide] = useState(() => {
    return modalInitialData?.details?.side || 'BOTH';
  });

  // Convert raw initial value to the active unit
  const getInitialValue = (valFloz, valMl, fallback) => {
    if (unit === 'ml') {
      if (valMl !== undefined && valMl !== null) return valMl;
      if (valFloz !== undefined && valFloz !== null) return Math.round(valFloz * 29.5735);
      return fallback;
    } else {
      if (valFloz !== undefined && valFloz !== null) return Math.round(valFloz * 100) / 100;
      if (valMl !== undefined && valMl !== null) return Math.round((valMl / 29.5735) * 100) / 100;
      return fallback;
    }
  };

  const defaultSingle = unit === 'ml' ? 60 : 2.0;

  const [leftAmount, setLeftAmount] = useState(() => {
    const initSide = modalInitialData?.details?.side || 'BOTH';
    if (initSide === 'RIGHT') return 0;
    return getInitialValue(modalInitialData?.details?.leftFloz, modalInitialData?.details?.leftAmount, defaultSingle);
  });

  const [rightAmount, setRightAmount] = useState(() => {
    const initSide = modalInitialData?.details?.side || 'BOTH';
    if (initSide === 'LEFT') return 0;
    return getInitialValue(modalInitialData?.details?.rightFloz, modalInitialData?.details?.rightAmount, defaultSingle);
  });

  const [durationMin, setDurationMin] = useState(() => {
    const ms = modalInitialData?.durationMs || 15 * 60 * 1000;
    return Math.floor(ms / 60000);
  });

  const [durationSec, setDurationSec] = useState(() => {
    const ms = modalInitialData?.durationMs || 0;
    return Math.round((ms % 60000) / 1000);
  });

  const [note, setNote] = useState(modalInitialData?.note || '');

  const [timeStr, setTimeStr] = useState(() => {
    const d = new Date(modalInitialData?.beginDt || Date.now());
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  });

  if (activeModal !== 'PUMP') return null;

  const isMl = unit === 'ml';
  const numLeft = side === 'RIGHT' ? 0 : (parseFloat(leftAmount) || 0);
  const numRight = side === 'LEFT' ? 0 : (parseFloat(rightAmount) || 0);
  const totalAmount = isMl
    ? Math.round(numLeft + numRight)
    : Math.round((numLeft + numRight) * 100) / 100;

  // Unit Switching
  const handleToggleUnit = (newUnit) => {
    if (newUnit === unit) return;
    triggerHaptic('light', preferences?.haptics);
    if (newUnit === 'ml') {
      setLeftAmount((prev) => Math.round((parseFloat(prev) || 0) * 29.5735));
      setRightAmount((prev) => Math.round((parseFloat(prev) || 0) * 29.5735));
    } else {
      setLeftAmount((prev) => Math.round(((parseFloat(prev) || 0) / 29.5735) * 100) / 100);
      setRightAmount((prev) => Math.round(((parseFloat(prev) || 0) / 29.5735) * 100) / 100);
    }
    setUnit(newUnit);
  };

  // Side Mode change
  const handleSideChange = (newSide) => {
    triggerHaptic('light', preferences?.haptics);
    setSide(newSide);
    if (newSide === 'LEFT') {
      if ((parseFloat(leftAmount) || 0) === 0) setLeftAmount(defaultSingle);
      setRightAmount(0);
    } else if (newSide === 'RIGHT') {
      if ((parseFloat(rightAmount) || 0) === 0) setRightAmount(defaultSingle);
      setLeftAmount(0);
    } else if (newSide === 'BOTH') {
      if ((parseFloat(leftAmount) || 0) === 0) setLeftAmount(defaultSingle);
      if ((parseFloat(rightAmount) || 0) === 0) setRightAmount(defaultSingle);
    }
  };

  // Stepper adjustments
  const adjustSide = (target, delta) => {
    triggerHaptic('light', preferences?.haptics);
    if (target === 'LEFT') {
      setLeftAmount((prev) => {
        const cur = parseFloat(prev) || 0;
        const nxt = isMl ? Math.max(0, Math.round(cur + delta)) : Math.max(0, Math.round((cur + delta) * 100) / 100);
        return nxt;
      });
    } else {
      setRightAmount((prev) => {
        const cur = parseFloat(prev) || 0;
        const nxt = isMl ? Math.max(0, Math.round(cur + delta)) : Math.max(0, Math.round((cur + delta) * 100) / 100);
        return nxt;
      });
    }
  };

  // Quick Helpers
  const copyLeftToRight = () => {
    triggerHaptic('light', preferences?.haptics);
    setRightAmount(leftAmount);
  };

  const copyRightToLeft = () => {
    triggerHaptic('light', preferences?.haptics);
    setLeftAmount(rightAmount);
  };

  const handleSave = (e) => {
    e.preventDefault();
    const parts = timeStr.split(':').map(Number);
    const h = parts[0] || 0;
    const m = parts[1] || 0;
    const s = parts.length > 2 ? parts[2] : 0;
    const dateObj = new Date(modalInitialData?.beginDt || Date.now());
    dateObj.setHours(h, m, s, 0);
    const beginDt = dateObj.getTime();
    const durationMs = (Math.max(0, Number(durationMin) || 0) * 60 + Math.max(0, Number(durationSec) || 0)) * 1000;

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

    closeModal();
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
              <Pipette size={18} />
            </div>
            <h2>{isEditing ? t('pumpModal.titleEdit') : t('pumpModal.titleAdd')}</h2>
          </div>
          <button onClick={closeModal} style={{ color: 'var(--text-tertiary)' }} aria-label={t('common.close')}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-body">
            {!isEditing && (
              <TimerStartCard
                title={t('timers.activePump')}
                subtitle={language === 'nl' ? 'Houd live de afkolfsessie bij met timer' : 'Track live pumping with custom start time'}
                icon={Pipette}
                iconColor="var(--color-berry)"
                iconBg="var(--color-berry-light)"
                actions={[
                  {
                    id: 'start-timer-pump',
                    label: language === 'nl' ? 'Kolftimer starten' : 'Start Pump Timer',
                    className: 'btn-primary',
                    style: { padding: '0.45rem 1rem', fontSize: '0.8rem', backgroundColor: 'var(--color-berry)' },
                  },
                ]}
                onStart={(startTs) => {
                  closeModal();
                  startPumpTimer(side, startTs);
                }}
              />
            )}

            {/* Pumping Side Toggle */}
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

            {/* Total Expressed Banner & Unit Switcher */}
            <div className="pump-total-banner">
              <div>
                <div className="pump-total-label">{t('pumpModal.totalExpressed')}</div>
                <div className="pump-total-value">
                  {totalAmount} <span style={{ fontSize: '1.2rem', fontWeight: 600 }}>{unit}</span>
                </div>
              </div>

              {/* On-the-fly unit toggle */}
              <div className="bottle-unit-toggle">
                <button
                  type="button"
                  className={`bottle-unit-btn ${unit === 'ml' ? 'active' : ''}`}
                  onClick={() => handleToggleUnit('ml')}
                >
                  mL
                </button>
                <button
                  type="button"
                  className={`bottle-unit-btn ${unit === 'oz' ? 'active' : ''}`}
                  onClick={() => handleToggleUnit('oz')}
                >
                  oz
                </button>
              </div>
            </div>

            {/* Left & Right Side Cards */}
            <div className="pump-sides-grid">
              {/* Left Side */}
              <div className={`pump-side-card ${side === 'RIGHT' ? 'disabled' : ''}`}>
                <div className="pump-side-header">
                  <span className="pump-side-title">{t('pumpModal.leftSide')}</span>
                  {side === 'BOTH' && (
                    <button
                      type="button"
                      className="pump-chip-btn"
                      onClick={copyLeftToRight}
                      title={t('pumpModal.copyToRight')}
                    >
                      {t('pumpModal.copyToRight')} ➔
                    </button>
                  )}
                </div>

                <div className="pump-input-row">
                  <button
                    type="button"
                    className="pump-stepper-btn"
                    onClick={() => adjustSide('LEFT', isMl ? -5 : -0.25)}
                    aria-label={isDutch ? 'Links verlagen' : 'Decrease Left amount'}
                  >
                    <Minus size={16} />
                  </button>
                  <input
                    type="number"
                    step={isMl ? '1' : '0.1'}
                    min="0"
                    className="pump-amount-input"
                    value={side === 'RIGHT' ? 0 : leftAmount}
                    disabled={side === 'RIGHT'}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setLeftAmount(isNaN(val) ? '' : Math.max(0, val));
                    }}
                  />
                  <button
                    type="button"
                    className="pump-stepper-btn"
                    onClick={() => adjustSide('LEFT', isMl ? 5 : 0.25)}
                    aria-label={isDutch ? 'Links verhogen' : 'Increase Left amount'}
                  >
                    <Plus size={16} />
                  </button>
                </div>

                {/* Quick Stepper Chips for Left */}
                <div className="pump-chips-row">
                  {isMl ? (
                    <>
                      <button type="button" className="pump-chip-btn" onClick={() => adjustSide('LEFT', -10)}>-10</button>
                      <button type="button" className="pump-chip-btn" onClick={() => adjustSide('LEFT', -5)}>-5</button>
                      <button type="button" className="pump-chip-btn" onClick={() => adjustSide('LEFT', 5)}>+5</button>
                      <button type="button" className="pump-chip-btn" onClick={() => adjustSide('LEFT', 10)}>+10</button>
                      <button type="button" className="pump-chip-btn" onClick={() => adjustSide('LEFT', 30)}>+30</button>
                    </>
                  ) : (
                    <>
                      <button type="button" className="pump-chip-btn" onClick={() => adjustSide('LEFT', -0.5)}>-0.5</button>
                      <button type="button" className="pump-chip-btn" onClick={() => adjustSide('LEFT', -0.25)}>-0.25</button>
                      <button type="button" className="pump-chip-btn" onClick={() => adjustSide('LEFT', 0.25)}>+0.25</button>
                      <button type="button" className="pump-chip-btn" onClick={() => adjustSide('LEFT', 0.5)}>+0.5</button>
                      <button type="button" className="pump-chip-btn" onClick={() => adjustSide('LEFT', 1.0)}>+1.0</button>
                    </>
                  )}
                </div>
              </div>

              {/* Right Side */}
              <div className={`pump-side-card ${side === 'LEFT' ? 'disabled' : ''}`}>
                <div className="pump-side-header">
                  <span className="pump-side-title">{t('pumpModal.rightSide')}</span>
                  {side === 'BOTH' && (
                    <button
                      type="button"
                      className="pump-chip-btn"
                      onClick={copyRightToLeft}
                      title={t('pumpModal.copyToLeft')}
                    >
                      {t('pumpModal.copyToLeft')} ➔
                    </button>
                  )}
                </div>

                <div className="pump-input-row">
                  <button
                    type="button"
                    className="pump-stepper-btn"
                    onClick={() => adjustSide('RIGHT', isMl ? -5 : -0.25)}
                    aria-label={isDutch ? 'Rechts verlagen' : 'Decrease Right amount'}
                  >
                    <Minus size={16} />
                  </button>
                  <input
                    type="number"
                    step={isMl ? '1' : '0.1'}
                    min="0"
                    className="pump-amount-input"
                    value={side === 'LEFT' ? 0 : rightAmount}
                    disabled={side === 'LEFT'}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setRightAmount(isNaN(val) ? '' : Math.max(0, val));
                    }}
                  />
                  <button
                    type="button"
                    className="pump-stepper-btn"
                    onClick={() => adjustSide('RIGHT', isMl ? 5 : 0.25)}
                    aria-label={isDutch ? 'Rechts verhogen' : 'Increase Right amount'}
                  >
                    <Plus size={16} />
                  </button>
                </div>

                {/* Quick Stepper Chips for Right */}
                <div className="pump-chips-row">
                  {isMl ? (
                    <>
                      <button type="button" className="pump-chip-btn" onClick={() => adjustSide('RIGHT', -10)}>-10</button>
                      <button type="button" className="pump-chip-btn" onClick={() => adjustSide('RIGHT', -5)}>-5</button>
                      <button type="button" className="pump-chip-btn" onClick={() => adjustSide('RIGHT', 5)}>+5</button>
                      <button type="button" className="pump-chip-btn" onClick={() => adjustSide('RIGHT', 10)}>+10</button>
                      <button type="button" className="pump-chip-btn" onClick={() => adjustSide('RIGHT', 30)}>+30</button>
                    </>
                  ) : (
                    <>
                      <button type="button" className="pump-chip-btn" onClick={() => adjustSide('RIGHT', -0.5)}>-0.5</button>
                      <button type="button" className="pump-chip-btn" onClick={() => adjustSide('RIGHT', -0.25)}>-0.25</button>
                      <button type="button" className="pump-chip-btn" onClick={() => adjustSide('RIGHT', 0.25)}>+0.25</button>
                      <button type="button" className="pump-chip-btn" onClick={() => adjustSide('RIGHT', 0.5)}>+0.5</button>
                      <button type="button" className="pump-chip-btn" onClick={() => adjustSide('RIGHT', 1.0)}>+1.0</button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Duration */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>
                  {t('pumpModal.sessionDuration')} ({formatDurationMs((Math.max(0, Number(durationMin) || 0) * 60 + Math.max(0, Number(durationSec) || 0)) * 1000, language)})
                </label>
                <div style={{ display: 'flex', gap: '0.3rem' }}>
                  {[10, 15, 20, 30].map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={`pump-chip-btn ${durationMin === m && Number(durationSec) === 0 ? 'chip-btn selected berry' : ''}`}
                      onClick={() => {
                        triggerHaptic('light', preferences?.haptics);
                        setDurationMin(m);
                        setDurationSec(0);
                      }}
                      style={{ padding: '0.2rem 0.5rem' }}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    min="0"
                    max="180"
                    className="form-input"
                    style={{ paddingRight: '2rem' }}
                    value={durationMin}
                    onChange={(e) => setDurationMin(e.target.value)}
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
                    value={durationSec}
                    onChange={(e) => setDurationSec(e.target.value)}
                    placeholder="0"
                  />
                  <span style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: 'var(--text-tertiary)', pointerEvents: 'none' }}>
                    sec
                  </span>
                </div>
              </div>
            </div>

            {/* Time of Pump */}
            <div className="form-group">
              <label className="form-label">{t('common.time')}</label>
              <input
                type="time"
                step="1"
                className="form-input"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div className="form-group">
              <label className="form-label">{t('common.notes')}</label>
              <textarea
                className="form-textarea"
                rows="2"
                placeholder={language === 'nl' ? 'In koelkast bewaard, ochtendsessie, elektrisch afgekolfd...' : 'Stored in fridge bag, morning pump, electric pump...'}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={closeModal}>
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="btn-primary"
              style={{ backgroundColor: 'var(--color-berry)' }}
            >
              {isEditing ? t('pumpModal.submitEdit') : t('pumpModal.submitAdd')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

