import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { parseCSVToRows, convertCsvRowsToEvents, convertJsonToEvents } from '../../utils/csvParser';
import {
  Upload,
  Download,
  FileSpreadsheet,
  FileText,
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
  Check,
  Smartphone,
  Home,
  User,
  Database,
  Layers,
  Thermometer,
  Scale,
  Droplet,
  Languages,
  Vibrate,
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

  // Category navigation tabs: 'all', 'family', 'user', 'device', 'data'
  const [activeTab, setActiveTab] = useState('all');

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
  const [daycareRemarkInput, setDaycareRemarkInput] = useState(() => preferences?.daycareDefaultRemark || 'daycare');
  const [daycareRemarkSavedToast, setDaycareRemarkSavedToast] = useState(false);

  const handleSaveGeminiKey = () => {
    triggerHaptic('success', preferences?.haptics);
    setPreferences({ geminiApiKey: geminiKeyInput.trim() });
    setGeminiSavedToast(true);
    setTimeout(() => setGeminiSavedToast(false), 3000);
  };

  const handleSaveDaycareName = () => {
    triggerHaptic('success', preferences?.haptics);
    setPreferences(p => ({ ...p, daycareName: daycareInput.trim() }));
    setDaycareSavedToast(true);
    setTimeout(() => setDaycareSavedToast(false), 2500);
  };

  const handleSaveDaycareRemark = () => {
    triggerHaptic('success', preferences?.haptics);
    setPreferences(p => ({ ...p, daycareDefaultRemark: daycareRemarkInput.trim() || 'daycare' }));
    setDaycareRemarkSavedToast(true);
    setTimeout(() => setDaycareRemarkSavedToast(false), 2500);
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
          const rows = parseCSVToRows(content);
          if (rows.length === 0) {
            setImportError(isDutch ? 'Geen geldige rijen gevonden in dit CSV-bestand.' : 'Could not find valid rows in this CSV file.');
            return;
          }
          parsedResult = convertCsvRowsToEvents(rows, activeChildId);
        }

        const parsedEvents = parsedResult?.events || [];
        const detectedProfile = parsedResult?.detectedProfile || null;
        const detectedUnits = parsedResult?.detectedUnits || null;
        const detectedCaregivers = parsedResult?.detectedCaregivers || [];

        if (parsedEvents.length === 0) {
          setImportError(isDutch ? 'Geen herkenbare babyregistraties gevonden in dit bestand.' : 'No recognizable baby tracking rows found in this file.');
          return;
        }

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
        setImportError((isDutch ? 'Fout bij verwerken: ' : 'Failed to parse file: ') + err.message);
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
        title: isDutch ? 'Voorbeelddata laden' : 'Load Demo Data',
        message: t('settings.sampleConfirm'),
        confirmText: isDutch ? 'Data overschrijven' : 'Overwrite Data',
        type: 'warning',
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
    showAlert({
      title: isDutch ? 'Gelukt!' : 'Success',
      message: t('settings.sampleSuccess'),
      type: 'success',
    });
  };

  const handleClear = async () => {
    const ok = await showConfirm({
      title: isDutch ? 'Alle data wissen' : 'Clear All Data',
      message: t('settings.clearAllConfirm'),
      confirmText: isDutch ? 'Ja, alles wissen' : 'Yes, delete all',
      type: 'danger',
    });
    if (ok) {
      clearAllData();
      showAlert({
        title: isDutch ? 'Data gewist' : 'Data Cleared',
        message: t('settings.clearAllAlert'),
        type: 'info',
      });
    }
  };

  // Helper to check section visibility
  const showSection = (tabKey) => activeTab === 'all' || activeTab === tabKey;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Settings Header */}
      <div>
        <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 700 }}>{t('settings.title')}</h2>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          {t('settings.subtitle')}
        </span>
      </div>

      {/* Category Filter Tabs */}
      <div className="settings-tab-bar" role="tablist" aria-label="Settings Categories">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'all'}
          className={`settings-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => {
            triggerHaptic('light', preferences?.haptics);
            setActiveTab('all');
          }}
        >
          <Layers size={14} />
          <span>{t('settings.tabAll')}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'family'}
          className={`settings-tab-btn ${activeTab === 'family' ? 'active' : ''}`}
          onClick={() => {
            triggerHaptic('light', preferences?.haptics);
            setActiveTab('family');
          }}
        >
          <Home size={14} />
          <span>{t('settings.tabFamily')}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'user'}
          className={`settings-tab-btn ${activeTab === 'user' ? 'active' : ''}`}
          onClick={() => {
            triggerHaptic('light', preferences?.haptics);
            setActiveTab('user');
          }}
        >
          <User size={14} />
          <span>{t('settings.tabUser')}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'device'}
          className={`settings-tab-btn ${activeTab === 'device' ? 'active' : ''}`}
          onClick={() => {
            triggerHaptic('light', preferences?.haptics);
            setActiveTab('device');
          }}
        >
          <Smartphone size={14} />
          <span>{t('settings.tabDevice')}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'data'}
          className={`settings-tab-btn ${activeTab === 'data' ? 'active' : ''}`}
          onClick={() => {
            triggerHaptic('light', preferences?.haptics);
            setActiveTab('data');
          }}
        >
          <Database size={14} />
          <span>{t('settings.tabData')}</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. USER / CAREGIVER SETTINGS (Specific to who is using this device)       */}
      {/* ========================================================================= */}
      {showSection('user') && (
        <div className="trend-card" style={{ gap: '1rem' }}>
          <div className="trend-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(206, 107, 76, 0.12)',
                  color: 'var(--color-terracotta, #CE6B4C)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <User size={17} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700 }}>
                  {t('settings.userSection')}
                </h3>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                  {t('settings.userSectionDesc')}
                </div>
              </div>
            </div>

            <span className="settings-scope-badge user">
              <User size={10} />
              {t('settings.badgeUser')}
            </span>
          </div>

          <div>
            <div style={{ fontSize: '0.84rem', fontWeight: 600, marginBottom: '0.2rem' }}>
              {t('settings.activeCaregiverTitle')}:{' '}
              <span style={{ color: activeCaregiver?.color || 'var(--color-terracotta)' }}>
                {activeCaregiver?.name || (isDutch ? 'Geen verzorger' : 'No caregiver')}
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              {t('settings.activeCaregiverDesc')}
            </div>

            {/* Quick Caregiver Switcher Cards */}
            <div className="settings-caregivers-grid">
              {caregivers.map((cg) => {
                const isSelected = cg.id === activeCaregiverId;
                return (
                  <button
                    key={cg.id}
                    type="button"
                    className={`settings-caregiver-card ${isSelected ? 'active' : ''}`}
                    onClick={() => {
                      triggerHaptic('success', preferences?.haptics);
                      setActiveCaregiverId(cg.id);
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        backgroundColor: cg.color || 'var(--color-terracotta)',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {cg.name?.charAt(0).toUpperCase() || 'C'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                      <div
                        style={{
                          fontSize: '0.84rem',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                        }}
                      >
                        {cg.name}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                        {cg.role || (isDutch ? 'Verzorger' : 'Caregiver')}
                      </div>
                    </div>
                    {isSelected && (
                      <Check size={14} color="var(--color-terracotta)" style={{ flexShrink: 0 }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <hr className="settings-divider" />

          {/* Quick Status & Actions Customization (User / Caregiver specific) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Sliders size={15} color="var(--color-terracotta)" />
                <div style={{ fontSize: '0.86rem', fontWeight: 600 }}>{t('customizeQuick.title')}</div>
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                {t('settings.quickStatusDescUser', { name: activeCaregiver?.name || (isDutch ? 'deze verzorger' : 'this caregiver') })}
              </div>
            </div>

            <button
              type="button"
              className="settings-action-btn"
              onClick={() => {
                triggerHaptic('light', preferences?.haptics);
                openModal('CUSTOMIZE_QUICK');
              }}
            >
              <Sliders size={14} />
              <span>{isDutch ? 'Aanpassen' : 'Customize'}</span>
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '0.75rem',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {isDutch
                ? 'Nieuwe verzorgers toevoegen of namen en kleuren aanpassen?'
                : 'Need to add caregivers or change names and colors?'}
            </div>
            <button
              type="button"
              className="settings-action-btn"
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
      )}

      {/* ========================================================================= */}
      {/* 2. DEVICE SETTINGS (Appearance, Zen Mode, Haptics, Local Notifications)   */}
      {/* ========================================================================= */}
      {showSection('device') && (
        <div className="trend-card" style={{ gap: '1.1rem' }}>
          <div className="trend-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(147, 51, 234, 0.1)',
                  color: '#9333EA',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Smartphone size={17} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700 }}>
                  {t('settings.deviceSection')}
                </h3>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                  {t('settings.deviceSectionDesc')}
                </div>
              </div>
            </div>

            <span className="settings-scope-badge device">
              <Smartphone size={10} />
              {t('settings.badgeDevice')}
            </span>
          </div>

          {/* Row 1: Zen Mode Switch */}
          <div className="setting-row">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Flower2 size={15} color="var(--color-terracotta)" />
                <div style={{ fontSize: '0.86rem', fontWeight: 600 }}>{t('settings.zenModeLabel')}</div>
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                {t('settings.zenModeDesc')}
              </div>
            </div>

            <div className="segmented-control settings-control-uniform">
              <button
                type="button"
                className={`segmented-btn ${!isZenMode ? 'active' : ''}`}
                onClick={() => {
                  setPreferences(p => ({ ...p, zenMode: false }));
                  triggerHaptic('light', preferences?.haptics);
                }}
              >
                {t('settings.zenModeOff')}
              </button>
              <button
                type="button"
                className={`segmented-btn ${isZenMode ? 'active' : ''}`}
                onClick={() => {
                  setPreferences(p => ({ ...p, zenMode: true }));
                  triggerHaptic('success', preferences?.haptics);
                }}
              >
                <Flower2 size={12} style={{ marginRight: 3 }} /> {t('settings.zenModeOn')}
              </button>
            </div>
          </div>

          <hr className="settings-divider" />

          {/* Row 2: Theme / Appearance */}
          <div className="setting-row">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {preferences.theme === 'dark' || preferences.theme === 'oled' ? (
                  <Moon size={15} color="var(--color-slate)" />
                ) : (
                  <Sun size={15} color="#D97706" />
                )}
                <div style={{ fontSize: '0.86rem', fontWeight: 600 }}>{t('settings.appearance')}</div>
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                {isZenMode
                  ? (isDutch ? 'Kies tussen Zen Licht en Zen Donker' : 'Choose between Zen Light and Zen Dark')
                  : t('settings.appearanceDesc')}
              </div>
            </div>

            <div className="segmented-control settings-control-uniform">
              <button
                type="button"
                className={`segmented-btn ${preferences.theme === 'light' || !preferences.theme ? 'active' : ''}`}
                onClick={() => {
                  setPreferences(p => ({ ...p, theme: 'light' }));
                  triggerHaptic('light', preferences?.haptics);
                }}
                title={isZenMode ? (isDutch ? 'Zen Licht' : 'Zen Light') : t('header.themeWarmLinen')}
              >
                <Sun size={13} style={{ marginRight: 4 }} />
                {isZenMode ? (isDutch ? 'Zen Licht' : 'Zen Light') : t('settings.themeLight')}
              </button>
              <button
                type="button"
                className={`segmented-btn ${preferences.theme === 'dark' || preferences.theme === 'oled' ? 'active' : ''}`}
                onClick={() => {
                  setPreferences(p => ({ ...p, theme: 'dark' }));
                  triggerHaptic('light', preferences?.haptics);
                }}
                title={isZenMode ? (isDutch ? 'Zen Donker' : 'Zen Dark') : t('header.themeDark')}
              >
                <Moon size={13} style={{ marginRight: 4 }} />
                {isZenMode ? (isDutch ? 'Zen Donker' : 'Zen Dark') : t('settings.themeDark')}
              </button>
            </div>
          </div>

          <hr className="settings-divider" />

          {/* Row 3: Language Selection */}
          <div className="setting-row">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Languages size={15} color="var(--color-slate)" />
                <div style={{ fontSize: '0.86rem', fontWeight: 600 }}>{t('settings.languageTitle')}</div>
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                {t('settings.languageDesc')}
              </div>
            </div>

            <div className="segmented-control settings-control-uniform">
              <button
                type="button"
                className={`segmented-btn ${language === 'nl' ? 'active' : ''}`}
                onClick={() => {
                  setPreferences(p => ({ ...p, language: 'nl' }));
                  triggerHaptic('light', preferences?.haptics);
                }}
              >
                🇳🇱 {t('settings.langDutch')}
              </button>
              <button
                type="button"
                className={`segmented-btn ${language === 'en' ? 'active' : ''}`}
                onClick={() => {
                  setPreferences(p => ({ ...p, language: 'en' }));
                  triggerHaptic('light', preferences?.haptics);
                }}
              >
                🇬🇧 {t('settings.langEnglish')}
              </button>
            </div>
          </div>

          <hr className="settings-divider" />

          {/* Row 4: Haptic Vibration */}
          <div className="setting-row">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Vibrate size={15} color="var(--color-sage)" />
                <div style={{ fontSize: '0.86rem', fontWeight: 600 }}>{t('settings.haptics')}</div>
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                {t('settings.hapticsDesc')}
              </div>
            </div>

            <div className="segmented-control settings-control-uniform">
              <button
                type="button"
                className={`segmented-btn ${preferences.haptics !== false ? 'active' : ''}`}
                onClick={() => {
                  setPreferences(p => ({ ...p, haptics: true }));
                  triggerHaptic('success', true);
                }}
              >
                ✓ {t('settings.hapticsOn')}
              </button>
              <button
                type="button"
                className={`segmented-btn ${preferences.haptics === false ? 'active' : ''}`}
                onClick={() => setPreferences(p => ({ ...p, haptics: false }))}
              >
                ✕ {t('settings.hapticsOff')}
              </button>
            </div>
          </div>

          <hr className="settings-divider" />

          {/* Row 5: Push Notifications on this Device */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Bell size={15} color="var(--color-terracotta)" />
                  <div style={{ fontSize: '0.86rem', fontWeight: 600 }}>{t('settings.notificationsTitle')}</div>
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                  {t('settings.notificationsDesc')}
                </div>
              </div>

              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  padding: '0.2rem 0.6rem',
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

            {/* Insecure Context Warning */}
            {notificationDiagnostics?.isSecure === false && (
              <div
                style={{
                  padding: '0.75rem 0.9rem',
                  backgroundColor: 'rgba(237, 108, 2, 0.08)',
                  border: '1px solid rgba(237, 108, 2, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.78rem',
                  color: 'var(--text-primary)',
                  lineHeight: 1.4,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: '#C25E00', marginBottom: '0.3rem' }}>
                  <AlertTriangle size={15} />
                  {t('settings.insecureTitle')}
                </div>
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                  {isDutch
                    ? 'Browsers blokkeren pushmeldingen over gewone HTTP LAN-adressen (zoals http://192.168.x.x:3001). Gebruik HTTPS of voeg chrome://flags/#unsafely-treat-insecure-origin-as-secure toe.'
                    : 'Browsers disable notifications over plain HTTP LAN. Use HTTPS or configure Chrome insecure origins flag.'}
                </p>
              </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
              {notificationPermission !== 'granted' && (
                <button
                  type="button"
                  className="settings-action-btn"
                  onClick={requestNotificationPermission}
                  style={{ backgroundColor: 'var(--color-terracotta)', color: '#FFFFFF', borderColor: 'var(--color-terracotta)' }}
                >
                  <Bell size={14} />
                  <span>{t('settings.enableTray')}</span>
                </button>
              )}

              <button
                type="button"
                className="settings-action-btn"
                onClick={handleTestAlert}
                disabled={testAlertStatus?.loading}
              >
                <Send size={14} />
                <span>{t('settings.sendTestAlert')}</span>
              </button>
            </div>

            {testAlertStatus && (
              <div
                style={{
                  padding: '0.55rem 0.8rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.78rem',
                  backgroundColor: testAlertStatus.success ? 'rgba(46, 125, 50, 0.1)' : 'rgba(211, 47, 47, 0.1)',
                  color: testAlertStatus.success ? '#2E7D32' : '#D32F2F',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                {testAlertStatus.success ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                <span>{testAlertStatus.message}</span>
              </div>
            )}
          </div>

          <hr className="settings-divider" />

          {/* Row 6: Server Connection & Sync Diagnostics */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Server size={15} color="var(--color-slate)" />
                  <div style={{ fontSize: '0.86rem', fontWeight: 600 }}>{t('settings.serverTitle')}</div>
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                  {t('settings.serverDesc')}
                </div>
              </div>

              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  padding: '0.2rem 0.6rem',
                  borderRadius: '999px',
                  backgroundColor: 'rgba(84, 108, 126, 0.12)',
                  color: 'var(--color-slate, #546C7E)',
                  maxWidth: 180,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {syncService.getServerBaseUrl() || t('settings.serverDefault')}
              </span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
              <button
                type="button"
                className="settings-action-btn"
                onClick={() => openModal('SERVER_SETUP')}
              >
                <Server size={14} />
                <span>{t('settings.serverEdit')}</span>
              </button>

              <button
                type="button"
                className="settings-action-btn"
                onClick={handleTestServer}
                disabled={serverTestStatus?.loading}
              >
                <RefreshCw size={14} className={serverTestStatus?.loading ? 'spin' : ''} />
                <span>{t('settings.serverTestBtn')}</span>
              </button>
            </div>

            {serverTestStatus && (
              <div
                style={{
                  padding: '0.55rem 0.8rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.78rem',
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
                  gap: '0.4rem',
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. FAMILY SETTINGS (Synchronized with all caregivers in the household)    */}
      {/* ========================================================================= */}
      {showSection('family') && (
        <div className="trend-card" style={{ gap: '1.25rem' }}>
          <div className="trend-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(84, 108, 126, 0.12)',
                  color: 'var(--color-slate, #546C7E)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Home size={17} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700 }}>
                  {t('settings.familySection')}
                </h3>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                  {t('settings.familySectionDesc')}
                </div>
              </div>
            </div>

            <span className="settings-scope-badge family">
              <Home size={10} />
              {t('settings.badgeFamily')}
            </span>
          </div>

          {/* Part 1: Baby Profiles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Baby size={15} color="var(--color-caramel)" />
                  <div style={{ fontSize: '0.86rem', fontWeight: 600 }}>{t('settings.babyProfiles')}</div>
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                  {isDutch ? 'Beheer babyprofielen en schakel tussen kinderen' : 'Manage baby profiles and active child'}
                </div>
              </div>

              <button
                type="button"
                className="settings-action-btn"
                onClick={() => openModal('CHILD_SETTINGS', null)}
              >
                <Plus size={14} />
                <span>{t('settings.addChild')}</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {childList.map((c) => {
                const isSelected = c.id === activeChildId;
                const babyColor = c.avatarColor || 'terracotta';
                return (
                  <div
                    key={c.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.65rem 0.85rem',
                      backgroundColor: isSelected ? 'var(--bg-card-subtle)' : 'transparent',
                      borderRadius: 'var(--radius-md)',
                      border: isSelected ? `1.5px solid var(--color-${babyColor})` : '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: '50%',
                          background: `var(--color-${babyColor})`,
                          color: '#FFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.86rem',
                          boxShadow: isSelected ? `0 0 0 2px var(--bg-card), 0 0 0 4px var(--color-${babyColor})` : 'none',
                        }}
                      >
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                          {c.name} {isSelected && <span style={{ fontSize: '0.72rem', color: `var(--color-${babyColor})`, fontWeight: 600 }}>• {isDutch ? 'Actief' : 'Active'}</span>}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                          {t('settings.bornOn', { date: c.birthdate })}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {!isSelected && (
                        <button
                          type="button"
                          className="settings-action-btn"
                          style={{ height: 32, padding: '0 0.65rem', fontSize: '0.75rem' }}
                          onClick={() => {
                            triggerHaptic('light', preferences?.haptics);
                            setActiveChildId(c.id);
                          }}
                        >
                          {t('settings.selectBaby')}
                        </button>
                      )}
                      <button
                        type="button"
                        className="settings-action-btn"
                        style={{
                          height: 32,
                          padding: '0 0.55rem',
                          fontSize: '0.75rem',
                          color: c.sickMode?.active ? 'var(--color-health)' : 'var(--text-secondary)',
                          backgroundColor: c.sickMode?.active ? 'var(--color-health-light)' : 'transparent',
                          borderColor: c.sickMode?.active ? 'var(--color-health)' : 'var(--border-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}
                        onClick={() => {
                          if (!isSelected) setActiveChildId(c.id);
                          openModal('SICK_MODE');
                        }}
                        title={isDutch ? 'Ziekte-modus beheren' : 'Manage Sick Mode'}
                      >
                        <span>🤒</span>
                        <span>{c.sickMode?.active ? (isDutch ? 'Ziek' : 'Sick') : (isDutch ? 'Ziekte-modus' : 'Sick Mode')}</span>
                      </button>
                      <button
                        type="button"
                        className="settings-action-btn"
                        style={{ height: 32, width: 32, padding: 0 }}
                        onClick={() => openModal('CHILD_SETTINGS', c)}
                        aria-label={t('childModal.titleEdit')}
                      >
                        <Edit2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <hr className="settings-divider" />

          {/* Part 2: Opvang & Crèche */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <School size={15} color="var(--color-daycare)" />
                <div style={{ fontSize: '0.86rem', fontWeight: 600 }}>{t('settings.daycareNameLabel')}</div>
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                {t('settings.daycareNameDesc')}
              </div>
            </div>

            <div className="settings-input-group">
              <input
                type="text"
                className="form-input"
                placeholder={t('settings.daycareNamePlaceholder')}
                value={daycareInput}
                onChange={(e) => setDaycareInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveDaycareName();
                }}
              />
              <button
                type="button"
                className="btn btn-primary save-btn"
                onClick={handleSaveDaycareName}
                style={{ backgroundColor: 'var(--color-daycare)' }}
              >
                <span>{isDutch ? 'Opslaan' : 'Save'}</span>
              </button>
            </div>

            {daycareSavedToast && (
              <span
                style={{
                  fontSize: '0.75rem',
                  color: '#16A34A',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                <CheckCircle2 size={14} />
                <span>{t('settings.daycareSavedToast')}</span>
              </span>
            )}

            {/* Default Activity Remark Setting */}
            <div style={{ marginTop: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <FileText size={15} color="var(--color-daycare)" />
                <div style={{ fontSize: '0.86rem', fontWeight: 600 }}>{t('settings.daycareDefaultRemarkLabel')}</div>
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                {t('settings.daycareDefaultRemarkDesc')}
              </div>
            </div>

            <div className="settings-input-group">
              <input
                type="text"
                className="form-input"
                placeholder={t('settings.daycareDefaultRemarkPlaceholder') || 'daycare'}
                value={daycareRemarkInput}
                onChange={(e) => setDaycareRemarkInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveDaycareRemark();
                }}
              />
              <button
                type="button"
                className="btn btn-primary save-btn"
                onClick={handleSaveDaycareRemark}
                style={{ backgroundColor: 'var(--color-daycare)' }}
              >
                <span>{isDutch ? 'Opslaan' : 'Save'}</span>
              </button>
            </div>

            {daycareRemarkSavedToast && (
              <span
                style={{
                  fontSize: '0.75rem',
                  color: '#16A34A',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                <CheckCircle2 size={14} />
                <span>{t('settings.daycareDefaultRemarkSavedToast')}</span>
              </span>
            )}
          </div>

          <hr className="settings-divider" />

          {/* Part 3: Reminders & Schedules */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Bell size={15} color="var(--color-caramel)" />
                <div style={{ fontSize: '0.86rem', fontWeight: 600 }}>{t('reminders.title')}</div>
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                {dueReminders?.length > 0
                  ? (isDutch ? `⚠️ ${dueReminders.length} herinnering(en) te laat om uit te voeren` : `⚠️ ${dueReminders.length} reminder(s) due now`)
                  : (isDutch ? `✓ ${reminders?.length || 0} schema('s) actief ingesteld` : `✓ ${reminders?.length || 0} active schedule(s)`)}
              </div>
            </div>

            <button
              type="button"
              className="settings-action-btn"
              onClick={() => {
                triggerHaptic('light', preferences?.haptics);
                openModal('REMINDERS');
              }}
            >
              <Bell size={14} />
              <span>{t('reminders.manageReminders')}</span>
            </button>
          </div>

          <hr className="settings-divider" />

          {/* Part 4: Measurement Units */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ fontSize: '0.86rem', fontWeight: 600 }}>{t('settings.displayUnits')}</div>

            {/* Volume */}
            <div className="setting-row">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', fontWeight: 600 }}>
                  <Droplet size={13} color="var(--color-breast)" />
                  <span>{t('settings.volumeUnit')}</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{t('settings.volumeUnitDesc')}</div>
              </div>
              <div className="segmented-control settings-control-uniform">
                <button
                  type="button"
                  className={`segmented-btn ${preferences.volumeUnit === 'ml' || !preferences.volumeUnit ? 'active' : ''}`}
                  onClick={() => {
                    setPreferences(p => ({ ...p, volumeUnit: 'ml' }));
                    triggerHaptic('light', preferences?.haptics);
                  }}
                >
                  mL
                </button>
                <button
                  type="button"
                  className={`segmented-btn ${preferences.volumeUnit === 'oz' ? 'active' : ''}`}
                  onClick={() => {
                    setPreferences(p => ({ ...p, volumeUnit: 'oz' }));
                    triggerHaptic('light', preferences?.haptics);
                  }}
                >
                  fl oz
                </button>
              </div>
            </div>

            {/* Weight */}
            <div className="setting-row">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', fontWeight: 600 }}>
                  <Scale size={13} color="var(--color-sage)" />
                  <span>{t('settings.weightUnit')}</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{t('settings.weightUnitDesc')}</div>
              </div>
              <div className="segmented-control settings-control-uniform">
                <button
                  type="button"
                  className={`segmented-btn ${preferences.weightUnit === 'kg' || !preferences.weightUnit ? 'active' : ''}`}
                  onClick={() => {
                    setPreferences(p => ({ ...p, weightUnit: 'kg' }));
                    triggerHaptic('light', preferences?.haptics);
                  }}
                >
                  kg
                </button>
                <button
                  type="button"
                  className={`segmented-btn ${preferences.weightUnit === 'lb' ? 'active' : ''}`}
                  onClick={() => {
                    setPreferences(p => ({ ...p, weightUnit: 'lb' }));
                    triggerHaptic('light', preferences?.haptics);
                  }}
                >
                  lb
                </button>
              </div>
            </div>

            {/* Temperature */}
            <div className="setting-row">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', fontWeight: 600 }}>
                  <Thermometer size={13} color="#EF4444" />
                  <span>{t('settings.tempUnit')}</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{t('settings.tempUnitDesc')}</div>
              </div>
              <div className="segmented-control settings-control-uniform">
                <button
                  type="button"
                  className={`segmented-btn ${preferences.tempUnit === 'C' || !preferences.tempUnit ? 'active' : ''}`}
                  onClick={() => {
                    setPreferences(p => ({ ...p, tempUnit: 'C' }));
                    triggerHaptic('light', preferences?.haptics);
                  }}
                >
                  °C
                </button>
                <button
                  type="button"
                  className={`segmented-btn ${preferences.tempUnit === 'F' ? 'active' : ''}`}
                  onClick={() => {
                    setPreferences(p => ({ ...p, tempUnit: 'F' }));
                    triggerHaptic('light', preferences?.haptics);
                  }}
                >
                  °F
                </button>
              </div>
            </div>
          </div>

          <hr className="settings-divider" />

          {/* Part 5: Google Gemini AI API Key */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Sparkles size={15} color="#9333EA" />
                  <div style={{ fontSize: '0.86rem', fontWeight: 600 }}>{t('settings.geminiTitle')}</div>
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                  {t('settings.geminiDesc')}
                </div>
              </div>

              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  padding: '0.2rem 0.6rem',
                  borderRadius: '999px',
                  backgroundColor: preferences?.geminiApiKey ? 'rgba(34, 197, 94, 0.12)' : 'rgba(0, 0, 0, 0.06)',
                  color: preferences?.geminiApiKey ? '#16A34A' : 'var(--text-secondary)',
                }}
              >
                {preferences?.geminiApiKey ? (isDutch ? '● Actief' : '● Active') : (isDutch ? '○ Niet ingesteld' : '○ Not Configured')}
              </span>
            </div>

            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type={showGeminiKey ? 'text' : 'password'}
                className="form-input"
                placeholder={t('settings.geminiApiKeyPlaceholder')}
                value={geminiKeyInput}
                onChange={(e) => setGeminiKeyInput(e.target.value)}
                style={{ paddingRight: '2.5rem', fontFamily: 'monospace', fontSize: '0.84rem' }}
              />
              <button
                type="button"
                className="btn-icon-subtle"
                onClick={() => setShowGeminiKey(!showGeminiKey)}
                title={showGeminiKey ? 'Verberg sleutel' : 'Toon sleutel'}
                style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)' }}
              >
                {showGeminiKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
              <button
                type="button"
                className="settings-action-btn"
                onClick={handleSaveGeminiKey}
                style={{ backgroundColor: 'var(--color-terracotta)', color: '#FFFFFF', borderColor: 'var(--color-terracotta)' }}
              >
                <span>{t('settings.geminiSaveBtn')}</span>
              </button>

              <button
                type="button"
                className="settings-action-btn"
                onClick={handleTestGeminiKey}
                disabled={geminiTestStatus?.loading}
              >
                <RefreshCw size={14} className={geminiTestStatus?.loading ? 'spin' : ''} />
                <span>{t('settings.geminiTestBtn')}</span>
              </button>

              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--color-daycare)',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  marginLeft: 'auto',
                }}
              >
                <span>Google AI Studio</span>
                <ExternalLink size={11} />
              </a>
            </div>

            {geminiSavedToast && (
              <span style={{ fontSize: '0.75rem', color: '#16A34A', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                <CheckCircle2 size={14} />
                <span>{isDutch ? 'API-sleutel opgeslagen!' : 'API Key saved!'}</span>
              </span>
            )}

            {geminiTestStatus && (
              <div
                style={{
                  padding: '0.55rem 0.8rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.78rem',
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
                  gap: '0.4rem',
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

          <hr className="settings-divider" />

          {/* Part 6: Security & Sign Out */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Lock size={15} color="var(--color-terracotta)" />
                <div style={{ fontSize: '0.86rem', fontWeight: 600 }}>{t('settings.securityTitle')}</div>
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                {t('settings.securityDesc')}
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              <button
                type="button"
                className="settings-action-btn"
                onClick={() => openModal('CHANGE_PASSWORD')}
              >
                <Key size={14} />
                <span>{t('settings.changeFamilyPassword')}</span>
              </button>

              <button
                type="button"
                className="settings-action-btn"
                onClick={logout}
                style={{ color: 'var(--status-red)' }}
              >
                <LogOut size={14} />
                <span>{t('settings.signOut')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. DATA MANAGEMENT & BACKUP                                              */}
      {/* ========================================================================= */}
      {showSection('data') && (
        <div className="trend-card" style={{ gap: '1.25rem' }}>
          <div className="trend-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(92, 122, 107, 0.12)',
                  color: 'var(--color-sage, #5C7A6B)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Database size={17} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700 }}>
                  {t('settings.dataSection')}
                </h3>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                  {t('settings.dataSectionDesc')}
                </div>
              </div>
            </div>

            <span className="settings-scope-badge data">
              <Database size={10} />
              {t('settings.badgeData')}
            </span>
          </div>

          {/* Import Dropzone */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div style={{ fontSize: '0.86rem', fontWeight: 600 }}>{t('settings.importTitle')}</div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              {t('settings.importDesc')}
            </p>

            <div
              className={`dropzone-box ${dragOver ? 'drag-over' : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              id="csv-dropzone"
            >
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".csv, .json, text/csv, application/json"
                onChange={(e) => e.target.files && handleFileProcess(e.target.files[0])}
              />
              <div className="dropzone-icon">
                <FileSpreadsheet size={30} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{t('settings.dragDropTitle')}</div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                  {t('settings.dragDropSub')}
                </div>
              </div>
            </div>

            {importError && (
              <div
                style={{
                  backgroundColor: 'var(--status-red-light)',
                  color: 'var(--status-red)',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8rem',
                }}
              >
                ⚠️ {importError}
              </div>
            )}
          </div>

          <hr className="settings-divider" />

          {/* Export & Backups */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '0.86rem', fontWeight: 600 }}>{t('settings.exportTitle')}</div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                {t('settings.recordsCount', { count: events.length })}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={exportCSV}
                style={{ padding: '0.75rem', flexDirection: 'column', gap: '0.2rem' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.84rem' }}>
                  <FileSpreadsheet size={15} color="var(--color-sage)" />
                  {t('settings.exportCsvBtn')}
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{t('settings.exportCsvSub')}</span>
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={exportJSON}
                style={{ padding: '0.75rem', flexDirection: 'column', gap: '0.2rem' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.84rem' }}>
                  <Download size={15} color="var(--color-slate)" />
                  {t('settings.exportJsonBtn')}
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{t('settings.exportJsonSub')}</span>
              </button>
            </div>
          </div>

          <hr className="settings-divider" />

          {/* Sample Data & Clear Data */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <button
              type="button"
              className="settings-action-btn"
              onClick={handleLoadDemoData}
            >
              <Sparkles size={14} color="var(--color-caramel)" />
              <span>{t('settings.loadSampleBtn')}</span>
            </button>

            {events.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  color: 'var(--status-red)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  padding: '0.4rem 0.6rem',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <Trash2 size={14} />
                <span>{t('settings.clearData')}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* App Version & Build Footer */}
      <div style={{ textAlign: 'center', padding: '0.75rem 0 0.5rem', color: 'var(--text-tertiary)', fontSize: '0.74rem', lineHeight: 1.5 }}>
        <div>
          Baby Tracker {typeof __APP_VERSION__ !== 'undefined' ? `v${__APP_VERSION__}` : 'v1.0'} {typeof __APP_BUILD_NUMBER__ !== 'undefined' && __APP_BUILD_NUMBER__ !== 'dev' ? `(build #${__APP_BUILD_NUMBER__})` : ''}
        </div>
        <div>{isDutch ? '100% Privé • Zelf gehost voor mama & papa' : '100% Private • Self-hosted for mom & dad'}</div>
      </div>
    </div>
  );
}
