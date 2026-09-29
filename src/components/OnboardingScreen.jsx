import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { triggerHaptic } from '../utils/haptics';
import confetti from 'canvas-confetti';
import {
  Baby,
  Users,
  Lock,
  ArrowRight,
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  Plus,
  Trash2,
  ShieldCheck,
} from 'lucide-react';

const COLOR_OPTIONS = [
  { id: 'terracotta', hex: '#CE6B4C', label: 'Terracotta' },
  { id: 'sage', hex: '#487050', label: 'Sage' },
  { id: 'caramel', hex: '#A06422', label: 'Caramel' },
  { id: 'slate', hex: '#546C7E', label: 'Slate' },
  { id: 'berry', hex: '#784E6D', label: 'Berry' },
  { id: 'mustard', hex: '#8C6718', label: 'Mustard' },
];

export function OnboardingScreen() {
  const { completeOnboarding, preferences, setPreferences, t, language } = useApp();
  const [currentStep, setCurrentStep] = useState(1); // 1 = Baby, 2 = Caregivers, 3 = Password

  // --- Step 1: Baby State ---
  const [babyName, setBabyName] = useState('');
  const [birthdate, setBirthdate] = useState(() => new Date().toISOString().split('T')[0]);
  const [sex, setSex] = useState('FEMALE'); // 'FEMALE' | 'MALE' | 'OTHER'
  const [babyColor, setBabyColor] = useState('terracotta');

  // --- Step 2: Caregivers State ---
  const [hasPartner, setHasPartner] = useState(true);
  const [caregiver1, setCaregiver1] = useState({
    name: language === 'nl' ? 'Mama' : 'Mom',
    role: language === 'nl' ? 'Mama' : 'Mom',
    color: '#CE6B4C',
  });
  const [caregiver2, setCaregiver2] = useState({
    name: language === 'nl' ? 'Papa' : 'Dad',
    role: language === 'nl' ? 'Papa' : 'Dad',
    color: '#546C7E',
  });
  const [extraCaregivers, setExtraCaregivers] = useState([]);

  // --- Step 3: Security State ---
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [activeCaregiverChoice, setActiveCaregiverChoice] = useState('cg_1');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const roleOptions = language === 'nl'
    ? [
        { id: 'Mama', label: 'Mama' },
        { id: 'Papa', label: 'Papa' },
        { id: 'Oma', label: 'Oma' },
        { id: 'Opa', label: 'Opa' },
        { id: 'Oppas', label: 'Oppas' },
        { id: 'Andere', label: 'Andere' },
      ]
    : [
        { id: 'Mom', label: 'Mom' },
        { id: 'Dad', label: 'Dad' },
        { id: 'Grandma', label: 'Grandma' },
        { id: 'Grandpa', label: 'Grandpa' },
        { id: 'Nanny', label: 'Nanny' },
        { id: 'Other', label: 'Other' },
      ];

  const handleNextFromStep1 = (e) => {
    e.preventDefault();
    if (!babyName.trim()) {
      triggerHaptic('warning', preferences?.haptics);
      return;
    }
    triggerHaptic('light', preferences?.haptics);
    setCurrentStep(2);
  };

  const handleNextFromStep2 = (e) => {
    e.preventDefault();
    if (!caregiver1.name.trim()) {
      triggerHaptic('warning', preferences?.haptics);
      return;
    }
    triggerHaptic('light', preferences?.haptics);
    setCurrentStep(3);
  };

  const handleAddExtraCaregiver = () => {
    triggerHaptic('light', preferences?.haptics);
    const nextIdx = extraCaregivers.length + 3;
    setExtraCaregivers([
      ...extraCaregivers,
      {
        id: `cg_extra_${Date.now()}`,
        name: language === 'nl' ? 'Oma / Opa' : 'Grandparent / Helper',
        role: language === 'nl' ? 'Oma' : 'Grandma',
        color: '#487050',
      },
    ]);
  };

  const handleRemoveExtraCaregiver = (id) => {
    triggerHaptic('light', preferences?.haptics);
    setExtraCaregivers(extraCaregivers.filter(cg => cg.id !== id));
  };

  const handleFinish = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (password.length < 4) {
      setErrorMessage(t('onboarding.passwordTooShort'));
      triggerHaptic('warning', preferences?.haptics);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage(t('onboarding.passwordsDoNotMatch'));
      triggerHaptic('warning', preferences?.haptics);
      return;
    }

    setIsSubmitting(true);
    triggerHaptic('medium', preferences?.haptics);

    try {
      // Assemble configured caregivers
      const compiledCaregivers = [
        {
          id: 'cg_1',
          name: caregiver1.name.trim() || (language === 'nl' ? 'Mama' : 'Mom'),
          role: caregiver1.role,
          color: caregiver1.color,
        },
      ];

      if (hasPartner) {
        compiledCaregivers.push({
          id: 'cg_2',
          name: caregiver2.name.trim() || (language === 'nl' ? 'Papa' : 'Dad'),
          role: caregiver2.role,
          color: caregiver2.color,
        });
      }

      extraCaregivers.forEach((cg, idx) => {
        compiledCaregivers.push({
          id: cg.id || `cg_extra_${idx + 1}`,
          name: cg.name.trim() || (language === 'nl' ? 'Verzorger' : 'Helper'),
          role: cg.role,
          color: cg.color,
        });
      });

      const babyPayload = {
        name: babyName.trim() || 'Baby',
        birthdate,
        sex,
        avatarColor: babyColor,
      };

      await completeOnboarding({
        baby: babyPayload,
        caregivers: compiledCaregivers,
        password,
        activeCaregiverId: activeCaregiverChoice,
      });

      // Celebration confetti
      try {
        confetti({
          particleCount: 85,
          spread: 70,
          origin: { y: 0.55 },
          colors: ['#CE6B4C', '#546C7E', '#487050', '#A06422', '#784E6D'],
        });
      } catch {}
    } catch (err) {
      setErrorMessage(err.message || (language === 'nl' ? 'Kon gezin niet instellen. Probeer opnieuw.' : 'Could not complete setup. Please try again.'));
      triggerHaptic('warning', preferences?.haptics);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="onboarding-wrapper">
      <div className="onboarding-card">
        {/* Header & Language Switcher */}
        <div className="onboarding-header">
          <div className="onboarding-brand-bar">
            <div className="onboarding-logo-badge">
              <svg viewBox="0 0 512 512" width="38" height="38">
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
            <div>
              <h1 className="onboarding-app-name">Baby Tracker</h1>
              <span className="onboarding-app-tagline">{t('onboarding.welcomeSubtitle')}</span>
            </div>
          </div>

          {/* Quick Language Toggle */}
          <div className="onboarding-lang-toggle">
            <button
              type="button"
              className={`onboarding-lang-btn ${language === 'nl' ? 'active' : ''}`}
              onClick={() => {
                setPreferences(p => ({ ...p, language: 'nl' }));
                triggerHaptic('light', preferences?.haptics);
              }}
            >
              NL 🇳🇱
            </button>
            <button
              type="button"
              className={`onboarding-lang-btn ${language === 'en' ? 'active' : ''}`}
              onClick={() => {
                setPreferences(p => ({ ...p, language: 'en' }));
                triggerHaptic('light', preferences?.haptics);
              }}
            >
              EN 🇬🇧
            </button>
          </div>
        </div>

        {/* Stepper Progress Bar */}
        <div className="onboarding-stepper">
          <div className={`onboarding-step-indicator ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
            <span className="step-num">{currentStep > 1 ? <Check size={14} /> : '1'}</span>
            <span className="step-text">{t('onboarding.stepBaby')}</span>
          </div>
          <div className={`onboarding-step-line ${currentStep >= 2 ? 'active' : ''}`} />
          <div className={`onboarding-step-indicator ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
            <span className="step-num">{currentStep > 2 ? <Check size={14} /> : '2'}</span>
            <span className="step-text">{t('onboarding.stepCaregivers')}</span>
          </div>
          <div className={`onboarding-step-line ${currentStep >= 3 ? 'active' : ''}`} />
          <div className={`onboarding-step-indicator ${currentStep === 3 ? 'active' : ''}`}>
            <span className="step-num">3</span>
            <span className="step-text">{t('onboarding.stepSecurity')}</span>
          </div>
        </div>

        {/* STEP 1: YOUR BABY */}
        {currentStep === 1 && (
          <form onSubmit={handleNextFromStep1} className="onboarding-step-body">
            <div className="onboarding-step-intro">
              <div className="onboarding-intro-icon baby">
                <Baby size={22} />
              </div>
              <div>
                <h2>{t('onboarding.babyTitle')}</h2>
                <p>{t('onboarding.babySubtitle')}</p>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{t('onboarding.babyName')} *</label>
              <input
                type="text"
                className="form-input onboarding-input-lg"
                placeholder={t('onboarding.babyNamePlaceholder')}
                value={babyName}
                onChange={e => setBabyName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('onboarding.birthdate')}</label>
              <input
                type="date"
                className="form-input"
                value={birthdate}
                onChange={e => setBirthdate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('onboarding.sex')}</label>
              <div className="onboarding-pill-grid">
                <button
                  type="button"
                  className={`onboarding-pill-btn ${sex === 'FEMALE' ? 'active' : ''}`}
                  onClick={() => {
                    setSex('FEMALE');
                    triggerHaptic('light', preferences?.haptics);
                  }}
                >
                  🎀 {t('onboarding.sexGirl')}
                </button>
                <button
                  type="button"
                  className={`onboarding-pill-btn ${sex === 'MALE' ? 'active' : ''}`}
                  onClick={() => {
                    setSex('MALE');
                    triggerHaptic('light', preferences?.haptics);
                  }}
                >
                  🧢 {t('onboarding.sexBoy')}
                </button>
                <button
                  type="button"
                  className={`onboarding-pill-btn ${sex === 'OTHER' ? 'active' : ''}`}
                  onClick={() => {
                    setSex('OTHER');
                    triggerHaptic('light', preferences?.haptics);
                  }}
                >
                  ✨ {t('onboarding.sexSurprise')}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{t('onboarding.avatarColor')}</label>
              <div className="onboarding-swatches">
                {COLOR_OPTIONS.slice(0, 5).map(c => (
                  <button
                    key={c.id}
                    type="button"
                    className={`onboarding-swatch ${babyColor === c.id ? 'active' : ''}`}
                    style={{ backgroundColor: c.hex }}
                    onClick={() => {
                      setBabyColor(c.id);
                      triggerHaptic('light', preferences?.haptics);
                    }}
                    title={c.label}
                    aria-label={c.label}
                  >
                    {babyColor === c.id && <Check size={14} color="#FFF" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="onboarding-actions">
              <button
                type="submit"
                className="btn btn-primary onboarding-btn-next"
                disabled={!babyName.trim()}
              >
                <span>{t('onboarding.nextCaregivers')}</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: CAREGIVERS */}
        {currentStep === 2 && (
          <form onSubmit={handleNextFromStep2} className="onboarding-step-body">
            <div className="onboarding-step-intro">
              <div className="onboarding-intro-icon caregivers">
                <Users size={22} />
              </div>
              <div>
                <h2>{t('onboarding.caregiversTitle', { name: babyName || 'je baby' })}</h2>
                <p>{t('onboarding.caregiversSubtitle')}</p>
              </div>
            </div>

            {/* Caregiver 1 (You) */}
            <div className="onboarding-card-box">
              <div className="onboarding-box-header">
                <div className="onboarding-cg-badge" style={{ backgroundColor: caregiver1.color }}>
                  {caregiver1.name ? caregiver1.name[0]?.toUpperCase() : '1'}
                </div>
                <span className="onboarding-box-title">{t('onboarding.caregiver1Label')}</span>
              </div>

              <div className="form-group" style={{ marginBottom: '0.65rem' }}>
                <label className="form-label" style={{ fontSize: '0.74rem' }}>{t('onboarding.caregiverName')}</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={language === 'nl' ? 'bv. Mama, Sarah' : 'e.g. Mom, Sarah'}
                  value={caregiver1.name}
                  onChange={e => setCaregiver1({ ...caregiver1, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '0.65rem' }}>
                <label className="form-label" style={{ fontSize: '0.74rem' }}>{t('onboarding.caregiverRole')}</label>
                <div className="onboarding-role-grid">
                  {roleOptions.slice(0, 4).map(r => (
                    <button
                      key={r.id}
                      type="button"
                      className={`segmented-btn ${caregiver1.role === r.id ? 'active' : ''}`}
                      onClick={() => setCaregiver1({ ...caregiver1, role: r.id })}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.74rem' }}>{t('onboarding.caregiverColor')}</label>
                <div className="onboarding-swatches mini">
                  {COLOR_OPTIONS.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      className={`onboarding-swatch mini ${caregiver1.color === c.hex ? 'active' : ''}`}
                      style={{ backgroundColor: c.hex }}
                      onClick={() => setCaregiver1({ ...caregiver1, color: c.hex })}
                      title={c.label}
                    >
                      {caregiver1.color === c.hex && <Check size={11} color="#FFF" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Caregiver 2 (Partner) Toggle & Box */}
            <div className="onboarding-partner-toggle-row">
              <label className="onboarding-checkbox-label">
                <input
                  type="checkbox"
                  checked={hasPartner}
                  onChange={e => {
                    setHasPartner(e.target.checked);
                    triggerHaptic('light', preferences?.haptics);
                  }}
                />
                <span>{t('onboarding.hasPartnerToggle')}</span>
              </label>
            </div>

            {hasPartner && (
              <div className="onboarding-card-box">
                <div className="onboarding-box-header">
                  <div className="onboarding-cg-badge" style={{ backgroundColor: caregiver2.color }}>
                    {caregiver2.name ? caregiver2.name[0]?.toUpperCase() : '2'}
                  </div>
                  <span className="onboarding-box-title">{t('onboarding.caregiver2Label')}</span>
                </div>

                <div className="form-group" style={{ marginBottom: '0.65rem' }}>
                  <label className="form-label" style={{ fontSize: '0.74rem' }}>{t('onboarding.caregiverName')}</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={language === 'nl' ? 'bv. Papa, Thomas' : 'e.g. Dad, Thomas'}
                    value={caregiver2.name}
                    onChange={e => setCaregiver2({ ...caregiver2, name: e.target.value })}
                    required={hasPartner}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '0.65rem' }}>
                  <label className="form-label" style={{ fontSize: '0.74rem' }}>{t('onboarding.caregiverRole')}</label>
                  <div className="onboarding-role-grid">
                    {roleOptions.slice(0, 4).map(r => (
                      <button
                        key={r.id}
                        type="button"
                        className={`segmented-btn ${caregiver2.role === r.id ? 'active' : ''}`}
                        onClick={() => setCaregiver2({ ...caregiver2, role: r.id })}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.74rem' }}>{t('onboarding.caregiverColor')}</label>
                  <div className="onboarding-swatches mini">
                    {COLOR_OPTIONS.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        className={`onboarding-swatch mini ${caregiver2.color === c.hex ? 'active' : ''}`}
                        style={{ backgroundColor: c.hex }}
                        onClick={() => setCaregiver2({ ...caregiver2, color: c.hex })}
                        title={c.label}
                      >
                        {caregiver2.color === c.hex && <Check size={11} color="#FFF" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Extra Caregivers List */}
            {extraCaregivers.map((cg, index) => (
              <div key={cg.id} className="onboarding-card-box">
                <div className="onboarding-box-header" style={{ justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div className="onboarding-cg-badge" style={{ backgroundColor: cg.color }}>
                      {cg.name ? cg.name[0]?.toUpperCase() : '+'}
                    </div>
                    <span className="onboarding-box-title">
                      {language === 'nl' ? `Extra verzorger #${index + 1}` : `Additional Caregiver #${index + 1}`}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="onboarding-remove-btn"
                    onClick={() => handleRemoveExtraCaregiver(cg.id)}
                    aria-label={t('onboarding.removeCaregiver')}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <div className="form-group" style={{ marginBottom: '0.65rem' }}>
                  <label className="form-label" style={{ fontSize: '0.74rem' }}>{t('onboarding.caregiverName')}</label>
                  <input
                    type="text"
                    className="form-input"
                    value={cg.name}
                    onChange={e => {
                      const updated = [...extraCaregivers];
                      updated[index].name = e.target.value;
                      setExtraCaregivers(updated);
                    }}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.74rem' }}>{t('onboarding.caregiverRole')}</label>
                  <div className="onboarding-role-grid">
                    {roleOptions.map(r => (
                      <button
                        key={r.id}
                        type="button"
                        className={`segmented-btn ${cg.role === r.id ? 'active' : ''}`}
                        onClick={() => {
                          const updated = [...extraCaregivers];
                          updated[index].role = r.id;
                          setExtraCaregivers(updated);
                        }}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              className="onboarding-add-more-btn"
              onClick={handleAddExtraCaregiver}
            >
              <Plus size={16} />
              <span>{t('onboarding.addAnotherCaregiver')}</span>
            </button>

            <div className="onboarding-actions split">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  triggerHaptic('light', preferences?.haptics);
                  setCurrentStep(1);
                }}
              >
                <ArrowLeft size={16} />
                <span>{t('onboarding.back')}</span>
              </button>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={!caregiver1.name.trim() || (hasPartner && !caregiver2.name.trim())}
              >
                <span>{t('onboarding.nextSecurity')}</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: FAMILY PASSWORD & FINISH */}
        {currentStep === 3 && (
          <form onSubmit={handleFinish} className="onboarding-step-body">
            <div className="onboarding-step-intro">
              <div className="onboarding-intro-icon security">
                <Lock size={22} />
              </div>
              <div>
                <h2>{t('onboarding.securityTitle')}</h2>
                <p>{t('onboarding.securitySubtitle')}</p>
              </div>
            </div>

            {errorMessage && (
              <div className="onboarding-error-box">
                <span>⚠️ {errorMessage}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">{t('onboarding.passwordLabel')}</label>
              <div className="onboarding-input-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder={t('onboarding.passwordPlaceholder')}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoFocus
                  minLength={4}
                />
                <button
                  type="button"
                  className="onboarding-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{t('onboarding.confirmPasswordLabel')}</label>
              <div className="onboarding-input-wrap">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  className={`form-input ${confirmPassword && password === confirmPassword ? 'is-valid' : ''}`}
                  placeholder={t('onboarding.confirmPasswordPlaceholder')}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  minLength={4}
                />
                <button
                  type="button"
                  className="onboarding-eye-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label="Toggle confirm password visibility"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {confirmPassword && password === confirmPassword && (
                <span className="onboarding-valid-hint">
                  <Check size={14} /> {language === 'nl' ? 'Wachtwoorden komen overeen' : 'Passwords match'}
                </span>
              )}
            </div>

            {/* Who is setting up this device right now? */}
            <div className="form-group" style={{ marginTop: '0.4rem' }}>
              <label className="form-label">{t('onboarding.loggingInAs')}</label>
              <div className="onboarding-caregiver-select-grid">
                <button
                  type="button"
                  className={`onboarding-cg-choice-btn ${activeCaregiverChoice === 'cg_1' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveCaregiverChoice('cg_1');
                    triggerHaptic('light', preferences?.haptics);
                  }}
                >
                  <div className="choice-dot" style={{ backgroundColor: caregiver1.color }} />
                  <span>{caregiver1.name || 'Verzorger 1'}</span>
                  {activeCaregiverChoice === 'cg_1' && <Check size={14} className="choice-check" />}
                </button>

                {hasPartner && (
                  <button
                    type="button"
                    className={`onboarding-cg-choice-btn ${activeCaregiverChoice === 'cg_2' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveCaregiverChoice('cg_2');
                      triggerHaptic('light', preferences?.haptics);
                    }}
                  >
                    <div className="choice-dot" style={{ backgroundColor: caregiver2.color }} />
                    <span>{caregiver2.name || 'Verzorger 2'}</span>
                    {activeCaregiverChoice === 'cg_2' && <Check size={14} className="choice-check" />}
                  </button>
                )}
              </div>
            </div>

            <div className="onboarding-actions split">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={isSubmitting}
                onClick={() => {
                  triggerHaptic('light', preferences?.haptics);
                  setCurrentStep(2);
                }}
              >
                <ArrowLeft size={16} />
                <span>{t('onboarding.back')}</span>
              </button>

              <button
                type="submit"
                className="btn btn-primary onboarding-btn-finish"
                disabled={isSubmitting || password.length < 4 || password !== confirmPassword}
              >
                <Sparkles size={18} />
                <span>{isSubmitting ? t('onboarding.settingUp') : t('onboarding.finishBtn')}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
