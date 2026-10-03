import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Sparkles, X, ChevronDown, ChevronUp, AlertCircle, Bell } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';
import { PhotoUploadField } from '../PhotoUploadField';

export function DiaperModal() {
  const {
    activeModal,
    modalInitialData,
    closeModal,
    openModal,
    addEvent,
    updateEvent,
    completeReminder,
    preferences,
    t,
    language
  } = useApp();
  const isDutch = language === 'nl';

  const isEditing = Boolean(modalInitialData && modalInitialData.id);

  const [pee, setPee] = useState(() => {
    return modalInitialData?.details?.pee !== undefined ? modalInitialData.details.pee : true;
  });

  const [poop, setPoop] = useState(() => {
    return Boolean(modalInitialData?.details?.poop);
  });

  const [dry, setDry] = useState(() => {
    return Boolean(modalInitialData?.details?.dry);
  });

  const [color, setColor] = useState(() => {
    return modalInitialData?.details?.color || 'YELLOW';
  });

  const [texture, setTexture] = useState(() => {
    return modalInitialData?.details?.texture || 'SEEDY';
  });

  const [blowout, setBlowout] = useState(() => {
    return Boolean(modalInitialData?.details?.blowout);
  });

  const [showPoopDetails, setShowPoopDetails] = useState(() => {
    return Boolean(
      modalInitialData?.details?.color ||
      modalInitialData?.details?.texture ||
      modalInitialData?.details?.blowout
    );
  });

  const [rash, setRash] = useState(() => {
    return Boolean(modalInitialData?.details?.rash);
  });

  const [photoUrl, setPhotoUrl] = useState(() => modalInitialData?.photoUrl || modalInitialData?.details?.photoUrl || null);
  const [note, setNote] = useState(modalInitialData?.note || '');

  const [timeStr, setTimeStr] = useState(() => {
    const d = new Date(modalInitialData?.beginDt || Date.now());
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  if (activeModal !== 'DIAPER') return null;

  const poopColors = [
    { id: 'YELLOW', label: isDutch ? 'Geel' : 'Yellow', hex: '#E5B83B' },
    { id: 'MUSTARD', label: isDutch ? 'Mosterd' : 'Mustard', hex: '#CE9E28' },
    { id: 'BROWN', label: isDutch ? 'Bruin' : 'Brown', hex: '#7A5034' },
    { id: 'GREEN', label: isDutch ? 'Groen' : 'Green', hex: '#587A4C' },
    { id: 'BLACK', label: isDutch ? 'Zwart' : 'Black', hex: '#2C2B29' },
  ];

  const poopTextures = [
    { id: 'SEEDY', label: isDutch ? 'Korrelig' : 'Seedy' },
    { id: 'MUSH', label: isDutch ? 'Papperig' : 'Mushy' },
    { id: 'RUN', label: isDutch ? 'Vloeibaar' : 'Runny' },
    { id: 'PEBBLE', label: isDutch ? 'Keuteltjes' : 'Pebble' },
    { id: 'SOLID', label: isDutch ? 'Vast' : 'Solid' },
  ];

  // Quick 1-tap Selection Handler
  const handleSelectType = (type) => {
    triggerHaptic('light', preferences?.haptics);
    if (type === 'WET') {
      setPee(true);
      setPoop(false);
      setDry(false);
    } else if (type === 'DIRTY') {
      setPee(false);
      setPoop(true);
      setDry(false);
    } else if (type === 'BOTH') {
      setPee(true);
      setPoop(true);
      setDry(false);
    } else if (type === 'DRY') {
      setPee(false);
      setPoop(false);
      setDry(true);
      setShowPoopDetails(false);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    const [h, m] = timeStr.split(':').map(Number);
    const dateObj = new Date(modalInitialData?.beginDt || Date.now());
    dateObj.setHours(h, m, 0, 0);
    const beginDt = dateObj.getTime();

    const eventPayload = {
      type: 'DIAPER',
      beginDt,
      endDt: null,
      durationMs: 0,
      photoUrl: photoUrl || null,
      details: {
        pee: dry ? false : pee,
        poop: dry ? false : poop,
        dry,
        color: poop ? color : '',
        texture: poop ? texture : '',
        blowout: poop ? blowout : false,
        rash,
        photoUrl: photoUrl || null,
      },
      note,
    };

    if (isEditing) {
      updateEvent(modalInitialData.id, eventPayload);
    } else {
      addEvent(eventPayload);
    }

    if (modalInitialData?.sourceReminderId) {
      completeReminder(modalInitialData.sourceReminderId, false);
    }

    closeModal();
  };

  const handleCreateReminderFromModal = () => {
    openModal('REMINDERS', {
      tab: 'create',
      activityType: 'DIAPER',
      title: isDutch ? 'Luier verversen' : 'Diaper Change',
      prefilledData: {
        pee: dry ? false : pee,
        poop: dry ? false : poop,
        rash,
        note,
      },
      note,
    });
  };

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-title-icon" style={{ backgroundColor: 'var(--color-sage-light)', color: 'var(--color-sage)' }}>
              <Sparkles size={18} />
            </div>
            <h2>{isEditing ? t('diaperModal.titleEdit') : t('diaperModal.titleAdd')}</h2>
          </div>
          <button onClick={closeModal} style={{ color: 'var(--text-tertiary)' }} aria-label={t('common.close')}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-body">
            {/* 4 Direct 1-Tap Contents Buttons */}
            <div className="form-group">
              <label className="form-label">{t('diaperModal.contents')}</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.45rem' }}>
                <button
                  type="button"
                  className={`chip-btn ${pee && !poop && !dry ? 'selected' : ''}`}
                  style={{ justifyContent: 'center', minHeight: '44px', padding: '0.6rem 0.35rem', fontSize: '0.86rem', fontWeight: 700, borderRadius: 'var(--radius-md)', whiteSpace: 'nowrap' }}
                  onClick={() => handleSelectType('WET')}
                >
                  💧 {t('diaperModal.wet')}
                </button>
                <button
                  type="button"
                  className={`chip-btn ${!pee && poop && !dry ? 'selected' : ''}`}
                  style={{ justifyContent: 'center', minHeight: '44px', padding: '0.6rem 0.35rem', fontSize: '0.86rem', fontWeight: 700, borderRadius: 'var(--radius-md)', whiteSpace: 'nowrap' }}
                  onClick={() => handleSelectType('DIRTY')}
                >
                  💩 {t('diaperModal.dirty')}
                </button>
                <button
                  type="button"
                  className={`chip-btn ${pee && poop && !dry ? 'selected' : ''}`}
                  style={{ justifyContent: 'center', minHeight: '44px', padding: '0.6rem 0.35rem', fontSize: '0.86rem', fontWeight: 700, borderRadius: 'var(--radius-md)', whiteSpace: 'nowrap' }}
                  onClick={() => handleSelectType('BOTH')}
                >
                  💧+💩 {isDutch ? 'Beide' : 'Both'}
                </button>
                <button
                  type="button"
                  className={`chip-btn ${dry ? 'selected' : ''}`}
                  style={{ justifyContent: 'center', minHeight: '44px', padding: '0.6rem 0.35rem', fontSize: '0.86rem', fontWeight: 700, borderRadius: 'var(--radius-md)', whiteSpace: 'nowrap' }}
                  onClick={() => handleSelectType('DRY')}
                >
                  ✨ {t('diaperModal.dry')}
                </button>
              </div>
            </div>

            {/* Optional Collapsible Poop Details (Color, Consistency, Blowout) */}
            {poop && !dry && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <button
                  type="button"
                  className="details-toggle-btn"
                  onClick={() => {
                    setShowPoopDetails(!showPoopDetails);
                    triggerHaptic('light', preferences?.haptics);
                  }}
                  style={{ color: showPoopDetails ? 'var(--color-sage)' : 'var(--text-secondary)' }}
                >
                  <span>{showPoopDetails ? t('common.fewerDetails') : t('diaperModal.poopDetails')}</span>
                  {showPoopDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {showPoopDetails && (
                  <div className="expandable-details-card">
                    {/* Poop Color */}
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.78rem' }}>{t('diaperModal.poopColor')}</label>
                      <div className="chip-grid">
                        {poopColors.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            className={`chip-btn ${color === c.id ? 'selected' : ''}`}
                            onClick={() => setColor(c.id)}
                          >
                            <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: c.hex, display: 'inline-block' }} />
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Poop Texture */}
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.78rem' }}>{t('diaperModal.consistency')}</label>
                      <div className="chip-grid">
                        {poopTextures.map(tOption => (
                          <button
                            key={tOption.id}
                            type="button"
                            className={`chip-btn ${texture === tOption.id ? 'selected' : ''}`}
                            onClick={() => setTexture(tOption.id)}
                          >
                            {tOption.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Blowout Checkbox */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, color: blowout ? 'var(--status-red)' : 'var(--text-primary)' }}>
                      <input
                        type="checkbox"
                        checked={blowout}
                        onChange={e => setBlowout(e.target.checked)}
                        style={{ width: 16, height: 16, accentColor: 'var(--status-red)' }}
                      />
                      <span>⚠️ {t('diaperModal.blowout')}</span>
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Rash Toggle & Time of Change */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.65rem', alignItems: 'center' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.82rem',
                fontWeight: 600,
                backgroundColor: rash ? 'var(--status-red-light)' : 'var(--bg-card-subtle)',
                color: rash ? 'var(--status-red)' : 'var(--text-secondary)',
                border: rash ? '1px solid var(--status-red-border)' : '1px solid var(--border-subtle)',
                padding: '0.55rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                userSelect: 'none',
              }}>
                <input
                  type="checkbox"
                  checked={rash}
                  onChange={e => setRash(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: 'var(--status-red)' }}
                />
                <span>{t('diaperModal.rash')}</span>
              </label>

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
                label={isDutch ? 'Foto toevoegen (bv. uitslag/stoelgang) 📸' : 'Add Photo (e.g. rash/stool) 📸'}
              />
            </div>

            {/* Notes */}
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

          <div className="modal-footer" style={{ display: 'flex', gap: '0.6rem' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleCreateReminderFromModal}
              title={t('reminders.setReminderButton')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Bell size={16} />
              <span>{t('reminders.setReminderButton')}</span>
            </button>
            <button
              type="submit"
              className="btn-primary"
              style={{ backgroundColor: 'var(--color-sage)', flex: 1 }}
            >
              {isEditing ? t('diaperModal.submitEdit') : t('diaperModal.submitAdd')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
