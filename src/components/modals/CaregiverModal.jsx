import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Users, X, Check, Plus, Heart, User, ShieldCheck, Lock, LogOut } from 'lucide-react';

const AVATAR_COLORS = [
  '#CE6B4C', // Terracotta
  '#546C7E', // Dusk Slate
  '#667C69', // Sage
  '#C48744', // Caramel
  '#8B5E83', // Berry
  '#4A6B82', // Navy
];

export function CaregiverModal() {
  const {
    activeModal,
    closeModal,
    openModal,
    caregivers,
    activeCaregiver,
    setActiveCaregiverId,
    addCaregiver,
    syncStatus,
    logout,
    t,
    language,
  } = useApp();

  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState(language === 'nl' ? 'Mama' : 'Mom');
  const [color, setColor] = useState(AVATAR_COLORS[0]);

  if (activeModal !== 'CAREGIVER') return null;

  const roleOptions = language === 'nl' ? [
    { id: 'Mama', label: 'Mama' },
    { id: 'Papa', label: 'Papa' },
    { id: 'Grootouder', label: 'Grootouder' },
    { id: 'Oppas', label: 'Oppas' },
  ] : [
    { id: 'Mom', label: 'Mom' },
    { id: 'Dad', label: 'Dad' },
    { id: 'Grandparent', label: 'Grandparent' },
    { id: 'Nanny', label: 'Nanny' },
  ];

  const handleSelect = (cg) => {
    setActiveCaregiverId(cg.id);
    closeModal();
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    await addCaregiver({
      name: name.trim(),
      role: role.trim() || (language === 'nl' ? 'Verzorger' : 'Caregiver'),
      color,
    });

    setName('');
    setIsAdding(false);
  };

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-title-icon" style={{ backgroundColor: 'var(--color-terracotta-light)', color: 'var(--color-terracotta)' }}>
              <Users size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem' }}>{t('caregiverModal.title')}</h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {t('caregiverModal.manageTitle')}
              </span>
            </div>
          </div>
          <button onClick={closeModal} style={{ color: 'var(--text-tertiary)' }} aria-label={t('common.close')}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Sync Status Banner */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.65rem 0.85rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-card-subtle)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.78rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: syncStatus === 'connected' ? '#2E7D32' : syncStatus === 'connecting' ? '#F57C00' : '#D32F2F',
                boxShadow: syncStatus === 'connected' ? '0 0 6px #4CAF50' : 'none',
              }} />
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {syncStatus === 'connected' ? (language === 'nl' ? 'Live synchronisatie actief' : 'Multi-Device Live Sync Active') : syncStatus === 'connecting' ? (language === 'nl' ? 'Verbinden met server...' : 'Connecting to Server...') : (language === 'nl' ? 'Offline (lokale modus)' : 'Offline (Local Mode)')}
              </span>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
              {language === 'nl' ? 'Gedeeld met gezin' : 'Shared with family'}
            </span>
          </div>

          {/* Caregivers List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.25rem' }}>
            {caregivers.map(cg => {
              const isActive = activeCaregiver?.id === cg.id;
              return (
                <div
                  key={cg.id}
                  className={`caregiver-card ${isActive ? 'is-active' : ''}`}
                  onClick={() => handleSelect(cg)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      className="caregiver-avatar"
                      style={{ backgroundColor: cg.color || 'var(--color-terracotta)' }}
                    >
                      {cg.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                        {cg.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {cg.role || (language === 'nl' ? 'Verzorger' : 'Caregiver')}
                      </div>
                    </div>
                  </div>

                  {isActive ? (
                    <span className="caregiver-active-pill">
                      <Check size={12} style={{ marginRight: 3 }} /> {language === 'nl' ? 'Dit apparaat' : 'This Device'}
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(cg);
                      }}
                    >
                      {language === 'nl' ? 'Kiezen' : 'Select'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add Caregiver Button or Form */}
          {!isAdding ? (
            <button
              type="button"
              className="btn-secondary"
              style={{ width: '100%', marginTop: '0.5rem', justifyContent: 'center' }}
              onClick={() => setIsAdding(true)}
            >
              <Plus size={15} style={{ marginRight: 6 }} /> {t('caregiverModal.addCaregiver')}
            </button>
          ) : (
            <form onSubmit={handleCreate} style={{
              marginTop: '0.5rem',
              padding: '0.85rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-card-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
            }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {t('caregiverModal.addCaregiver')}
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>{t('caregiverModal.name')}</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={language === 'nl' ? 'bv. Mom, Dad, Oma' : 'e.g. Mom, Dad, Grandma'}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>{t('caregiverModal.role')}</label>
                <div className="segmented-control" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                  {roleOptions.map(r => (
                    <button
                      key={r.id}
                      type="button"
                      className={`segmented-btn ${role === r.id ? 'active' : ''}`}
                      onClick={() => setRole(r.id)}
                      style={{ fontSize: '0.72rem', padding: '0.35rem 0.2rem' }}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>{t('caregiverModal.avatarColor')}</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {AVATAR_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        backgroundColor: c,
                        border: color === c ? '2px solid var(--text-primary)' : '2px solid transparent',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', marginTop: '0.25rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                  onClick={() => setIsAdding(false)}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: '0.35rem 0.85rem', fontSize: '0.78rem' }}
                >
                  {t('caregiverModal.saveCaregiver')}
                </button>
              </div>
            </form>
          )}

          {/* Security & Lock Actions */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.8rem', marginTop: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => {
                closeModal();
                openModal('CHANGE_PASSWORD');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.2rem 0',
              }}
            >
              <Lock size={13} />
              <span>{t('caregiverModal.changePassword')}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                closeModal();
                logout();
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--status-red)',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.2rem 0',
              }}
            >
              <LogOut size={13} />
              <span>{t('caregiverModal.signOut')}</span>
            </button>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-primary" onClick={closeModal} style={{ width: '100%' }}>
            {t('caregiverModal.done')}
          </button>
        </div>
      </div>
    </div>
  );
}
