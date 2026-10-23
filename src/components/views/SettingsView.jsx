import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { parseCSVToRows, convertCsvRowsToEvents, convertJsonToEvents } from '../../utils/csvParser';
import {
  Upload,
  Download,
  FileSpreadsheet,
  Sparkles,
  Trash2,
  Baby,
  Sliders,
  Moon,
  Sun,
  Plus,
  Edit2,
  Lock,
  Key,
  LogOut,
  Bell,
  Send,
  AlertTriangle,
  CheckCircle2,
  Server,
  RefreshCw,
  Eye,
  EyeOff,
  ExternalLink,
  School,
  Users,
  Flower2,
  User,
  Smartphone,
  Ruler,
  Thermometer,
  Layers,
  Check,
} from 'lucide-react';
import { syncService } from '../../services/syncService';
import { triggerHaptic } from '../../utils/haptics';
import confetti from 'canvas-confetti';

export function SettingsView() {
  const {
    childList,
    activeChild,
    activeChildId,
    setActiveChildId,
    events,
    caregivers,
    activeCaregiver,
    activeCaregiverId,
    setActiveCaregiverId,
    reminders,
    dueReminders,
    openModal,
    preferences,
    setPreferences,
    isZenMode,
    toggleZenMode,
    resetToSample,
    clearAllData,
    exportCSV,
    exportJSON,
    logout,
    notificationPermission,
    requestNotificationPermission,
    testNotification,
    notificationDiagnostics,
    t,
    language,
    showConfirm,
    showAlert,
  } = useApp();

  const isDutch = language === 'nl';

  // Scope Tab: 'family' | 'user' | 'device' | 'all'
  const [activeScope, setActiveScope] = useState('family');

  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [importError, setImportError] = useState('');
  const [testAlertStatus, setTestAlertStatus] = useState(null);
  const [serverTestStatus, setServerTestStatus] = useState(null);
  const [geminiKeyInput, setGeminiKeyInput] = useState(() => preferences?.geminiApiKey || '');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [geminiTestStatus, setGeminiTestStatus] = useState(null);
  const [geminiSavedToast, setGeminiSavedToast] = useState(false);
  const [daycareInput, setDaycareInput] = useState(() => preferences?.daycareName || '');
  const [daycareSavedToast, setDaycareSavedToast] = useState(false);

  const handleSaveGeminiKey = () => {
    triggerHaptic('success', preferences?.haptics);
    setPreferences({ geminiApiKey: geminiKeyInput.trim() });
    setGeminiSavedToast(true);
    setTimeout(() => setGeminiSavedToast(false), 3000);
  };

  const handleSaveDaycareName = () => {
    triggerHaptic('success', preferences?.haptics);
    setPreferences((p) => ({ ...p, daycareName: daycareInput.trim() }));
    setDaycareSavedToast(true);
    setTimeout(() => setDaycareSavedToast(false), 2500);
  };

  const handleTestGeminiKey = async () => {
    const keyToTest = geminiKeyInput.trim() || preferences?.geminiApiKey;
    if (!keyToTest) {
      setGeminiTestStatus({
        loading: false,
        success: false,
        message: isDutch ? 'Voer eerst een API-sleutel in.' : 'Please enter an API key first.',
      });
      return;
    }

    setGeminiTestStatus({ loading: true, message: t('settings.geminiTesting') });
    triggerHaptic('light', preferences?.haptics);

    try {
      const res = await syncService.testGeminiApiKey(keyToTest);
      if (res.success) {
        setGeminiTestStatus({
          loading: false,
          success: true,
          message: t('settings.geminiSuccess', { model: res.model || 'gemini-2.5-flash' }),
        });
        triggerHaptic('success', preferences?.haptics);
      } else {
        setGeminiTestStatus({
          loading: false,
          success: false,
          message: t('settings.geminiError', { error: res.error || 'Invalid API Key' }),
        });
        triggerHaptic('warning', preferences?.haptics);
      }
    } catch (err) {
      setGeminiTestStatus({
        loading: false,
        success: false,
        message: t('settings.geminiError', { error: err.message }),
      });
    }
  };

  const handleTestAlert = async () => {
    setTestAlertStatus({ loading: true, message: isDutch ? 'Testmelding versturen...' : 'Triggering test notification...' });
    try {
      const res = await testNotification();
      setTestAlertStatus(res);
      setTimeout(() => setTestAlertStatus(null), 8000);
    } catch (err) {
      setTestAlertStatus({ success: false, message: err.message || (isDutch ? 'Melding mislukt' : 'Notification failed') });
      setTimeout(() => setTestAlertStatus(null), 8000);
    }
  };

  const handleTestServer = async () => {
    setServerTestStatus({ loading: true, message: t('settings.serverTesting') });
    try {
      const res = await syncService.checkServerHealth();
      if (res.reachable) {
        setServerTestStatus({
          loading: false,
          success: true,
          message: isDutch
            ? `Verbonden! Server reageert (HTTP ${res.status})`
            : `Connected! Server responded (HTTP ${res.status})`,
        });
      } else {
        setServerTestStatus({
          loading: false,
          success: false,
          message: isDutch
            ? `Kan server niet bereiken (${res.error || 'Geen reactie'})`
            : `Could not reach server (${res.error || 'No response'})`,
        });
      }
      setTimeout(() => setServerTestStatus(null), 8000);
    } catch (err) {
      setServerTestStatus({
        loading: false,
        success: false,
        message: err.message || (isDutch ? 'Verbinding mislukt' : 'Connection failed'),
      });
      setTimeout(() => setServerTestStatus(null), 8000);
    }
  };

  // Process selected or dropped file
  const handleFileProcess = (file) => {
    if (!file) return;
    setImportError('');

    const reader = new FileReader();
    const isJson = file.name.endsWith('.json');

    reader.onload = (e) => {
      try {
        const content = e.target.result;
        let parsedResult = null;

        if (isJson) {
          const json = JSON.parse(content);
          parsedResult = convertJsonToEvents(json, activeChildId);
        } else {
          // Parse CSV
          const rows = parseCSVToRows(content);
          if (rows.length === 0) {
            setImportError(
              isDutch
                ? 'Geen geldige rijen gevonden in dit CSV-bestand.'
                : 'Could not find valid rows in this CSV file. Please make sure it is a valid export.'
            );
            return;
          }
          parsedResult = convertCsvRowsToEvents(rows, activeChildId);
        }

        const parsedEvents = parsedResult?.events || [];
        const detectedProfile = parsedResult?.detectedProfile || null;
        const detectedUnits = parsedResult?.detectedUnits || null;
        const detectedCaregivers = parsedResult?.detectedCaregivers || [];

        if (parsedEvents.length === 0) {
          setImportError(
            isDutch
              ? 'Geen herkenbare babyregistraties gevonden in dit bestand.'
              : 'No recognizable baby tracking rows found in this file.'
          );
          return;
        }

        // Open Import Preview Modal for user inspection
        openModal('IMPORT_PREVIEW', {
          fileName: file.name,
          parsedEvents,
          detectedProfile,
          detectedUnits,
          detectedCaregivers,
          activeChildId,
        });
      } catch (err) {
        console.error('File parsing error:', err);
        setImportError('Failed to parse file: ' + err.message);
      }
    };

    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleLoadDemoData = async () => {
    if (events.length > 0) {
      const ok = await showConfirm({
        title: isDutch ? 'Voorbeelddata Laden' : 'Load Demo Data',
        message: t('settings.sampleConfirm'),
        variant: 'warning',
      });
      if (!ok) return;
    }
    resetToSample();
    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch {}
    await showAlert({
      title: isDutch ? 'Succes' : 'Success',
      message: t('settings.sampleSuccess'),
      variant: 'success',
    });
  };

  const handleClear = async () => {
    const ok = await showConfirm({
      title: isDutch ? 'Alle Gegevens Wissen' : 'Clear All Data',
      message: t('settings.clearAllConfirm'),
      variant: 'danger',
    });
    if (ok) {
      clearAllData();
      await showAlert({
        title: isDutch ? 'Gewist' : 'Cleared',
        message: t('settings.clearAllAlert'),
        variant: 'primary',
      });
    }
  };

  // Helper flags for showing sections
  const showFamily = activeScope === 'family' || activeScope === 'all';
  const showUser = activeScope === 'user' || activeScope === 'all';
  const showDevice = activeScope === 'device' || activeScope === 'all';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Title & Scope Description */}
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>{t('settings.title')}</h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.3rem 0 0' }}>
          {activeScope === 'family'
            ? t('settings.scopeFamilyDesc')
            : activeScope === 'user'
            ? t('settings.scopeUserDesc')
            : activeScope === 'device'
            ? t('settings.scopeDeviceDesc')
            : t('settings.subtitle')}
        </p>
      </div>

      {/* 3-Pillar Scope Navigation Tabs */}
      <nav className="settings-scope-nav" aria-label="Settings Categories">
        <button
          type="button"
          className={`settings-scope-tab ${activeScope === 'family' ? 'active' : ''}`}
          onClick={() => {
            setActiveScope('family');
            triggerHaptic('light', preferences?.haptics);
          }}
        >
          <Baby size={16} />
          <span>{t('settings.scopeFamilyShort')}</span>
          <span className="tab-badge">{childList.length}</span>
        </button>

        <button
          type="button"
          className={`settings-scope-tab ${activeScope === 'user' ? 'active' : ''}`}
          onClick={() => {
            setActiveScope('user');
            triggerHaptic('light', preferences?.haptics);
          }}
        >
          <User size={16} />
          <span>{t('settings.scopeUserShort')}</span>
          <span className="tab-badge">
            {activeCaregiver?.name ? activeCaregiver.name.slice(0, 6) : (isDutch ? 'Profiel' : 'Profile')}
          </span>
        </button>

        <button
          type="button"
          className={`settings-scope-tab ${activeScope === 'device' ? 'active' : ''}`}
          onClick={() => {
            setActiveScope('device');
            triggerHaptic('light', preferences?.haptics);
          }}
        >
          <Smartphone size={16} />
          <span>{t('settings.scopeDeviceShort')}</span>
          <span className="tab-badge">
            {notificationPermission === 'granted' ? '●' : '○'}
          </span>
        </button>

        <button
          type="button"
          className={`settings-scope-tab ${activeScope === 'all' ? 'active' : ''}`}
          onClick={() => {
            setActiveScope('all');
            triggerHaptic('light', preferences?.haptics);
          }}
        >
          <Layers size={15} />
          <span>{t('settings.scopeAll')}</span>
        </button>
      </nav>

      {/* ====================================================================
          SCOPE 1: GEZIN (FAMILY SETTINGS)
          ==================================================================== */}
      {showFamily && (
        <>
          {/* Baby Profiles */}
          <div className="settings-section-card">
            <div className="settings-card-header">
              <div className="settings-header-left">
                <div className="settings-header-icon terracotta">
                  <Baby size={18} />
                </div>
                <div>
                  <div className="settings-header-title">{t('settings.babyProfiles')}</div>
                  <div className="settings-header-desc">
                    {isDutch
                      ? `${childList.length} baby('s) geregistreerd in het huishouden`
                      : `${childList.length} baby(s) registered in your household`}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="settings-scope-pill family">{t('settings.scopeFamilyShort')}</span>
                <button
                  type="button"
                  className="settings-unified-btn secondary"
                  style={{ height: 36, padding: '0 0.85rem', fontSize: '0.8rem' }}
                  onClick={() => openModal('CHILD_SETTINGS', null)}
                >
                  <Plus size={14} />
                  <span>{t('settings.addChild')}</span>
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {childList.map((c) => {
                const isSelected = c.id === activeChildId;
                return (
                  <div
                    key={c.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.8rem 1rem',
                      backgroundColor: isSelected ? 'rgba(224, 93, 56, 0.06)' : 'var(--bg-card-subtle)',
                      borderRadius: '12px',
                      border: isSelected ? '1.5px solid var(--color-terracotta)' : '1px solid var(--border-subtle)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, var(--color-terracotta), #C2410C)',
                          color: '#FFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '1.05rem',
                          boxShadow: '0 2px 6px rgba(224, 93, 56, 0.25)',
                        }}
                      >
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.94rem' }}>{c.name}</span>
                          {isSelected && (
                            <span
                              style={{
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                padding: '0.15rem 0.5rem',
                                borderRadius: '999px',
                                background: 'var(--color-terracotta)',
                                color: '#FFFFFF',
                              }}
                            >
                              {isDutch ? 'Actief' : 'Active'}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                          {t('settings.bornOn', { date: c.birthdate })}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      {!isSelected && (
                        <button
                          type="button"
                          className="settings-unified-btn secondary"
                          style={{ height: 34, padding: '0 0.75rem', fontSize: '0.78rem' }}
                          onClick={() => {
                            setActiveChildId(c.id);
                            triggerHaptic('success', preferences?.haptics);
                          }}
                        >
                          {t('settings.selectBaby')}
                        </button>
                      )}
                      <button
                        type="button"
                        className="settings-unified-btn secondary"
                        style={{ height: 34, width: 34, padding: 0 }}
                        onClick={() => openModal('CHILD_SETTINGS', c)}
                        aria-label={t('childModal.titleEdit')}
                        title={isDutch ? 'Bewerk profiel' : 'Edit profile'}
                      >
                        <Edit2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Family Caregivers */}
          <div className="settings-section-card">
            <div className="settings-card-header">
              <div className="settings-header-left">
                <div className="settings-header-icon caramel">
                  <Users size={18} />
                </div>
                <div>
                  <div className="settings-header-title">{t('settings.caregivers')}</div>
                  <div className="settings-header-desc">
                    {Array.isArray(caregivers) && caregivers.length > 0
                      ? isDutch
                        ? `${caregivers.length} geregistreerde verzorgers in dit gezin`
                        : `${caregivers.length} configured caregivers in this household`
                      : isDutch
                      ? 'Beheer wie er logs bijhoudt'
                      : 'Configure caregivers'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="settings-scope-pill family">{t('settings.scopeFamilyShort')}</span>
                <button
                  type="button"
                  className="settings-unified-btn secondary"
                  style={{ height: 36, padding: '0 0.85rem', fontSize: '0.8rem' }}
                  onClick={() => {
                    triggerHaptic('light', preferences?.haptics);
                    openModal('CAREGIVER');
                  }}
                >
                  <Users size={14} />
                  <span>{t('settings.manageCaregiversBtn')}</span>
                </button>
              </div>
            </div>

            {/* Caregivers Chips Preview */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {Array.isArray(caregivers) &&
                caregivers.map((cg) => (
                  <div
                    key={cg.id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '999px',
                      background: 'var(--bg-card-subtle)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.82rem',
                    }}
                  >
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: cg.color || 'var(--color-terracotta)',
                      }}
                    />
                    <strong style={{ fontWeight: 600 }}>{cg.name}</strong>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      ({cg.role})
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* Daycare / Nursery Settings */}
          <div className="settings-section-card">
            <div className="settings-card-header">
              <div className="settings-header-left">
                <div className="settings-header-icon sage">
                  <School size={18} />
                </div>
                <div>
                  <div className="settings-header-title">{t('settings.familyTitle')}</div>
                  <div className="settings-header-desc">{t('settings.daycareNameDesc')}</div>
                </div>
              </div>
              <span className="settings-scope-pill family">{t('settings.scopeFamilyShort')}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {t('settings.daycareNameLabel')}
              </label>

              <div className="settings-input-group">
                <div className="settings-input-wrapper">
                  <span className="input-leading-icon">
                    <School size={16} />
                  </span>
                  <input
                    type="text"
                    className="settings-unified-input has-leading-icon"
                    placeholder={t('settings.daycareNamePlaceholder')}
                    value={daycareInput}
                    onChange={(e) => setDaycareInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveDaycareName();
                    }}
                  />
                </div>

                <button
                  type="button"
                  className="settings-unified-btn primary"
                  onClick={handleSaveDaycareName}
                >
                  <span>{isDutch ? 'Opslaan' : 'Save'}</span>
                </button>
              </div>

              {daycareSavedToast && (
                <div
                  style={{
                    fontSize: '0.78rem',
                    color: '#16A34A',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    marginTop: '0.1rem',
                  }}
                >
                  <CheckCircle2 size={15} />
                  <span>{t('settings.daycareSavedToast')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Family Reminders & Schedules */}
          <div className="settings-section-card">
            <div className="settings-card-header">
              <div className="settings-header-left">
                <div className="settings-header-icon caramel">
                  <Bell size={18} />
                </div>
                <div>
                  <div className="settings-header-title">{t('reminders.title')}</div>
                  <div className="settings-header-desc">{t('reminders.subtitle')}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="settings-scope-pill family">{t('settings.scopeFamilyShort')}</span>
                <button
                  type="button"
                  className="settings-unified-btn secondary"
                  style={{ height: 36, padding: '0 0.85rem', fontSize: '0.8rem' }}
                  onClick={() => openModal('REMINDERS')}
                >
                  <Plus size={14} />
                  <span>{t('reminders.addReminder')}</span>
                </button>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1rem',
                backgroundColor: 'var(--bg-card-subtle)',
                borderRadius: '12px',
                border: '1px solid var(--border-subtle)',
                gap: '0.75rem',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                  {isDutch ? 'Schema’s voor' : 'Schedules for'} {activeChild?.name || 'Baby'}
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                  {dueReminders?.length > 0
                    ? isDutch
                      ? `⚠️ ${dueReminders.length} herinnering(en) nu te laat`
                      : `⚠️ ${dueReminders.length} reminder(s) due now`
                    : isDutch
                    ? `✓ ${reminders?.length || 0} actieve schema('s) geconfigureerd`
                    : `✓ ${reminders?.length || 0} active schedule(s)`}
                </div>
              </div>

              <button
                type="button"
                className="settings-unified-btn primary"
                style={{ height: 36, padding: '0 0.9rem', fontSize: '0.8rem', backgroundColor: 'var(--color-caramel)' }}
                onClick={() => openModal('REMINDERS')}
              >
                <span>{t('reminders.manageReminders')}</span>
              </button>
            </div>
          </div>

          {/* Family Security & PIN */}
          <div className="settings-section-card">
            <div className="settings-card-header">
              <div className="settings-header-left">
                <div className="settings-header-icon slate">
                  <Lock size={18} />
                </div>
                <div>
                  <div className="settings-header-title">{t('settings.securityTitle')}</div>
                  <div className="settings-header-desc">{t('settings.securityDesc')}</div>
                </div>
              </div>
              <span className="settings-scope-pill family">{t('settings.scopeFamilyShort')}</span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
              <button
                type="button"
                className="settings-unified-btn secondary"
                onClick={() => openModal('CHANGE_PASSWORD')}
              >
                <Key size={15} />
                <span>{t('settings.changeFamilyPassword')}</span>
              </button>

              <button
                type="button"
                className="settings-unified-btn secondary"
                onClick={logout}
                style={{ color: 'var(--status-red)' }}
              >
                <LogOut size={15} />
                <span>{t('settings.signOut')}</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* ====================================================================
          SCOPE 2: GEBRUIKER (USER & PERSONAL PREFERENCES)
          ==================================================================== */}
      {showUser && (
        <>
          {/* Active Caregiver Identity on this Device */}
          <div className="settings-section-card">
            <div className="settings-card-header">
              <div className="settings-header-left">
                <div className="settings-header-icon terracotta">
                  <User size={18} />
                </div>
                <div>
                  <div className="settings-header-title">{t('settings.activeCaregiverTitle')}</div>
                  <div className="settings-header-desc">{t('settings.activeCaregiverDesc')}</div>
                </div>
              </div>
              <span className="settings-scope-pill user">{t('settings.scopeUserShort')}</span>
            </div>

            <div className="caregiver-pill-grid">
              {Array.isArray(caregivers) &&
                caregivers.map((cg) => {
                  const isActive = cg.id === activeCaregiverId;
                  return (
                    <button
                      key={cg.id}
                      type="button"
                      className={`caregiver-select-card ${isActive ? 'active' : ''}`}
                      onClick={() => {
                        setActiveCaregiverId(cg.id);
                        triggerHaptic('success', preferences?.haptics);
                      }}
                    >
                      <div
                        className="avatar-ring"
                        style={{ backgroundColor: cg.color || 'var(--color-terracotta)' }}
                      >
                        {cg.name ? cg.name.charAt(0).toUpperCase() : 'C'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                          {cg.name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                          {cg.role || 'Ouder'}
                        </div>
                      </div>
                      {isActive && (
                        <div
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            backgroundColor: 'var(--color-terracotta)',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Language & Appearance */}
          <div className="settings-section-card">
            <div className="settings-card-header">
              <div className="settings-header-left">
                <div className="settings-header-icon sage">
                  <Sliders size={18} />
                </div>
                <div>
                  <div className="settings-header-title">{t('settings.appearance')}</div>
                  <div className="settings-header-desc">{t('settings.appearanceDesc')}</div>
                </div>
              </div>
              <span className="settings-scope-pill user">{t('settings.scopeUserShort')}</span>
            </div>

            {/* Language */}
            <div className="settings-unified-row">
              <div>
                <div className="settings-row-label">{t('settings.languageTitle')}</div>
                <div className="settings-row-desc">{t('settings.languageDesc')}</div>
              </div>
              <div className="settings-segmented-wrap">
                <button
                  type="button"
                  className={`settings-segmented-item ${language === 'nl' ? 'active' : ''}`}
                  onClick={() => {
                    setPreferences((p) => ({ ...p, language: 'nl' }));
                    triggerHaptic('light', preferences?.haptics);
                  }}
                >
                  🇳🇱 {t('settings.langDutch')}
                </button>
                <button
                  type="button"
                  className={`settings-segmented-item ${language === 'en' ? 'active' : ''}`}
                  onClick={() => {
                    setPreferences((p) => ({ ...p, language: 'en' }));
                    triggerHaptic('light', preferences?.haptics);
                  }}
                >
                  🇬🇧 {t('settings.langEnglish')}
                </button>
              </div>
            </div>

            {/* Theme Mode */}
            <div className="settings-unified-row">
              <div>
                <div className="settings-row-label">{t('settings.appearance')}</div>
                <div className="settings-row-desc">
                  {isZenMode
                    ? isDutch
                      ? 'Kies tussen Zen Licht en Zen Donker'
                      : 'Choose between Zen Light and Zen Dark'
                    : isDutch
                    ? 'Warm linnen overdag of rustig donker'
                    : 'Warm linen or sleek dark mode'}
                </div>
              </div>
              <div className="settings-segmented-wrap">
                <button
                  type="button"
                  className={`settings-segmented-item ${preferences.theme === 'light' || !preferences.theme ? 'active' : ''}`}
                  onClick={() => {
                    setPreferences((p) => ({ ...p, theme: 'light' }));
                    triggerHaptic('light', preferences?.haptics);
                  }}
                >
                  <Sun size={14} />
                  <span>{t('settings.themeLight')}</span>
                </button>
                <button
                  type="button"
                  className={`settings-segmented-item ${preferences.theme === 'dark' || preferences.theme === 'oled' ? 'active' : ''}`}
                  onClick={() => {
                    setPreferences((p) => ({ ...p, theme: 'dark' }));
                    triggerHaptic('light', preferences?.haptics);
                  }}
                >
                  <Moon size={14} />
                  <span>{t('settings.themeDark')}</span>
                </button>
              </div>
            </div>

            {/* Zen Mode */}
            <div className="settings-unified-row">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Flower2 size={16} color="var(--color-terracotta)" />
                  <span className="settings-row-label">{t('settings.zenModeLabel')}</span>
                </div>
                <div className="settings-row-desc">{t('settings.zenModeDesc')}</div>
              </div>
              <div className="settings-segmented-wrap">
                <button
                  type="button"
                  className={`settings-segmented-item ${!isZenMode ? 'active' : ''}`}
                  onClick={() => {
                    setPreferences((p) => ({ ...p, zenMode: false }));
                    triggerHaptic('light', preferences?.haptics);
                  }}
                >
                  {t('settings.zenModeOff')}
                </button>
                <button
                  type="button"
                  className={`settings-segmented-item ${isZenMode ? 'active' : ''}`}
                  onClick={() => {
                    setPreferences((p) => ({ ...p, zenMode: true }));
                    triggerHaptic('success', preferences?.haptics);
                  }}
                >
                  <Flower2 size={13} />
                  <span>{t('settings.zenModeOn')}</span>
                </button>
              </div>
            </div>

            {/* Quick Status & Actions Customization */}
            <div className="settings-unified-row">
              <div>
                <div className="settings-row-label">{t('customizeQuick.title')}</div>
                <div className="settings-row-desc">
                  {isDutch
                    ? 'Kies welke statuskaarten en actieknoppen zichtbaar zijn'
                    : 'Choose which status cards and dock buttons are displayed'}
                </div>
              </div>
              <button
                type="button"
                className="settings-unified-btn secondary"
                onClick={() => {
                  triggerHaptic('light', preferences?.haptics);
                  openModal('CUSTOMIZE_QUICK');
                }}
              >
                <Sliders size={14} />
                <span>{isDutch ? 'Aanpassen' : 'Customize'}</span>
              </button>
            </div>
          </div>

          {/* Measurement Units */}
          <div className="settings-section-card">
            <div className="settings-card-header">
              <div className="settings-header-left">
                <div className="settings-header-icon caramel">
                  <Ruler size={18} />
                </div>
                <div>
                  <div className="settings-header-title">{t('settings.displayUnits')}</div>
                  <div className="settings-header-desc">
                    {isDutch ? 'Eenheden voor voedingen, groei en gezondheid' : 'Units for feeds, growth and temperature'}
                  </div>
                </div>
              </div>
              <span className="settings-scope-pill user">{t('settings.scopeUserShort')}</span>
            </div>

            {/* Volume */}
            <div className="settings-unified-row">
              <div>
                <div className="settings-row-label">{t('settings.volumeUnit')}</div>
                <div className="settings-row-desc">{t('settings.volumeUnitDesc')}</div>
              </div>
              <div className="settings-segmented-wrap">
                <button
                  type="button"
                  className={`settings-segmented-item ${preferences.volumeUnit === 'ml' ? 'active' : ''}`}
                  onClick={() => setPreferences((p) => ({ ...p, volumeUnit: 'ml' }))}
                >
                  mL
                </button>
                <button
                  type="button"
                  className={`settings-segmented-item ${preferences.volumeUnit === 'oz' ? 'active' : ''}`}
                  onClick={() => setPreferences((p) => ({ ...p, volumeUnit: 'oz' }))}
                >
                  Oz (fl oz)
                </button>
              </div>
            </div>

            {/* Weight */}
            <div className="settings-unified-row">
              <div>
                <div className="settings-row-label">{t('settings.weightUnit')}</div>
                <div className="settings-row-desc">{t('settings.weightUnitDesc')}</div>
              </div>
              <div className="settings-segmented-wrap">
                <button
                  type="button"
                  className={`settings-segmented-item ${preferences.weightUnit === 'kg' ? 'active' : ''}`}
                  onClick={() => setPreferences((p) => ({ ...p, weightUnit: 'kg' }))}
                >
                  kg
                </button>
                <button
                  type="button"
                  className={`settings-segmented-item ${preferences.weightUnit === 'lb' ? 'active' : ''}`}
                  onClick={() => setPreferences((p) => ({ ...p, weightUnit: 'lb' }))}
                >
                  lb / oz
                </button>
              </div>
            </div>

            {/* Length */}
            <div className="settings-unified-row">
              <div>
                <div className="settings-row-label">{t('settings.lengthUnit')}</div>
                <div className="settings-row-desc">{t('settings.lengthUnitDesc')}</div>
              </div>
              <div className="settings-segmented-wrap">
                <button
                  type="button"
                  className={`settings-segmented-item ${preferences.lengthUnit === 'cm' || !preferences.lengthUnit ? 'active' : ''}`}
                  onClick={() => setPreferences((p) => ({ ...p, lengthUnit: 'cm' }))}
                >
                  cm
                </button>
                <button
                  type="button"
                  className={`settings-segmented-item ${preferences.lengthUnit === 'in' ? 'active' : ''}`}
                  onClick={() => setPreferences((p) => ({ ...p, lengthUnit: 'in' }))}
                >
                  inch (in)
                </button>
              </div>
            </div>

            {/* Temperature */}
            <div className="settings-unified-row">
              <div>
                <div className="settings-row-label">{t('settings.tempUnit')}</div>
                <div className="settings-row-desc">{t('settings.tempUnitDesc')}</div>
              </div>
              <div className="settings-segmented-wrap">
                <button
                  type="button"
                  className={`settings-segmented-item ${preferences.tempUnit === 'C' || !preferences.tempUnit ? 'active' : ''}`}
                  onClick={() => setPreferences((p) => ({ ...p, tempUnit: 'C' }))}
                >
                  °C
                </button>
                <button
                  type="button"
                  className={`settings-segmented-item ${preferences.tempUnit === 'F' ? 'active' : ''}`}
                  onClick={() => setPreferences((p) => ({ ...p, tempUnit: 'F' }))}
                >
                  °F
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ====================================================================
          SCOPE 3: APPARAAT (DEVICE & SYSTEM SETTINGS)
          ==================================================================== */}
      {showDevice && (
        <>
          {/* Notifications & System Tray */}
          <div className="settings-section-card">
            <div className="settings-card-header">
              <div className="settings-header-left">
                <div className="settings-header-icon terracotta">
                  <Bell size={18} />
                </div>
                <div>
                  <div className="settings-header-title">{t('settings.notificationsTitle')}</div>
                  <div className="settings-header-desc">{t('settings.notificationsDesc')}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="settings-scope-pill device">{t('settings.scopeDeviceShort')}</span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.65rem',
                    borderRadius: '999px',
                    backgroundColor:
                      notificationPermission === 'granted'
                        ? 'rgba(46, 125, 50, 0.12)'
                        : notificationPermission === 'insecure-context'
                        ? 'rgba(237, 108, 2, 0.12)'
                        : 'rgba(0, 0, 0, 0.06)',
                    color:
                      notificationPermission === 'granted'
                        ? '#2E7D32'
                        : notificationPermission === 'insecure-context'
                        ? '#ED6C02'
                        : 'var(--text-secondary)',
                  }}
                >
                  {notificationPermission === 'granted'
                    ? t('settings.notifActive')
                    : notificationPermission === 'insecure-context'
                    ? t('settings.notifInsecure')
                    : notificationPermission === 'denied'
                    ? t('settings.notifDenied')
                    : t('settings.notifDisabled')}
                </span>
              </div>
            </div>

            {/* Insecure Context Warning for LAN Plain HTTP */}
            {notificationDiagnostics?.isSecure === false && (
              <div
                style={{
                  padding: '0.85rem 1rem',
                  backgroundColor: 'rgba(237, 108, 2, 0.08)',
                  border: '1px solid rgba(237, 108, 2, 0.25)',
                  borderRadius: '12px',
                  fontSize: '0.78rem',
                  color: 'var(--text-primary)',
                  lineHeight: 1.45,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: '#C25E00', marginBottom: '0.35rem' }}>
                  <AlertTriangle size={15} />
                  <span>{t('settings.insecureTitle')}</span>
                </div>
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                  {isDutch
                    ? 'Browsers blokkeren meldingen over gewone HTTP LAN-adressen (zoals http://192.168.x.x:3001). Om meldingen op je smartphone te ontvangen:'
                    : 'Browsers strictly disable Notifications over plain HTTP LAN addresses (e.g. http://192.168.x.x:3001). To receive notifications:'}
                </p>
                <ul style={{ margin: '0.4rem 0 0 1.2rem', padding: 0, color: 'var(--text-secondary)' }}>
                  <li>
                    <strong>{isDutch ? 'Optie A (Aanbevolen):' : 'Option A (Recommended):'}</strong>{' '}
                    {isDutch
                      ? 'Plaats HTTPS voor je server (bv. Caddy, Nginx Proxy Manager of Cloudflare).'
                      : 'Put HTTPS in front of your server (e.g., Caddy, Nginx Proxy Manager, or Cloudflare).'}
                  </li>
                  <li>
                    <strong>{isDutch ? 'Optie B (Chrome Android):' : 'Option B (Chrome Android):'}</strong>{' '}
                    {isDutch ? 'Open ' : 'Open '}
                    <code>chrome://flags/#unsafely-treat-insecure-origin-as-secure</code>, {isDutch ? 'voeg ' : 'add '}
                    <code>{window.location.origin}</code> {isDutch ? 'toe en kies Ingeschakeld.' : 'and enable it.'}
                  </li>
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
              {notificationPermission !== 'granted' && (
                <button
                  type="button"
                  className="settings-unified-btn primary"
                  onClick={requestNotificationPermission}
                >
                  <Bell size={15} />
                  <span>{t('settings.enableTray')}</span>
                </button>
              )}

              <button
                type="button"
                className="settings-unified-btn secondary"
                onClick={handleTestAlert}
                disabled={testAlertStatus?.loading}
              >
                <Send size={15} />
                <span>{t('settings.sendTestAlert')}</span>
              </button>
            </div>

            {testAlertStatus && (
              <div
                style={{
                  padding: '0.65rem 0.9rem',
                  borderRadius: '10px',
                  fontSize: '0.8rem',
                  backgroundColor: testAlertStatus.success ? 'rgba(46, 125, 50, 0.1)' : 'rgba(211, 47, 47, 0.1)',
                  color: testAlertStatus.success ? '#2E7D32' : '#D32F2F',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                }}
              >
                {testAlertStatus.success ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                <span>{testAlertStatus.message}</span>
              </div>
            )}
          </div>

          {/* Haptic Vibration Feedback */}
          <div className="settings-section-card">
            <div className="settings-card-header">
              <div className="settings-header-left">
                <div className="settings-header-icon slate">
                  <Smartphone size={18} />
                </div>
                <div>
                  <div className="settings-header-title">{t('settings.haptics')}</div>
                  <div className="settings-header-desc">{t('settings.hapticsDesc')}</div>
                </div>
              </div>
              <span className="settings-scope-pill device">{t('settings.scopeDeviceShort')}</span>
            </div>

            <div className="settings-unified-row">
              <div>
                <div className="settings-row-label">
                  {isDutch ? 'Trilfeedback bij aanraking' : 'Touch vibration feedback'}
                </div>
                <div className="settings-row-desc">
                  {isDutch
                    ? 'Subtiele haptische trillingen bij knoppen en timers'
                    : 'Subtle tactile feedback when tapping buttons and stopping timers'}
                </div>
              </div>
              <div className="settings-segmented-wrap">
                <button
                  type="button"
                  className={`settings-segmented-item ${preferences.haptics !== false ? 'active' : ''}`}
                  onClick={() => {
                    setPreferences((p) => ({ ...p, haptics: true }));
                    triggerHaptic('success', true);
                  }}
                >
                  {t('settings.hapticsOn')}
                </button>
                <button
                  type="button"
                  className={`settings-segmented-item ${preferences.haptics === false ? 'active' : ''}`}
                  onClick={() => setPreferences((p) => ({ ...p, haptics: false }))}
                >
                  {t('settings.hapticsOff')}
                </button>
              </div>
            </div>
          </div>

          {/* Google Gemini AI */}
          <div className="settings-section-card">
            <div className="settings-card-header">
              <div className="settings-header-left">
                <div className="settings-header-icon purple">
                  <Sparkles size={18} />
                </div>
                <div>
                  <div className="settings-header-title">{t('settings.geminiTitle')}</div>
                  <div className="settings-header-desc">{t('settings.geminiDesc')}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="settings-scope-pill device">{t('settings.scopeDeviceShort')}</span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.65rem',
                    borderRadius: '999px',
                    backgroundColor: preferences?.geminiApiKey ? 'rgba(34, 197, 94, 0.12)' : 'rgba(0, 0, 0, 0.06)',
                    color: preferences?.geminiApiKey ? '#16A34A' : 'var(--text-secondary)',
                  }}
                >
                  {preferences?.geminiApiKey ? (isDutch ? '● Actief' : '● Active') : (isDutch ? '○ Niet ingesteld' : '○ Not Configured')}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {t('settings.geminiApiKeyLabel')}
              </label>

              <div className="settings-input-group">
                <div className="settings-input-wrapper">
                  <input
                    type={showGeminiKey ? 'text' : 'password'}
                    className="settings-unified-input has-trailing-btn"
                    placeholder={t('settings.geminiApiKeyPlaceholder')}
                    value={geminiKeyInput}
                    onChange={(e) => setGeminiKeyInput(e.target.value)}
                    style={{ fontFamily: 'monospace', fontSize: '0.86rem' }}
                  />
                  <button
                    type="button"
                    className="settings-input-trailing-action"
                    onClick={() => setShowGeminiKey(!showGeminiKey)}
                    title={showGeminiKey ? (isDutch ? 'Verberg sleutel' : 'Hide key') : (isDutch ? 'Toon sleutel' : 'Show key')}
                  >
                    {showGeminiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <button
                  type="button"
                  className="settings-unified-btn primary"
                  onClick={handleSaveGeminiKey}
                >
                  <span>{t('settings.geminiSaveBtn')}</span>
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.1rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span>{t('settings.geminiKeyHelp')}</span>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--color-daycare)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                  >
                    <span>Google AI Studio</span>
                    <ExternalLink size={11} />
                  </a>
                </span>

                <button
                  type="button"
                  className="settings-unified-btn secondary"
                  style={{ height: 34, padding: '0 0.85rem', fontSize: '0.78rem' }}
                  onClick={handleTestGeminiKey}
                  disabled={geminiTestStatus?.loading}
                >
                  <RefreshCw size={13} className={geminiTestStatus?.loading ? 'spin' : ''} />
                  <span>{t('settings.geminiTestBtn')}</span>
                </button>
              </div>

              {geminiSavedToast && (
                <div style={{ fontSize: '0.78rem', color: '#16A34A', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <CheckCircle2 size={15} />
                  <span>{isDutch ? 'API-sleutel opgeslagen!' : 'API key saved!'}</span>
                </div>
              )}

              {geminiTestStatus && (
                <div
                  style={{
                    padding: '0.65rem 0.9rem',
                    borderRadius: '10px',
                    fontSize: '0.8rem',
                    backgroundColor: geminiTestStatus.loading
                      ? 'rgba(0, 0, 0, 0.04)'
                      : geminiTestStatus.success
                      ? 'rgba(46, 125, 50, 0.1)'
                      : 'rgba(211, 47, 47, 0.1)',
                    color: geminiTestStatus.loading
                      ? 'var(--text-secondary)'
                      : geminiTestStatus.success
                      ? '#2E7D32'
                      : '#D32F2F',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                  }}
                >
                  {geminiTestStatus.loading ? (
                    <RefreshCw size={14} className="spin" />
                  ) : geminiTestStatus.success ? (
                    <CheckCircle2 size={15} />
                  ) : (
                    <AlertTriangle size={15} />
                  )}
                  <span>{geminiTestStatus.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* Home Server Sync */}
          <div className="settings-section-card">
            <div className="settings-card-header">
              <div className="settings-header-left">
                <div className="settings-header-icon slate">
                  <Server size={18} />
                </div>
                <div>
                  <div className="settings-header-title">{t('settings.serverTitle')}</div>
                  <div className="settings-header-desc">{t('settings.serverDesc')}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="settings-scope-pill device">{t('settings.scopeDeviceShort')}</span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    padding: '0.2rem 0.65rem',
                    borderRadius: '999px',
                    backgroundColor: syncService.getServerBaseUrl() ? 'rgba(84, 108, 126, 0.14)' : 'rgba(0, 0, 0, 0.06)',
                    color: syncService.getServerBaseUrl() ? 'var(--color-slate)' : 'var(--text-secondary)',
                    maxWidth: 160,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {syncService.getServerBaseUrl() || t('settings.serverDefault')}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
              <button
                type="button"
                className="settings-unified-btn secondary"
                onClick={() => openModal('SERVER_SETUP')}
              >
                <Server size={15} />
                <span>{t('settings.serverEdit')}</span>
              </button>

              <button
                type="button"
                className="settings-unified-btn secondary"
                onClick={handleTestServer}
                disabled={serverTestStatus?.loading}
              >
                <RefreshCw size={15} className={serverTestStatus?.loading ? 'spin' : ''} />
                <span>{t('settings.serverTestBtn')}</span>
              </button>
            </div>

            {serverTestStatus && (
              <div
                style={{
                  padding: '0.65rem 0.9rem',
                  borderRadius: '10px',
                  fontSize: '0.8rem',
                  backgroundColor: serverTestStatus.loading
                    ? 'rgba(0, 0, 0, 0.04)'
                    : serverTestStatus.success
                    ? 'rgba(46, 125, 50, 0.1)'
                    : 'rgba(211, 47, 47, 0.1)',
                  color: serverTestStatus.loading
                    ? 'var(--text-secondary)'
                    : serverTestStatus.success
                    ? '#2E7D32'
                    : '#D32F2F',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                }}
              >
                {serverTestStatus.loading ? (
                  <RefreshCw size={14} className="spin" />
                ) : serverTestStatus.success ? (
                  <CheckCircle2 size={15} />
                ) : (
                  <AlertTriangle size={15} />
                )}
                <span>{serverTestStatus.message}</span>
              </div>
            )}
          </div>

          {/* Data Management: Import & Export */}
          <div className="settings-section-card">
            <div className="settings-card-header">
              <div className="settings-header-left">
                <div className="settings-header-icon sage">
                  <Download size={18} />
                </div>
                <div>
                  <div className="settings-header-title">{t('settings.exportTitle')}</div>
                  <div className="settings-header-desc">
                    {t('settings.recordsCount', { count: events.length })}
                  </div>
                </div>
              </div>
              <span className="settings-scope-pill device">{t('settings.scopeDeviceShort')}</span>
            </div>

            {/* Dropzone */}
            <div>
              <div
                className={`dropzone-box ${dragOver ? 'drag-over' : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                id="csv-dropzone"
                style={{ padding: '1.25rem 1rem' }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept=".csv, .json, text/csv, application/json"
                  onChange={(e) => e.target.files && handleFileProcess(e.target.files[0])}
                />
                <div className="dropzone-icon">
                  <FileSpreadsheet size={32} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.94rem' }}>{t('settings.dragDropTitle')}</div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    {t('settings.dragDropSub')}
                  </div>
                </div>
              </div>

              {importError && (
                <div
                  style={{
                    backgroundColor: 'var(--status-red-light)',
                    color: 'var(--status-red)',
                    padding: '0.75rem 1rem',
                    borderRadius: '12px',
                    fontSize: '0.82rem',
                    marginTop: '0.5rem',
                  }}
                >
                  ⚠️ {importError}
                </div>
              )}
            </div>

            {/* Export & Reset Actions */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.65rem' }}>
              <button
                type="button"
                className="settings-unified-btn secondary"
                onClick={exportCSV}
                style={{ height: 'auto', padding: '0.75rem', flexDirection: 'column', gap: '0.2rem' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
                  <FileSpreadsheet size={16} color="var(--color-sage)" />
                  <span>{t('settings.exportCsvBtn')}</span>
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  {t('settings.exportCsvSub')}
                </span>
              </button>

              <button
                type="button"
                className="settings-unified-btn secondary"
                onClick={exportJSON}
                style={{ height: 'auto', padding: '0.75rem', flexDirection: 'column', gap: '0.2rem' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
                  <Download size={16} color="var(--color-slate)" />
                  <span>{t('settings.exportJsonBtn')}</span>
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  {t('settings.exportJsonSub')}
                </span>
              </button>

              <button
                type="button"
                className="settings-unified-btn secondary"
                onClick={handleLoadDemoData}
                style={{ height: 'auto', padding: '0.75rem', flexDirection: 'column', gap: '0.2rem' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
                  <Sparkles size={16} color="var(--color-terracotta)" />
                  <span>{t('settings.loadSampleBtn')}</span>
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  {t('settings.needSampleSub')}
                </span>
              </button>
            </div>

            {events.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handleClear}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    color: 'var(--status-red)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.4rem 0.6rem',
                  }}
                >
                  <Trash2 size={14} />
                  <span>{t('settings.clearData')}</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* App Version & Build Footer */}
      <footer
        style={{
          textAlign: 'center',
          padding: '1rem 0 0.5rem',
          color: 'var(--text-tertiary)',
          fontSize: '0.75rem',
          lineHeight: 1.5,
        }}
      >
        <div>
          Baby Tracker {typeof __APP_VERSION__ !== 'undefined' ? `v${__APP_VERSION__}` : 'v1.0'}{' '}
          {typeof __APP_BUILD_NUMBER__ !== 'undefined' && __APP_BUILD_NUMBER__ !== 'dev'
            ? `(build #${__APP_BUILD_NUMBER__})`
            : ''}
        </div>
        <div>
          {isDutch
            ? '100% Privé • Zelf gehost voor mama & papa'
            : '100% Private • Self-hosted for mom & dad'}
        </div>
      </footer>
    </div>
  );
}
