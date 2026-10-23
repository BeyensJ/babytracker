import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Baby, X } from 'lucide-react';

export function ChildSettingsModal() {
  const { activeModal, modalInitialData, closeModal, addChild, updateChild, preferences, t, language } = useApp();

  const isEditing = Boolean(modalInitialData && modalInitialData.id);
  const isMetric = preferences?.weightUnit === 'kg';

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
      name: name.trim() || (language === 'nl' ? 'Baby' : 'Baby'),
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
            <h2>{isEditing ? t('childModal.titleEdit') : t('childModal.titleAdd')}</h2>
          </div>
          <button onClick={closeModal} style={{ color: 'var(--text-tertiary)' }} aria-label={t('common.close')}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-body">
            {/* Live Baby Avatar Preview */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1rem', padding: '0.65rem 0.85rem', backgroundColor: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: `var(--color-${avatarColor || 'terracotta'})`,
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '1.2rem',
                  flexShrink: 0,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                  transition: 'background 0.25s ease',
                }}
              >
                {name ? name.charAt(0).toUpperCase() : 'B'}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>
                  {name || (language === 'nl' ? 'Baby' : 'Baby')}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                  {language === 'nl' ? 'Kleuraccent voor avatar & thema' : 'Accent color for avatar & theme'}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{t('childModal.name')}</label>
              <input
                type="text"
                className="form-input"
                placeholder={language === 'nl' ? 'bv. Lucas, Emma, Arthur, Ella' : 'e.g. Rowan, Maya, Liam'}
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('childModal.birthdate')}</label>
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
                <label className="form-label">
                  {t('childModal.birthWeight', { unit: isMetric ? 'kg' : 'lbs' })}
                </label>
                <input
                  type="number"
                  step="0.05"
                  className="form-input"
                  placeholder={isMetric ? '3.45' : '7.5'}
                  value={birthWeightLb}
                  onChange={e => setBirthWeightLb(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  {t('childModal.birthHeight', { unit: preferences?.lengthUnit === 'cm' ? 'cm' : 'in' })}
                </label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  placeholder={preferences?.lengthUnit === 'cm' ? '50.0' : '20.0'}
                  value={birthHeightIn}
                  onChange={e => setBirthHeightIn(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{t('childModal.avatarColor')}</label>
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
            <button type="submit" className="btn-primary">
              {isEditing ? t('childModal.submitEdit') : t('childModal.submitAdd')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
