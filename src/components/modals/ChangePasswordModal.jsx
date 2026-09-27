import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Lock, Eye, EyeOff, Check, X, AlertCircle } from 'lucide-react';

export function ChangePasswordModal({ isOpen, onClose }) {
  const { changePassword, t, language } = useApp();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!currentPassword) {
      setErrorMessage(language === 'nl' ? 'Voer het huidige gezinswachtwoord in.' : 'Please enter your current family password.');
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      setErrorMessage(language === 'nl' ? 'Het nieuwe wachtwoord moet minstens 4 tekens lang zijn.' : 'New password must be at least 4 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage(language === 'nl' ? 'Het nieuwe wachtwoord en de herhaling komen niet overeen.' : 'New password and confirmation do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccessMessage(language === 'nl' ? 'Gezinswachtwoord succesvol gewijzigd!' : 'Family password updated successfully!');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setErrorMessage(err.message || (language === 'nl' ? 'Wachtwoord wijzigen mislukt.' : 'Failed to update password.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'var(--color-terracotta-light)',
                color: 'var(--color-terracotta)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Lock size={16} />
            </div>
            <div>
              <h2 className="modal-title">{t('passwordModal.title')}</h2>
              <p className="modal-subtitle">{language === 'nl' ? 'Zowel mama als papa gebruiken dit wachtwoord' : 'Both Mom and Dad use this password'}</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label={t('common.close')}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Current Password */}
            <div>
              <label className="form-label">{t('passwordModal.current')}</label>
              <div className="login-input-wrapper">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  className="form-input"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder={language === 'nl' ? 'Huidig wachtwoord invoeren' : 'Enter current password'}
                  required
                />
                <button
                  type="button"
                  className="login-toggle-password-btn"
                  onClick={() => setShowCurrent(!showCurrent)}
                  tabIndex={-1}
                >
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="form-label">{t('passwordModal.newPass')}</label>
              <div className="login-input-wrapper">
                <input
                  type={showNew ? 'text' : 'password'}
                  className="form-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={language === 'nl' ? 'Minstens 4 tekens' : 'At least 4 characters'}
                  required
                />
                <button
                  type="button"
                  className="login-toggle-password-btn"
                  onClick={() => setShowNew(!showNew)}
                  tabIndex={-1}
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="form-label">{t('passwordModal.confirmPass')}</label>
              <input
                type="password"
                className="form-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={language === 'nl' ? 'Herhaal nieuw wachtwoord' : 'Re-enter new password'}
                required
              />
            </div>

            {/* Feedback */}
            {errorMessage && (
              <div
                style={{
                  backgroundColor: 'var(--status-red-light)',
                  color: 'var(--status-red)',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div
                style={{
                  backgroundColor: 'var(--status-green-light)',
                  color: 'var(--status-green)',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Check size={16} />
                <span>{successMessage}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="modal-footer">
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? t('passwordModal.updating') : t('passwordModal.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
