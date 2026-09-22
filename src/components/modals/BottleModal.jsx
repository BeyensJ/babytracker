import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { triggerHaptic } from '../../utils/haptics';
import { Milk, X, Plus, Minus, Calculator, Sparkles, Check } from 'lucide-react';

export function BottleModal() {
  const { activeModal, modalInitialData, closeModal, addEvent, updateEvent, preferences } = useApp();

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
  const [calcMode, setCalcMode] = useState('DIRECT'); // 'DIRECT' | 'OFFERED_LEFT'
  const [offeredAmount, setOfferedAmount] = useState(() => (unit === 'ml' ? 150 : 5.0));
  const [leftoverAmount, setLeftoverAmount] = useState(0);

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
  const maxVolume = isMl ? 330 : 11.0;

  // Presets
  const mlPresets = [30, 60, 90, 120, 150, 180, 210, 240, 270, 300];
  const ozPresets = [1.0, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 6.0, 8.0];

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
        : Math.max(0, Math.min(maxVolume, Math.round((current + delta) * 100) / 100));
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
    setAmount(isMl ? Math.round(drank) : Math.round(drank * 100) / 100);
  };

  const handleLeftoverChange = (val) => {
    const left = parseFloat(val) || 0;
    setLeftoverAmount(left);
    const drank = Math.max(0, (parseFloat(offeredAmount) || 0) - left);
    setAmount(isMl ? Math.round(drank) : Math.round(drank * 100) / 100);
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
        calcMode,
        offeredAmount: calcMode === 'OFFERED_LEFT' ? offeredAmount : undefined,
        leftoverAmount: calcMode === 'OFFERED_LEFT' ? leftoverAmount : undefined,
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
            <h2>{isEditing ? 'Edit Bottle' : 'Log Bottle Feed'}</h2>
          </div>
          <button onClick={closeModal} style={{ color: 'var(--text-tertiary)' }} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-body">
            {/* Milk Type Selection */}
            <div className="form-group">
              <label className="form-label">Milk Type</label>
              <div className="segmented-control">
                <button
                  type="button"
                  className={`segmented-btn ${milkType === 'BREAST_MILK' ? 'active' : ''}`}
                  onClick={() => {
                    setMilkType('BREAST_MILK');
                    triggerHaptic('light', preferences?.haptics);
                  }}
                >
                  Breast Milk
                </button>
                <button
                  type="button"
                  className={`segmented-btn ${milkType === 'FORMULA' ? 'active' : ''}`}
                  onClick={() => {
                    setMilkType('FORMULA');
                    triggerHaptic('light', preferences?.haptics);
                  }}
                >
                  Formula
                </button>
              </div>
            </div>

            {/* Formula Brand Name (if formula) */}
            {milkType === 'FORMULA' && (
              <div className="form-group">
                <label className="form-label">Formula Brand / Type</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Kendamil, Enfamil, Similac"
                  value={formulaName}
                  onChange={(e) => setFormulaName(e.target.value)}
                />
              </div>
            )}

            {/* Precision Volume Hero Card */}
            <div className="bottle-volume-card">
              {/* Input Mode Selector */}
              <div className="segmented-control bottle-mode-toggle">
                <button
                  type="button"
                  className={`segmented-btn ${calcMode === 'DIRECT' ? 'active' : ''}`}
                  onClick={() => {
                    setCalcMode('DIRECT');
                    triggerHaptic('light', preferences?.haptics);
                  }}
                >
                  Exact Amount
                </button>
                <button
                  type="button"
                  className={`segmented-btn ${calcMode === 'OFFERED_LEFT' ? 'active' : ''}`}
                  onClick={() => {
                    setCalcMode('OFFERED_LEFT');
                    triggerHaptic('light', preferences?.haptics);
                  }}
                >
                  <Calculator size={13} style={{ marginRight: 4 }} />
                  Offered & Left
                </button>
              </div>

              {/* Calculator Box if in Offered/Left mode */}
              {calcMode === 'OFFERED_LEFT' && (
                <div className="bottle-calc-box">
                  <div className="bottle-calc-row">
                    <div className="bottle-calc-field">
                      <label className="bottle-calc-label">Prepared / Offered ({unit})</label>
                      <input
                        type="number"
                        className="bottle-calc-input"
                        step={isMl ? '5' : '0.25'}
                        min="0"
                        value={offeredAmount}
                        onChange={(e) => handleOfferedChange(e.target.value)}
                        placeholder="150"
                      />
                    </div>
                    <div className="bottle-calc-field">
                      <label className="bottle-calc-label">Left in Bottle ({unit})</label>
                      <input
                        type="number"
                        className="bottle-calc-input"
                        step={isMl ? '5' : '0.25'}
                        min="0"
                        value={leftoverAmount}
                        onChange={(e) => handleLeftoverChange(e.target.value)}
                        placeholder="35"
                      />
                    </div>
                  </div>
                  <div className="bottle-calc-result">
                    <span>Amount Baby Drank:</span>
                    <strong style={{ fontSize: '1rem' }}>
                      {amount} {unit}
                    </strong>
                  </div>
                </div>
              )}

              {/* Direct Volume Controls */}
              <div className="bottle-controls-col">
                  {/* Hero Number Display with Unit Toggle */}
                  <div className="bottle-hero-display">
                    <button
                      type="button"
                      className="bottle-step-btn primary"
                      onClick={() => handleAdjust(isMl ? -5 : -0.25)}
                      aria-label="Decrease amount"
                      title={isMl ? 'Decrease by 5 mL' : 'Decrease by 0.25 oz'}
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
                      className="bottle-step-btn primary"
                      onClick={() => handleAdjust(isMl ? 5 : 0.25)}
                      aria-label="Increase amount"
                      title={isMl ? 'Increase by 5 mL' : 'Increase by 0.25 oz'}
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

                  {/* Micro Stepper Buttons */}
                  <div className="bottle-steppers-row">
                    {isMl ? (
                      <>
                        <button
                          type="button"
                          className="bottle-step-btn"
                          onClick={() => handleAdjust(-30)}
                          title="Minus 30 mL (1 oz scoop)"
                        >
                          -30
                        </button>
                        <button
                          type="button"
                          className="bottle-step-btn"
                          onClick={() => handleAdjust(-10)}
                        >
                          -10
                        </button>
                        <button
                          type="button"
                          className="bottle-step-btn"
                          onClick={() => handleAdjust(-1)}
                          title="Fine adjust -1 mL"
                        >
                          -1
                        </button>
                        <button
                          type="button"
                          className="bottle-step-btn"
                          onClick={() => handleAdjust(1)}
                          title="Fine adjust +1 mL"
                        >
                          +1
                        </button>
                        <button
                          type="button"
                          className="bottle-step-btn"
                          onClick={() => handleAdjust(10)}
                        >
                          +10
                        </button>
                        <button
                          type="button"
                          className="bottle-step-btn"
                          onClick={() => handleAdjust(30)}
                          title="Plus 30 mL (1 oz scoop)"
                        >
                          +30
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="bottle-step-btn"
                          onClick={() => handleAdjust(-1.0)}
                        >
                          -1.0
                        </button>
                        <button
                          type="button"
                          className="bottle-step-btn"
                          onClick={() => handleAdjust(-0.5)}
                        >
                          -0.5
                        </button>
                        <button
                          type="button"
                          className="bottle-step-btn"
                          onClick={() => handleAdjust(-0.1)}
                          title="Fine adjust -0.1 oz"
                        >
                          -0.1
                        </button>
                        <button
                          type="button"
                          className="bottle-step-btn"
                          onClick={() => handleAdjust(0.1)}
                          title="Fine adjust +0.1 oz"
                        >
                          +0.1
                        </button>
                        <button
                          type="button"
                          className="bottle-step-btn"
                          onClick={() => handleAdjust(0.5)}
                        >
                          +0.5
                        </button>
                        <button
                          type="button"
                          className="bottle-step-btn"
                          onClick={() => handleAdjust(1.0)}
                        >
                          +1.0
                        </button>
                      </>
                    )}
                  </div>

                  {/* Range Slider Scrubber */}
                  <div className="bottle-slider-wrap">
                    <input
                      type="range"
                      className="bottle-range-slider"
                      min="0"
                      max={maxVolume}
                      step={isMl ? '1' : '0.05'}
                      value={amount || 0}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setAmount(isMl ? Math.round(val) : Math.round(val * 100) / 100);
                      }}
                    />
                    <div className="bottle-slider-labels">
                      <span>0 {unit}</span>
                      <span>
                        {isMl ? '150 mL' : '5 oz'}
                      </span>
                      <span>
                        {maxVolume} {unit}
                      </span>
                    </div>
                  </div>
                </div>

              {/* Quick Presets Chips */}
              <div>
                <label className="form-label" style={{ marginBottom: '0.4rem' }}>
                  Quick Presets
                </label>
                <div className="chip-grid">
                  {(isMl ? mlPresets : ozPresets).map((preset) => {
                    const isSelected =
                      Math.abs((parseFloat(amount) || 0) - preset) < (isMl ? 0.5 : 0.05);

                    return (
                      <button
                        key={preset}
                        type="button"
                        className={`chip-btn ${isSelected ? 'selected caramel' : ''}`}
                        onClick={() => handleSelectPreset(preset)}
                      >
                        {preset} {unit}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Time of Feed */}
            <div className="form-group">
              <label className="form-label">Time</label>
              <input
                type="time"
                className="form-input"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div className="form-group">
              <label className="form-label">Notes (optional)</label>
              <textarea
                className="form-textarea"
                rows="2"
                placeholder="Drank smoothly, warm bottle, burped well..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              style={{ backgroundColor: 'var(--color-caramel)' }}
            >
              {isEditing ? 'Save Changes' : 'Log Bottle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

