import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { triggerHaptic } from '../../utils/haptics';
import { Milk, X, Plus, Minus, Calculator, ChevronDown, ChevronUp } from 'lucide-react';

export function BottleModal() {
  const { activeModal, modalInitialData, closeModal, addEvent, updateEvent, preferences, t, language } = useApp();
  const isDutch = language === 'nl';

  const isEditing = Boolean(modalInitialData && modalInitialData.id);
  const defaultUnit = preferences.volumeUnit === 'ml' ? 'ml' : 'oz';

  const [unit, setUnit] = useState(() => {
    return modalInitialData?.details?.volumeUnit || defaultUnit;
  });

  const [amount, setAmount] = useState(() => {
    const rawFloz = modalInitialData?.details?.volumeFloz;
    if (rawFloz !== undefined && rawFloz !== null) {
      if (defaultUnit === 'ml') {
        return Math.round(rawFloz * 29.5735);
      }
      return Math.round(rawFloz * 100) / 100;
    }
    return defaultUnit === 'ml' ? 120 : 4.0;
  });

  // Offered vs Leftover Subtraction Mode
  const [calcMode, setCalcMode] = useState(() => {
    return modalInitialData?.details?.calcMode || 'DIRECT';
  });
  const [showCalc, setShowCalc] = useState(() => {
    return Boolean(
      modalInitialData?.details?.calcMode === 'OFFERED_LEFT' ||
      modalInitialData?.details?.offeredAmount ||
      modalInitialData?.details?.leftoverAmount
    );
  });
  const [offeredAmount, setOfferedAmount] = useState(() => {
    return modalInitialData?.details?.offeredAmount || (unit === 'ml' ? 150 : 5.0);
  });
  const [leftoverAmount, setLeftoverAmount] = useState(() => {
    return modalInitialData?.details?.leftoverAmount || 0;
  });

  const [milkType, setMilkType] = useState(() => {
    return modalInitialData?.details?.milkType || 'BREAST_MILK';
  });

  const [formulaName, setFormulaName] = useState(() => {
    return modalInitialData?.details?.formulaName || '';
  });

  const [note, setNote] = useState(modalInitialData?.note || '');

  const [timeStr, setTimeStr] = useState(() => {
    const d = new Date(modalInitialData?.beginDt || Date.now());
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  if (activeModal !== 'BOTTLE') return null;

  const isMl = unit === 'ml';
  const maxVolume = isMl ? 350 : 12.0;

  // Curated quick presets (5 popular baby bottle sizes)
  const mlPresets = [60, 90, 120, 150, 180, 210];
  const ozPresets = [2.0, 3.0, 4.0, 5.0, 6.0, 7.0];

  // Unit Switching
  const handleToggleUnit = (newUnit) => {
    if (newUnit === unit) return;
    triggerHaptic('light', preferences?.haptics);
    if (newUnit === 'ml') {
      const converted = Math.round(amount * 29.5735);
      setAmount(converted);
      setOfferedAmount(Math.round(offeredAmount * 29.5735));
      setLeftoverAmount(Math.round(leftoverAmount * 29.5735));
    } else {
      const converted = Math.round((amount / 29.5735) * 100) / 100;
      setAmount(converted);
      setOfferedAmount(Math.round((offeredAmount / 29.5735) * 100) / 100);
      setLeftoverAmount(Math.round((leftoverAmount / 29.5735) * 100) / 100);
    }
    setUnit(newUnit);
  };

  // Adjust Amount by delta
  const handleAdjust = (delta) => {
    triggerHaptic('light', preferences?.haptics);
    setAmount((prev) => {
      const current = parseFloat(prev) || 0;
      const next = isMl
        ? Math.max(0, Math.min(maxVolume, Math.round(current + delta)))
        : Math.max(0, Math.min(maxVolume, Math.round((current + delta) * 10) / 10));
      return next;
    });
  };

  // Preset Selection
  const handleSelectPreset = (val) => {
    triggerHaptic('light', preferences?.haptics);
    setAmount(val);
  };

  // Subtraction updates
  const handleOfferedChange = (val) => {
    const off = parseFloat(val) || 0;
    setOfferedAmount(off);
    const drank = Math.max(0, off - (parseFloat(leftoverAmount) || 0));
    setAmount(isMl ? Math.round(drank) : Math.round(drank * 10) / 10);
  };

  const handleLeftoverChange = (val) => {
    const left = parseFloat(val) || 0;
    setLeftoverAmount(left);
    const drank = Math.max(0, (parseFloat(offeredAmount) || 0) - left);
    setAmount(isMl ? Math.round(drank) : Math.round(drank * 10) / 10);
  };

  const toggleCalculator = () => {
    triggerHaptic('light', preferences?.haptics);
    const next = !showCalc;
    setShowCalc(next);
    setCalcMode(next ? 'OFFERED_LEFT' : 'DIRECT');
  };

  const handleSave = (e) => {
    e.preventDefault();
    const [h, m] = timeStr.split(':').map(Number);
    const dateObj = new Date(modalInitialData?.beginDt || Date.now());
    dateObj.setHours(h, m, 0, 0);
    const beginDt = dateObj.getTime();

    // Preserve exact fl oz conversion
    const numAmount = parseFloat(amount) || 0;
    const finalFloz = isMl ? numAmount / 29.5735 : numAmount;

    const eventPayload = {
      type: 'BOTTLE',
      beginDt,
      endDt: null,
      durationMs: 15 * 60 * 1000,
      details: {
        volumeFloz: Math.round(finalFloz * 10000) / 10000,
        volumeUnit: unit,
        inputAmount: numAmount,
        milkType,
        formulaName: milkType === 'FORMULA' ? formulaName : '',
        calcMode: showCalc ? 'OFFERED_LEFT' : 'DIRECT',
        offeredAmount: showCalc ? offeredAmount : undefined,
        leftoverAmount: showCalc ? leftoverAmount : undefined,
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
                backgroundColor: 'var(--color-caramel-light)',
                color: 'var(--color-caramel)',
              }}
            >
              <Milk size={18} />
            </div>
            <h2>{isEditing ? t('bottleModal.titleEdit') : t('bottleModal.titleAdd')}</h2>
          </div>
          <button onClick={closeModal} style={{ color: 'var(--text-tertiary)' }} aria-label={t('common.close')}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-body">
            {/* Milk Type Selection */}
            <div className="segmented-control">
              <button
                type="button"
                className={`segmented-btn ${milkType === 'BREAST_MILK' ? 'active' : ''}`}
                onClick={() => {
                  setMilkType('BREAST_MILK');
                  triggerHaptic('light', preferences?.haptics);
                }}
              >
                {t('bottleModal.breastMilk')}
              </button>
              <button
                type="button"
                className={`segmented-btn ${milkType === 'FORMULA' ? 'active' : ''}`}
                onClick={() => {
                  setMilkType('FORMULA');
                  triggerHaptic('light', preferences?.haptics);
                }}
              >
                {t('bottleModal.formula')}
              </button>
            </div>

            {/* Formula Brand Name (if formula) */}
            {milkType === 'FORMULA' && (
              <div className="form-group" style={{ marginTop: '-0.2rem' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder={t('bottleModal.formulaPlaceholder')}
                  value={formulaName}
                  onChange={(e) => setFormulaName(e.target.value)}
                />
              </div>
            )}

            {/* Streamlined Volume Hero Card */}
            <div className="bottle-volume-card">
              <div className="bottle-hero-display">
                <button
                  type="button"
                  className="bottle-step-btn"
                  onClick={() => handleAdjust(isMl ? -10 : -0.5)}
                  aria-label={isDutch ? 'Hoeveelheid verlagen' : 'Decrease amount'}
                  title={isMl ? '-10 mL' : '-0.5 oz'}
                >
                  <Minus size={18} />
                </button>

                <div className="bottle-number-input-wrap">
                  <input
                    type="number"
                    className="bottle-number-input"
                    step={isMl ? '1' : '0.1'}
                    min="0"
                    max={maxVolume}
                    value={amount}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setAmount(isNaN(val) ? '' : Math.max(0, Math.min(maxVolume, val)));
                    }}
                  />
                </div>

                <button
                  type="button"
                  className="bottle-step-btn"
                  onClick={() => handleAdjust(isMl ? 10 : 0.5)}
                  aria-label={isDutch ? 'Hoeveelheid verhogen' : 'Increase amount'}
                  title={isMl ? '+10 mL' : '+0.5 oz'}
                >
                  <Plus size={18} />
                </button>

                {/* Unit Switcher */}
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

              {/* Quick Presets Row */}
              <div className="quick-presets-row">
                {(isMl ? mlPresets : ozPresets).map((preset) => {
                  const isSelected =
                    Math.abs((parseFloat(amount) || 0) - preset) < (isMl ? 0.5 : 0.05);

                  return (
                    <button
                      key={preset}
                      type="button"
                      className={`quick-preset-pill ${isSelected ? 'active' : ''}`}
                      onClick={() => handleSelectPreset(preset)}
                    >
                      {preset}
                    </button>
                  );
                })}
              </div>

              {/* Expandable Leftover Deduction Helper */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <button
                  type="button"
                  className="details-toggle-btn"
                  onClick={toggleCalculator}
                  style={{ color: showCalc ? 'var(--color-caramel)' : 'var(--text-tertiary)' }}
                >
                  <Calculator size={14} />
                  <span>{showCalc ? t('bottleModal.hideCalculator') : t('bottleModal.deductLeftover')}</span>
                  {showCalc ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {showCalc && (
                  <div className="expandable-details-card" style={{ padding: '0.65rem 0.85rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.72rem' }}>
                          {t('bottleModal.offeredLabel', { unit })}
                        </label>
                        <input
                          type="number"
                          className="form-input"
                          style={{ padding: '0.4rem 0.6rem', fontSize: '0.9rem' }}
                          step={isMl ? '5' : '0.25'}
                          min="0"
                          value={offeredAmount}
                          onChange={(e) => handleOfferedChange(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.72rem' }}>
                          {t('bottleModal.leftoverLabel', { unit })}
                        </label>
                        <input
                          type="number"
                          className="form-input"
                          style={{ padding: '0.4rem 0.6rem', fontSize: '0.9rem' }}
                          step={isMl ? '5' : '0.25'}
                          min="0"
                          value={leftoverAmount}
                          onChange={(e) => handleLeftoverChange(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Time of Feed & Quick Note */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '0.65rem' }}>
              <div className="form-group">
                <label className="form-label">{t('common.time')}</label>
                <input
                  type="time"
                  className="form-input"
                  value={timeStr}
                  onChange={(e) => setTimeStr(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('common.notes')}</label>
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
            <button type="button" className="btn-secondary" onClick={closeModal}>
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="btn-primary"
              style={{ backgroundColor: 'var(--color-caramel)' }}
            >
              {isEditing ? t('bottleModal.submitEdit') : t('bottleModal.submitAdd')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
