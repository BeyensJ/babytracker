import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Sparkles, X, AlertTriangle } from 'lucide-react';

export function DiaperModal() {
  const { activeModal, modalInitialData, closeModal, addEvent, updateEvent } = useApp();

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
    { id: 'YELLOW', label: 'Yellow', hex: '#E5B83B' },
    { id: 'MUSTARD', label: 'Mustard', hex: '#CE9E28' },
    { id: 'BROWN', label: 'Brown', hex: '#7A5034' },
    { id: 'GREEN', label: 'Green', hex: '#587A4C' },
    { id: 'BLACK', label: 'Black / Dark', hex: '#2C2B29' },
  ];

  const poopTextures = [
    { id: 'SEEDY', label: 'Seedy' },
    { id: 'MUSH', label: 'Mushy' },
    { id: 'RUN', label: 'Liquid / Runny' },
    { id: 'PEBBLE', label: 'Pebble' },
    { id: 'SOLID', label: 'Solid' },
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
            <h2>{isEditing ? 'Edit Diaper' : 'Log Diaper Change'}</h2>
          </div>
          <button onClick={closeModal} style={{ color: 'var(--text-tertiary)' }} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-body">
            {/* Contents Selector (Wet, Dirty, Dry) */}
            <div className="form-group">
              <label className="form-label">Diaper Contents</label>
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
                  💧 Wet
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
                  💩 Dirty
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
                  ✨ Dry
                </button>
              </div>
            </div>

            {/* Poop Details (if dirty) */}
            {poop && !dry && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', backgroundColor: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-md)' }}>
                {/* Poop Color */}
                <div className="form-group">
                  <label className="form-label">Color</label>
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
                  <label className="form-label">Texture</label>
                  <div className="chip-grid">
                    {poopTextures.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        className={`chip-btn ${texture === t.id ? 'selected' : ''}`}
                        onClick={() => setTexture(t.id)}
                      >
                        {t.label}
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
                  <span>⚠️ Diaper Blowout (leaked onto clothes)</span>
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
              <span>Diaper Rash observed</span>
            </label>

            {/* Time of Change */}
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
                placeholder="Applied diaper balm, changed outfit..."
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" style={{ backgroundColor: 'var(--color-sage)' }}>
              {isEditing ? 'Save Changes' : 'Log Diaper'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
