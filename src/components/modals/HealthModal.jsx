import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Stethoscope, X } from 'lucide-react';

export function HealthModal() {
  const { activeModal, modalInitialData, closeModal, addEvent, updateEvent, preferences, t, language } = useApp();

  const isEditing = Boolean(modalInitialData && modalInitialData.id);
  const isCelsius = preferences.tempUnit === 'C';

  const [subType, setSubType] = useState(() => {
    if (modalInitialData?.details?.temperatureF || modalInitialData?.details?.temperatureC) return 'TEMP';
    if (modalInitialData?.details?.vaccineName) return 'VACCINE';
    if (modalInitialData?.details?.doctorName || (!modalInitialData?.details?.medicineName && modalInitialData?.note)) return 'VISIT';
    return 'MED';
  });

  const [medicineName, setMedicineName] = useState(() => modalInitialData?.details?.medicineName || '');
  const [dosage, setDosage] = useState(() => modalInitialData?.details?.dosage || '');
  const [doctorName, setDoctorName] = useState(() => modalInitialData?.details?.doctorName || '');
  const [tempInput, setTempInput] = useState(() => {
    const rawC = modalInitialData?.details?.temperatureC;
    const rawF = modalInitialData?.details?.temperatureF;
    if (rawC && isCelsius) return String(rawC);
    if (rawF && !isCelsius) return String(rawF);
    if (rawC && !isCelsius) return ((rawC * 9) / 5 + 32).toFixed(1);
    if (rawF && isCelsius) return (((rawF - 32) * 5) / 9).toFixed(1);
    return isCelsius ? '37.0' : '98.6';
  });
  const [vaccineName, setVaccineName] = useState(() => modalInitialData?.details?.vaccineName || '');
  const [note, setNote] = useState(modalInitialData?.note || '');
  const [timeStr, setTimeStr] = useState(() => {
    const d = new Date(modalInitialData?.beginDt || Date.now());
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  if (activeModal !== 'HEALTH') return null;

  const commonMeds = language === 'nl' ? [
    'Perdolan (Paracetamol)',
    'Dafalgan siroop',
    'Vitamine D (D-Cure)',
    'Fysiologisch serum',
    'Infacol krampjes',
    'Probiotica baby'
  ] : [
    'Infant Tylenol (Acetaminophen)',
    'Motrin (Ibuprofen)',
    'Vitamin D Drops',
    'Vitamin K',
    'Gas Drops (Simethicone)',
    'Probiotic Drops'
  ];

  const handleSave = (e) => {
    e.preventDefault();
    const [h, m] = timeStr.split(':').map(Number);
    const dateObj = new Date(modalInitialData?.beginDt || Date.now());
    dateObj.setHours(h, m, 0, 0);
    const beginDt = dateObj.getTime();

    let tempF = null;
    let tempC = null;
    if (subType === 'TEMP') {
      const parsedTemp = parseFloat(tempInput);
      if (!isNaN(parsedTemp)) {
        tempC = isCelsius ? parsedTemp : Math.round((((parsedTemp - 32) * 5) / 9) * 10) / 10;
        tempF = isCelsius ? Math.round(((parsedTemp * 9) / 5 + 32) * 10) / 10 : parsedTemp;
      }
    }

    const eventPayload = {
      type: 'HEALTH',
      beginDt,
      endDt: null,
      durationMs: 0,
      details: {
        medicineName: subType === 'MED' ? medicineName : '',
        dosage: subType === 'MED' ? dosage : '',
        temperatureC: tempC,
        temperatureF: tempF,
        doctorName: subType === 'VISIT' ? doctorName : '',
        vaccineName: subType === 'VACCINE' ? vaccineName : '',
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
            <div className="modal-title-icon" style={{ backgroundColor: 'var(--color-sage-light)', color: 'var(--color-sage)' }}>
              <Stethoscope size={18} />
            </div>
            <h2>{isEditing ? t('healthModal.titleEdit') : t('healthModal.titleAdd')}</h2>
          </div>
          <button onClick={closeModal} style={{ color: 'var(--text-tertiary)' }} aria-label={t('common.close')}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-body">
            {/* Health Category Subtype */}
            <div className="form-group">
              <label className="form-label">{language === 'nl' ? 'Categorie' : 'Category'}</label>
              <div className="segmented-control">
                <button
                  type="button"
                  className={`segmented-btn ${subType === 'MED' ? 'active' : ''}`}
                  onClick={() => setSubType('MED')}
                >
                  {language === 'nl' ? 'Medicatie' : 'Medicine'}
                </button>
                <button
                  type="button"
                  className={`segmented-btn ${subType === 'TEMP' ? 'active' : ''}`}
                  onClick={() => setSubType('TEMP')}
                >
                  {language === 'nl' ? 'Temperatuur' : 'Temperature'}
                </button>
                <button
                  type="button"
                  className={`segmented-btn ${subType === 'VISIT' ? 'active' : ''}`}
                  onClick={() => setSubType('VISIT')}
                >
                  {language === 'nl' ? 'Doktersbezoek' : 'Doctor Visit'}
                </button>
                <button
                  type="button"
                  className={`segmented-btn ${subType === 'VACCINE' ? 'active' : ''}`}
                  onClick={() => setSubType('VACCINE')}
                >
                  {language === 'nl' ? 'Vaccinatie' : 'Vaccine'}
                </button>
              </div>
            </div>

            {/* Medicine Fields */}
            {subType === 'MED' && (
              <>
                <div className="form-group">
                  <label className="form-label">{language === 'nl' ? 'Naam geneesmiddel' : 'Medication Name'}</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={language === 'nl' ? 'bv. Perdolan baby, Vitamine D' : 'e.g. Tylenol, Vitamin D'}
                    value={medicineName}
                    onChange={e => setMedicineName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{language === 'nl' ? 'Veelgebruikte medicatie' : 'Common Medications'}</label>
                  <div className="chip-grid">
                    {commonMeds.map(m => (
                      <button
                        key={m}
                        type="button"
                        className={`chip-btn ${medicineName === m ? 'selected' : ''}`}
                        onClick={() => setMedicineName(m)}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">{language === 'nl' ? 'Dosis / hoeveelheid' : 'Dose / Amount'}</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={language === 'nl' ? 'bv. 1 suppo (100mg), 6 druppeltjes' : 'e.g. 1.25 mL, 1 drop, 400 IU'}
                    value={dosage}
                    onChange={e => setDosage(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Temperature Fields */}
            {subType === 'TEMP' && (
              <div className="form-group">
                <label className="form-label">{t('healthModal.tempValue', { unit: isCelsius ? '°C' : '°F' })}</label>
                <input
                  type="number"
                  step="0.1"
                  min={isCelsius ? 34 : 93}
                  max={isCelsius ? 42 : 108}
                  className="form-input"
                  value={tempInput}
                  onChange={e => setTempInput(e.target.value)}
                  required
                />
              </div>
            )}

            {/* Doctor Visit Fields */}
            {subType === 'VISIT' && (
              <div className="form-group">
                <label className="form-label">{language === 'nl' ? 'Arts / Kind & Gezin / Reden' : 'Doctor / Clinic / Reason'}</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={language === 'nl' ? 'bv. Kind & Gezin consult, Kinderarts, Huisarts' : 'e.g. Pediatrician, 2 Month Checkup, Dr. Jansen'}
                  value={doctorName}
                  onChange={e => setDoctorName(e.target.value)}
                />
              </div>
            )}

            {/* Vaccine Fields */}
            {subType === 'VACCINE' && (
              <div className="form-group">
                <label className="form-label">{t('healthModal.vaccineName')}</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={language === 'nl' ? 'bv. Hexyon, Prevenar, RotaTeq (8 weken prikjes)' : 'e.g. DTaP, Rotavirus, Hep B, 2 Month shots'}
                  value={vaccineName}
                  onChange={e => setVaccineName(e.target.value)}
                  required
                />
              </div>
            )}

            {/* Time */}
            <div className="form-group">
              <label className="form-label">{t('common.time')}</label>
              <input
                type="time"
                className="form-input"
                value={timeStr}
                onChange={e => setTimeStr(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div className="form-group">
              <label className="form-label">{t('common.notes')}</label>
              <textarea
                className="form-textarea"
                rows="2"
                placeholder={language === 'nl' ? 'Koorts na prikje, huilerig, goed gedronken...' : 'Reason given, pediatrician advised, mild fussiness...'}
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={closeModal}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn-primary" style={{ backgroundColor: 'var(--color-sage)' }}>
              {isEditing ? t('healthModal.submitEdit') : t('healthModal.submitAdd')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
