import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Milk, X } from 'lucide-react';

export function BottleModal() {
  const { activeModal, modalInitialData, closeModal, addEvent, updateEvent, preferences } = useApp();

  const isEditing = Boolean(modalInitialData && modalInitialData.id);
  const isMetric = preferences.volumeUnit === 'ml';

  const [volumeFloz, setVolumeFloz] = useState(() => {
    return modalInitialData?.details?.volumeFloz || 4.0;
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

  // Preset quick chips
  const ozPresets = [2.0, 3.0, 3.5, 4.0, 4.5, 5.0, 6.0];
  const mlPresets = [60, 90, 100, 120, 140, 150, 180];

  const handleSelectPreset = (val) => {
    if (isMetric) {
      setVolumeFloz(Math.round((val / 29.5735) * 10) / 10);
    } else {
      setVolumeFloz(val);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    const [h, m] = timeStr.split(':').map(Number);
    const dateObj = new Date(modalInitialData?.beginDt || Date.now());
    dateObj.setHours(h, m, 0, 0);
    const beginDt = dateObj.getTime();

    const eventPayload = {
      type: 'BOTTLE',
      beginDt,
      endDt: null,
      durationMs: 15 * 60 * 1000,
      details: {
        volumeFloz: Number(volumeFloz),
        milkType,
        formulaName: milkType === 'FORMULA' ? formulaName : '',
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

  const displayVolume = isMetric
    ? Math.round(volumeFloz * 29.5735)
    : volumeFloz;

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-title-icon" style={{ backgroundColor: 'var(--color-caramel-light)', color: 'var(--color-caramel)' }}>
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
            {/* Milk Type Toggle */}
            <div className="form-group">
              <label className="form-label">Milk Type</label>
              <div className="segmented-control">
                <button
                  type="button"
                  className={`segmented-btn ${milkType === 'BREAST_MILK' ? 'active' : ''}`}
                  onClick={() => setMilkType('BREAST_MILK')}
                >
                  Breast Milk
                </button>
                <button
                  type="button"
                  className={`segmented-btn ${milkType === 'FORMULA' ? 'active' : ''}`}
                  onClick={() => setMilkType('FORMULA')}
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
                  onChange={e => setFormulaName(e.target.value)}
                />
              </div>
            )}

            {/* Volume Input */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">Amount</label>
                <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-caramel)' }}>
                  {displayVolume} {isMetric ? 'mL' : 'oz'}
                </span>
              </div>
              <input
                type="range"
                min={isMetric ? 30 : 0.5}
                max={isMetric ? 300 : 10}
                step={isMetric ? 10 : 0.5}
                value={displayVolume}
                onChange={e => {
                  const val = parseFloat(e.target.value);
                  setVolumeFloz(isMetric ? Math.round((val / 29.5735) * 10) / 10 : val);
                }}
                style={{ width: '100%', accentColor: 'var(--color-caramel)' }}
              />
            </div>

            {/* Quick Presets */}
            <div className="form-group">
              <label className="form-label">Quick Presets</label>
              <div className="chip-grid">
                {(isMetric ? mlPresets : ozPresets).map(preset => {
                  const isSelected = isMetric
                    ? Math.abs(Math.round(volumeFloz * 29.5735) - preset) < 5
                    : Math.abs(volumeFloz - preset) < 0.1;

                  return (
                    <button
                      key={preset}
                      type="button"
                      className={`chip-btn ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelectPreset(preset)}
                    >
                      {preset} {isMetric ? 'mL' : 'oz'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time of Feed */}
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
                placeholder="Drank smoothly, warm bottle, burped well..."
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {isEditing ? 'Save Changes' : 'Log Bottle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
