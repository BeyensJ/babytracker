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
  } = useApp();

  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('Mom');
  const [color, setColor] = useState(AVATAR_COLORS[0]);

  if (activeModal !== 'CAREGIVER') return null;

  const handleSelect = (cg) => {
    setActiveCaregiverId(cg.id);
    closeModal();
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    await addCaregiver({
      name: name.trim(),
      role: role.trim() || 'Caregiver',
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
              <h2 style={{ fontSize: '1.15rem' }}>Switch Caregiver</h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Who is tracking on this device right now?
              </span>
            </div>
          </div>
          <button onClick={closeModal} style={{ color: 'var(--text-tertiary)' }} aria-label="Close modal">
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
                {syncStatus === 'connected' ? 'Multi-Device Live Sync Active' : syncStatus === 'connecting' ? 'Connecting to Server...' : 'Offline (Local Mode)'}
              </span>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
              Shared with family
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
                        {cg.role || 'Caregiver'}
                      </div>
                    </div>
                  </div>

                  {isActive ? (
                    <span className="caregiver-active-pill">
                      <Check size={12} style={{ marginRight: 3 }} /> This Device
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
                      Select
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
              <Plus size={15} style={{ marginRight: 6 }} /> Add Another Caregiver
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
                Add New Caregiver
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Mom, Dad, Grandma"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Role / Relation</label>
                <div className="segmented-control" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                  {['Mom', 'Dad', 'Grandparent', 'Nanny'].map(r => (
                    <button
                      key={r}
                      type="button"
                      className={`segmented-btn ${role === r ? 'active' : ''}`}
                      onClick={() => setRole(r)}
                      style={{ fontSize: '0.72rem', padding: '0.35rem 0.2rem' }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Avatar Color</label>
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
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: '0.35rem 0.85rem', fontSize: '0.78rem' }}
                >
                  Save Caregiver
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
              <span>Change Family Password</span>
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
              <span>Lock / Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
