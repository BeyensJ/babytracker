import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Lock, Eye, EyeOff, Check, Heart, ShieldCheck } from 'lucide-react';

export function LoginScreen() {
  const { login, caregivers } = useApp();
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
      { id: 'cg_mom', name: 'Mom', role: 'Mom', color: '#CE6B4C' },
      { id: 'cg_dad', name: 'Dad', role: 'Dad', color: '#546C7E' },
    ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) {
      setErrorMessage('Please enter the family password.');
      triggerShake();
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await login(password, selectedCaregiverId, rememberMe);
    } catch (err) {
      setErrorMessage(err.message || 'Incorrect family password. Please try again.');
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
            <svg viewBox="0 0 100 100" width="48" height="48">
              <circle cx="50" cy="50" r="48" fill="#CE6B4C" />
              <path
                d="M50 24 C38 24 30 34 30 46 C30 62 48 76 50 78 C52 76 70 62 70 46 C70 34 62 24 50 24 Z"
                fill="#FAF5EE"
              />
              <circle cx="50" cy="46" r="9" fill="#CE6B4C" />
            </svg>
          </div>
          <h1 className="login-title">Baby Tracker</h1>
          <p className="login-subtitle">Private family tracker for Baby</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {/* Caregiver Selection */}
          <div className="login-section-label">Who is logging on?</div>
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
              Family Password
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
                placeholder="Enter password"
                className="login-input"
                autoFocus
                disabled={isSubmitting}
              />
              <button
                type="button"
                className="login-toggle-password-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
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
            <span className="login-remember-text">Remember this device (stay signed in)</span>
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
                <span>Unlock Baby Tracker</span>
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
