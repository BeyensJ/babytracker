import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Lock, Eye, EyeOff, Check, Heart, ShieldCheck, Server } from 'lucide-react';
import { syncService } from '../services/syncService';

export function LoginScreen() {
  const { login, caregivers, activeChild, t, language, openModal } = useApp();
  const [selectedCaregiverId, setSelectedCaregiverId] = useState(() => {
    // Default to Mom or first caregiver
    return caregivers?.[0]?.id || 'cg_mom';
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [shake, setShake] = useState(false);

  const availableCaregivers = caregivers?.length > 0
    ? caregivers
    : [
      { id: 'cg_mom', name: 'Mom', role: language === 'nl' ? 'Mama' : 'Mom', color: '#CE6B4C' },
      { id: 'cg_dad', name: 'Dad', role: language === 'nl' ? 'Papa' : 'Dad', color: '#546C7E' },
    ];

  const babyName = activeChild?.name || 'Baby';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) {
      setErrorMessage(language === 'nl' ? 'Voer het gezinswachtwoord in.' : 'Please enter the family password.');
      triggerShake();
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await login(password, selectedCaregiverId, rememberMe);
    } catch (err) {
      setErrorMessage(err.message || (language === 'nl' ? 'Onjuist gezinswachtwoord. Probeer opnieuw.' : 'Incorrect family password. Please try again.'));
      triggerShake();
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  return (
    <div className="login-screen-wrapper">
      <div className={`login-card ${shake ? 'shake-animation' : ''}`}>
        {/* Brand Header */}
        <div className="login-brand">
          <div className="login-logo-circle">
            <svg viewBox="0 0 512 512" width="60" height="60">
              <rect width="512" height="512" rx="115" fill="#CE6B4C" />
              <g fill="none" stroke="#FFFFFF" strokeLinecap="round" strokeLinejoin="round">
                <path
                  d="M 246 140 C 225 152 215 180 236 198 C 255 214 278 196 270 172 C 264 152 254 142 272 142 C 334 142 376 190 376 262 C 394 262 404 274 404 288 C 404 302 392 314 372 314 C 362 366 316 404 256 404 C 196 404 150 366 140 314 C 120 314 108 302 108 288 C 108 274 118 262 136 262 C 136 190 182 140 246 140 Z"
                  strokeWidth="18"
                />
                <path d="M 186 280 Q 212 302 238 280" strokeWidth="18" />
                <path d="M 274 280 Q 300 302 326 280" strokeWidth="18" />
                <path d="M 224 338 Q 256 362 288 338" strokeWidth="17" />
              </g>
            </svg>
          </div>
          <h1 className="login-title">Baby Tracker</h1>
          <p className="login-subtitle">
            {language === 'nl' ? `Privé gezinstracker voor ${babyName}` : `Private family tracker for ${babyName}`}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {/* Caregiver Selection */}
          <div className="login-section-label">
            {language === 'nl' ? 'Wie logt er in?' : 'Who is logging on?'}
          </div>
          <div className="login-caregiver-grid">
            {availableCaregivers.map((cg) => {
              const isSelected = cg.id === selectedCaregiverId;
              return (
                <button
                  key={cg.id}
                  type="button"
                  className={`login-caregiver-option ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedCaregiverId(cg.id)}
                >
                  <div
                    className="login-caregiver-avatar"
                    style={{ backgroundColor: cg.color || 'var(--color-terracotta)' }}
                  >
                    {cg.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="login-caregiver-meta">
                    <span className="login-caregiver-name">{cg.name}</span>
                    <span className="login-caregiver-role">{cg.role}</span>
                  </div>
                  {isSelected && (
                    <div className="login-caregiver-check">
                      <Check size={14} color="#FFF" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Password Input */}
          <div className="login-field-group">
            <label className="login-field-label" htmlFor="family-password-input">
              {language === 'nl' ? 'Gezinswachtwoord' : 'Family Password'}
            </label>
            <div className="login-input-wrapper">
              <Lock size={18} className="login-input-icon" />
              <input
                id="family-password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder={language === 'nl' ? 'Wachtwoord invoeren' : 'Enter password'}
                className="login-input"
                autoFocus
                disabled={isSubmitting}
              />
              <button
                type="button"
                className="login-toggle-password-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? (language === 'nl' ? 'Wachtwoord verbergen' : 'Hide password') : (language === 'nl' ? 'Wachtwoord tonen' : 'Show password')}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="login-error-banner">
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Remember this device toggle */}
          <label className="login-remember-row">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="login-checkbox"
            />
            <span className="login-remember-text">
              {language === 'nl' ? 'Onthoud dit apparaat (aangemeld blijven)' : 'Remember this device (stay signed in)'}
            </span>
          </label>

          {/* Submit Button */}
          <button
            type="submit"
            className="login-submit-btn"
            disabled={isSubmitting}
            id="unlock-app-btn"
          >
            {isSubmitting ? (
              <span className="login-spinner" />
            ) : (
              <>
                <ShieldCheck size={18} />
                <span>{language === 'nl' ? 'Baby Tracker Ontgrendelen' : 'Unlock Baby Tracker'}</span>
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={() => openModal('SERVER_SETUP')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.78rem',
              color: 'var(--text-secondary)',
              padding: '0.4rem 0.6rem',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <Server size={14} color="var(--color-terracotta)" />
            <span>{syncService.getServerBaseUrl() || (language === 'nl' ? 'Server configureren' : 'Configure server')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
