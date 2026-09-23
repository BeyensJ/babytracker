import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Ruler, X } from 'lucide-react';

export function GrowthModal() {
  const { activeModal, modalInitialData, closeModal, addEvent, updateEvent, preferences, t, language } = useApp();

  const isEditing = Boolean(modalInitialData && modalInitialData.id);
  const isMetric = preferences.weightUnit === 'kg';

  // Weight
  const [weightInput, setWeightInput] = useState(() => {
    const rawKg = modalInitialData?.details?.weightKg;
    const rawLb = modalInitialData?.details?.weightLb;
    if (rawKg && isMetric) return String(rawKg);
    if (rawLb && !isMetric) return String(rawLb);
    if (rawLb && isMetric) return (rawLb * 0.453592).toFixed(2);
    if (rawKg && !isMetric) return (rawKg / 0.453592).toFixed(2);
    return '';
  });

  // Height
  const [heightInput, setHeightInput] = useState(() => {
    const rawCm = modalInitialData?.details?.heightCm;
    const rawIn = modalInitialData?.details?.heightIn;
    if (rawCm && preferences.lengthUnit === 'cm') return String(rawCm);
    if (rawIn && preferences.lengthUnit !== 'cm') return String(rawIn);
    if (rawIn && preferences.lengthUnit === 'cm') return (rawIn * 2.54).toFixed(1);
    if (rawCm && preferences.lengthUnit !== 'cm') return (rawCm / 2.54).toFixed(1);
    return '';
  });

  // Head circumference
  const [headInput, setHeadInput] = useState(() => {
    const rawHeadCm = modalInitialData?.details?.headCm;
    const rawHeadIn = modalInitialData?.details?.headIn;
    if (rawHeadCm && preferences.lengthUnit === 'cm') return String(rawHeadCm);
    if (rawHeadIn && preferences.lengthUnit !== 'cm') return String(rawHeadIn);
    if (rawHeadIn && preferences.lengthUnit === 'cm') return (rawHeadIn * 2.54).toFixed(1);
    if (rawHeadCm && preferences.lengthUnit !== 'cm') return (rawHeadCm / 2.54).toFixed(1);
    return '';
  });

  const [dateStr, setDateStr] = useState(() => {
    const d = new Date(modalInitialData?.beginDt || Date.now());
    return d.toISOString().split('T')[0];
  });

  const [note, setNote] = useState(modalInitialData?.note || '');

  if (activeModal !== 'GROWTH') return null;

  const handleSave = (e) => {
    e.preventDefault();
    const dateObj = new Date(dateStr);
    dateObj.setHours(12, 0, 0, 0);
    const beginDt = dateObj.getTime();

    const parsedWeight = parseFloat(weightInput);
    const hasWeight = !isNaN(parsedWeight) && parsedWeight > 0;
    let weightKg = null;
    let weightLb = null;
    if (hasWeight) {
      weightKg = isMetric ? parsedWeight : Math.round(parsedWeight * 0.453592 * 100) / 100;
      weightLb = isMetric ? Math.round((parsedWeight / 0.453592) * 100) / 100 : parsedWeight;
    }

    const parsedHeight = parseFloat(heightInput);
    const hasHeight = !isNaN(parsedHeight) && parsedHeight > 0;
    let heightCm = null;
    let heightIn = null;
    if (hasHeight) {
      heightCm = preferences.lengthUnit === 'cm' ? parsedHeight : Math.round(parsedHeight * 2.54 * 10) / 10;
      heightIn = preferences.lengthUnit === 'cm' ? Math.round((parsedHeight / 2.54) * 10) / 10 : parsedHeight;
    }

    const parsedHead = parseFloat(headInput);
    const hasHead = !isNaN(parsedHead) && parsedHead > 0;
    let headCm = null;
    let headIn = null;
    if (hasHead) {
      headCm = preferences.lengthUnit === 'cm' ? parsedHead : Math.round(parsedHead * 2.54 * 10) / 10;
      headIn = preferences.lengthUnit === 'cm' ? Math.round((parsedHead / 2.54) * 10) / 10 : parsedHead;
    }

    const eventPayload = {
      type: 'GROWTH',
      beginDt,
      endDt: null,
      durationMs: 0,
      details: {
        weightKg,
        weightLb,
        heightCm,
        heightIn,
        headCm,
        headIn,
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
            <div className="modal-title-icon" style={{ backgroundColor: 'var(--color-caramel-light)', color: 'var(--color-caramel)' }}>
              <Ruler size={18} />
            </div>
            <h2>{isEditing ? t('growthModal.titleEdit') : t('growthModal.titleAdd')}</h2>
          </div>
          <button onClick={closeModal} style={{ color: 'var(--text-tertiary)' }} aria-label={t('common.close')}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-body">
            {/* Weight */}
            <div className="form-group">
              <label className="form-label">{t('growthModal.weight', { unit: isMetric ? 'kg' : 'lbs' })}</label>
              <input
                type="number"
                step="0.05"
                min="1"
                max="100"
                className="form-input"
                value={weightInput}
                onChange={e => setWeightInput(e.target.value)}
                required
              />
            </div>

            {/* Height */}
            <div className="form-group">
              <label className="form-label">{t('growthModal.length', { unit: preferences.lengthUnit === 'cm' ? 'cm' : 'inches' })}</label>
              <input
                type="number"
                step="0.1"
                min="5"
                max="150"
                className="form-input"
                value={heightInput}
                onChange={e => setHeightInput(e.target.value)}
                required
              />
            </div>

            {/* Head Circumference */}
            <div className="form-group">
              <label className="form-label">{t('growthModal.head', { unit: preferences.lengthUnit === 'cm' ? 'cm' : 'inches' })}</label>
              <input
                type="number"
                step="0.1"
                min="5"
                max="100"
                className="form-input"
                placeholder={t('growthModal.headPlaceholder')}
                value={headInput}
                onChange={e => setHeadInput(e.target.value)}
              />
            </div>

            {/* Date */}
            <div className="form-group">
              <label className="form-label">{language === 'nl' ? 'Datum van meting' : 'Date of Measurement'}</label>
              <input
                type="date"
                className="form-input"
                value={dateStr}
                onChange={e => setDateStr(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div className="form-group">
              <label className="form-label">{t('common.notes')}</label>
              <textarea
                className="form-textarea"
                rows="2"
                placeholder={language === 'nl' ? 'Controle bij Kind & Gezin / kinderarts, percentielen...' : 'Pediatrician checkup notes, percentiles...'}
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={closeModal}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn-primary" style={{ backgroundColor: 'var(--color-caramel)' }}>
              {isEditing ? t('growthModal.submitEdit') : t('growthModal.submitAdd')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
