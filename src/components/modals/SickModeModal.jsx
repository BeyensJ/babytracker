import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Thermometer, X, Check, HeartHandshake, AlertCircle } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

export function SickModeModal() {
  const {
    activeModal,
    closeModal,
    activeChild,
    updateChild,
    language,
    preferences,
    t,
  } = useApp();

  const isDutch = language === 'nl';
  const sickMode = activeChild?.sickMode || {};
  const isCurrentlyActive = Boolean(sickMode.active);

  const symptomOptions = isDutch
    ? [
        { id: 'fever', label: 'Koorts' },
        { id: 'cough', label: 'Hoest' },
        { id: 'runny_nose', label: 'Loopneus' },
        { id: 'ear_pain', label: 'Oorpijn' },
        { id: 'teething', label: 'Tandjes' },
        { id: 'vomiting', label: 'Braken / Spugen' },
        { id: 'diarrhea', label: 'Diarree' },
        { id: 'rash', label: 'Uitslag' },
        { id: 'fussiness', label: 'Huilbui / Onrust' },
      ]
    : [
        { id: 'fever', label: 'Fever' },
        { id: 'cough', label: 'Cough' },
        { id: 'runny_nose', label: 'Runny Nose' },
        { id: 'ear_pain', label: 'Ear Pain' },
        { id: 'teething', label: 'Teething' },
        { id: 'vomiting', label: 'Vomiting' },
        { id: 'diarrhea', label: 'Diarrhea' },
        { id: 'rash', label: 'Skin Rash' },
        { id: 'fussiness', label: 'Fussy / Irritable' },
      ];

  const [isActive, setIsActive] = useState(isCurrentlyActive);
  const [selectedSymptoms, setSelectedSymptoms] = useState(() => sickMode.symptoms || ['fever']);
  const [customDiagnosis, setCustomDiagnosis] = useState(() => sickMode.customDiagnosis || '');
  const [notes, setNotes] = useState(() => sickMode.notes || '');

  const [dateStr, setDateStr] = useState(() => {
    const d = new Date(sickMode.startedAt || Date.now());
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });

  const [timeStr, setTimeStr] = useState(() => {
    const d = new Date(sickMode.startedAt || Date.now());
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  if (activeModal !== 'SICK_MODE') return null;

  const toggleSymptom = (id) => {
    setSelectedSymptoms((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleSave = (e) => {
    e.preventDefault();
    triggerHaptic('success', preferences?.haptics);

    const [y, mon, d] = (dateStr || '').split('-').map(Number);
    const [h, m] = (timeStr || '').split(':').map(Number);
    const dateObj = new Date(
      y || new Date().getFullYear(),
      mon !== undefined ? mon - 1 : new Date().getMonth(),
      d || new Date().getDate(),
      h || 0,
      m || 0,
      0,
      0
    );
    const startedAt = dateObj.getTime();

    const updatedSickMode = {
      active: isActive,
      startedAt: isActive ? (sickMode.startedAt || startedAt) : null,
      endedAt: isActive ? null : Date.now(),
      symptoms: selectedSymptoms,
      customDiagnosis: customDiagnosis.trim(),
      notes: notes.trim(),
    };

    updateChild(activeChild.id, { sickMode: updatedSickMode });
    closeModal();
  };

  const handleEndSickMode = () => {
    triggerHaptic('success', preferences?.haptics);
    updateChild(activeChild.id, {
      sickMode: {
        active: false,
        endedAt: Date.now(),
        startedAt: sickMode.startedAt,
        symptoms: sickMode.symptoms || [],
        customDiagnosis: sickMode.customDiagnosis || '',
        notes: sickMode.notes || '',
      },
    });
    closeModal();
  };

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-title-icon" style={{ backgroundColor: 'var(--color-health-light)', color: 'var(--color-health)' }}>
              <Thermometer size={18} />
            </div>
            <h2>{isDutch ? 'Ziekte-modus' : 'Sick Mode'}</h2>
          </div>
          <button onClick={closeModal} style={{ color: 'var(--text-tertiary)' }} aria-label={t('common.close')}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-body">
            {/* Toggle Status Card */}
            <div className={`sick-mode-toggle-banner ${isActive ? 'active' : 'inactive'}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="sick-mode-toggle-icon">
                  {isActive ? '🤒' : '👶'}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                    {isActive
                      ? (isDutch ? `${activeChild?.name} is ziek` : `${activeChild?.name} is sick`)
                      : (isDutch ? `${activeChild?.name} is weer beter` : `${activeChild?.name} is healthy`)}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                    {isActive
                      ? (isDutch ? 'Toont koortscurve, veilige doseringen & hydratatie' : 'Enables fever curve, safe doses & hydration monitor')
                      : (isDutch ? 'Ziekte-modus staat momenteel uitgeschakeld' : 'Sick mode is currently turned off')}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className={`switch-toggle-pill ${isActive ? 'active' : ''}`}
                onClick={() => {
                  triggerHaptic('light', preferences?.haptics);
                  setIsActive(!isActive);
                }}
              >
                {isActive ? (isDutch ? 'Actief' : 'Active') : (isDutch ? 'Inschakelen' : 'Enable')}
              </button>
            </div>

            {/* When Active: Configure Episode */}
            {isActive && (
              <>
                {/* Diagnosis / Illness Name */}
                <div className="form-group">
                  <label className="form-label">{isDutch ? 'Diagnose of type ziekte' : 'Diagnosis or Illness'}</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={isDutch ? 'bv. Koorts & verkoudheid, Oorontsteking, 6e ziekte...' : 'e.g. Fever & Cold, Ear Infection, Teething fever...'}
                    value={customDiagnosis}
                    onChange={(e) => setCustomDiagnosis(e.target.value)}
                  />
                </div>

                {/* Symptom Chips */}
                <div className="form-group">
                  <label className="form-label">{isDutch ? 'Symptomen' : 'Symptoms'}</label>
                  <div className="chip-grid">
                    {symptomOptions.map((sym) => {
                      const isSelected = selectedSymptoms.includes(sym.id);
                      return (
                        <button
                          key={sym.id}
                          type="button"
                          className={`chip-btn ${isSelected ? 'selected' : ''}`}
                          onClick={() => toggleSymptom(sym.id)}
                        >
                          {isSelected && <Check size={12} style={{ marginRight: 4 }} />}
                          {sym.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Start Date & Time */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.65rem' }}>
                  <div className="form-group">
                    <label className="form-label">{isDutch ? 'Ziek sinds datum' : 'Illness start date'}</label>
                    <input
                      type="date"
                      className="form-input"
                      value={dateStr}
                      onChange={(e) => setDateStr(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{isDutch ? 'Tijdstip' : 'Start time'}</label>
                    <input
                      type="time"
                      className="form-input"
                      value={timeStr}
                      onChange={(e) => setTimeStr(e.target.value)}
                    />
                  </div>
                </div>

                {/* Notes & Doctor Advice */}
                <div className="form-group">
                  <label className="form-label">{isDutch ? 'Observaties of doktersinstructies' : 'Notes & Physician Instructions'}</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    placeholder={isDutch ? 'bv. Dokter geraadpleegd, advies: Perdolan om de 6u, voldoende laten drinken.' : 'e.g. Pediatrician visit: alternate Tylenol & Motrin, push liquids.'}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Informational Guidance Box */}
            <div className="sick-mode-guidance-box">
              <AlertCircle size={16} color="var(--color-health)" style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {isDutch
                  ? 'In Ziekte-modus berekent Baby Tracker automatisch veilige wachttijden tussen dosissen (Perdolan min. 4-6u, Nurofen min. 6-8u) en monitort plasluiers om uitdroging te voorkomen.'
                  : 'In Sick Mode, Baby Tracker tracks safe dose countdowns (Paracetamol min 4-6h, Ibuprofen min 6-8h) and monitors wet diapers to prevent dehydration.'}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="modal-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
            {isCurrentlyActive ? (
              <button
                type="button"
                className="btn-danger-outline"
                onClick={handleEndSickMode}
                style={{ fontSize: '0.82rem', padding: '0.5rem 0.75rem' }}
              >
                <HeartHandshake size={14} style={{ marginRight: 4 }} />
                {isDutch ? 'Beter gemeld (uitschakelen)' : 'Baby is better (Turn off)'}
              </button>
            ) : (
              <div />
            )}

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn-secondary" onClick={closeModal}>
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn-primary" style={{ backgroundColor: 'var(--color-health)' }}>
                {isActive ? (isDutch ? 'Opslaan & Activeren' : 'Save & Activate') : (isDutch ? 'Opslaan' : 'Save')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
