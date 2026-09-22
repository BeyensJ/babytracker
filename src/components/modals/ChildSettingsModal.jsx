import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Baby, X } from 'lucide-react';

export function ChildSettingsModal() {
  const { activeModal, modalInitialData, closeModal, addChild, updateChild } = useApp();

  const isEditing = Boolean(modalInitialData && modalInitialData.id);

  const [name, setName] = useState(() => modalInitialData?.name || '');
  const [birthdate, setBirthdate] = useState(() => modalInitialData?.birthdate || new Date().toISOString().split('T')[0]);
  const [birthWeightLb, setBirthWeightLb] = useState(() => modalInitialData?.birthWeightLb || '');
  const [birthHeightIn, setBirthHeightIn] = useState(() => modalInitialData?.birthHeightIn || '');
  const [avatarColor, setAvatarColor] = useState(() => modalInitialData?.avatarColor || 'terracotta');

  if (activeModal !== 'CHILD_SETTINGS') return null;

  const colorOptions = [
    { id: 'terracotta', hex: 'var(--color-terracotta)', label: 'Terracotta' },
    { id: 'sage', hex: 'var(--color-sage)', label: 'Sage' },
    { id: 'caramel', hex: 'var(--color-caramel)', label: 'Caramel' },
    { id: 'slate', hex: 'var(--color-slate)', label: 'Slate' },
    { id: 'berry', hex: 'var(--color-berry)', label: 'Berry' },
  ];

  const handleSave = (e) => {
    e.preventDefault();
    const payload = {
      name: name.trim() || 'Baby',
      birthdate,
      birthWeightLb: parseFloat(birthWeightLb) || null,
      birthHeightIn: parseFloat(birthHeightIn) || null,
      avatarColor,
    };

    if (isEditing) {
      updateChild(modalInitialData.id, payload);
    } else {
      addChild(payload);
    }

    closeModal();
  };

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-title-icon" style={{ backgroundColor: 'var(--color-terracotta-light)', color: 'var(--color-terracotta)' }}>
              <Baby size={18} />
            </div>
            <h2>{isEditing ? 'Edit Child Profile' : 'Add Child Profile'}</h2>
          </div>
          <button onClick={closeModal} style={{ color: 'var(--text-tertiary)' }} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Baby's Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Rowan, Maya, Liam"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Birth Date</label>
              <input
                type="date"
                className="form-input"
                value={birthdate}
                onChange={e => setBirthdate(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Birth Weight (lbs)</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  placeholder="e.g. 7.5"
                  value={birthWeightLb}
                  onChange={e => setBirthWeightLb(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Birth Length (in)</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  placeholder="e.g. 20.0"
                  value={birthHeightIn}
                  onChange={e => setBirthHeightIn(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Theme Color</label>
              <div className="chip-grid">
                {colorOptions.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    className={`chip-btn ${avatarColor === c.id ? 'selected' : ''}`}
                    onClick={() => setAvatarColor(c.id)}
                  >
                    <span style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: c.hex, display: 'inline-block' }} />
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {isEditing ? 'Save Profile' : 'Add Child'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
