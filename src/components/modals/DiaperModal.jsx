import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Sparkles, X, AlertTriangle } from 'lucide-react';

export function DiaperModal() {
  const { activeModal, modalInitialData, closeModal, addEvent, updateEvent, t, language } = useApp();

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

  const [rash, setRash] = useState(() => {
    return Boolean(modalInitialData?.details?.rash);
  });

  const [note, setNote] = useState(modalInitialData?.note || '');

  const [timeStr, setTimeStr] = useState(() => {
    const d = new Date(modalInitialData?.beginDt || Date.now());
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  if (activeModal !== 'DIAPER') return null;

  const poopColors = [
    { id: 'YELLOW', label: language === 'nl' ? 'Geel' : 'Yellow', hex: '#E5B83B' },
    { id: 'MUSTARD', label: language === 'nl' ? 'Mosterd' : 'Mustard', hex: '#CE9E28' },
    { id: 'BROWN', label: language === 'nl' ? 'Bruin' : 'Brown', hex: '#7A5034' },
    { id: 'GREEN', label: language === 'nl' ? 'Groen' : 'Green', hex: '#587A4C' },
    { id: 'BLACK', label: language === 'nl' ? 'Zwart / Donker' : 'Black / Dark', hex: '#2C2B29' },
  ];

  const poopTextures = [
    { id: 'SEEDY', label: language === 'nl' ? 'Korrelig' : 'Seedy' },
    { id: 'MUSH', label: language === 'nl' ? 'Papperig' : 'Mushy' },
    { id: 'RUN', label: language === 'nl' ? 'Vloeibaar / Waterig' : 'Liquid / Runny' },
    { id: 'PEBBLE', label: language === 'nl' ? 'Keuteltjes' : 'Pebble' },
    { id: 'SOLID', label: language === 'nl' ? 'Vast' : 'Solid' },
  ];

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
      details: {
        pee: dry ? false : pee,
        poop: dry ? false : poop,
        dry,
        color: poop ? color : '',
        texture: poop ? texture : '',
        blowout: poop ? blowout : false,
        rash,
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
            {/* Contents Selector (Wet, Dirty, Dry) */}
            <div className="form-group">
              <label className="form-label">{t('diaperModal.contents')}</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                <button
                  type="button"
                  className={`chip-btn ${pee && !dry ? 'selected' : ''}`}
                  style={{ justifyContent: 'center' }}
                  onClick={() => {
                    setDry(false);
                    setPee(!pee);
                  }}
                >
                  💧 {t('diaperModal.wet')}
                </button>
                <button
                  type="button"
                  className={`chip-btn ${poop && !dry ? 'selected' : ''}`}
                  style={{ justifyContent: 'center' }}
                  onClick={() => {
                    setDry(false);
                    setPoop(!poop);
                  }}
                >
                  💩 {t('diaperModal.dirty')}
                </button>
                <button
                  type="button"
                  className={`chip-btn ${dry ? 'selected' : ''}`}
                  style={{ justifyContent: 'center' }}
                  onClick={() => {
                    setDry(true);
                    setPee(false);
                    setPoop(false);
                  }}
                >
                  ✨ {t('diaperModal.dry')}
                </button>
              </div>
            </div>

            {/* Poop Details (if dirty) */}
            {poop && !dry && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', backgroundColor: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-md)' }}>
                {/* Poop Color */}
                <div className="form-group">
                  <label className="form-label">{t('diaperModal.poopColor')}</label>
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
                  <label className="form-label">{t('diaperModal.consistency')}</label>
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
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: blowout ? 'var(--status-red)' : 'var(--text-primary)' }}>
                  <input
                    type="checkbox"
                    checked={blowout}
                    onChange={e => setBlowout(e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: 'var(--status-red)' }}
                  />
                  <span>⚠️ {t('diaperModal.blowout')}</span>
                </label>
              </div>
            )}

            {/* Diaper Rash */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}>
              <input
                type="checkbox"
                checked={rash}
                onChange={e => setRash(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: 'var(--color-sage)' }}
              />
              <span>{t('diaperModal.rash')}</span>
            </label>

            {/* Time of Change */}
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
                placeholder={t('common.notes')}
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
              {isEditing ? t('diaperModal.submitEdit') : t('diaperModal.submitAdd')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
