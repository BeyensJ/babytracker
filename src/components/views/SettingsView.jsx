import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { parseCSVToRows, convertCsvRowsToEvents, convertJsonToEvents } from '../../utils/csvParser';
import { Upload, Download, FileSpreadsheet, Sparkles, Trash2, Baby, Sliders, Moon, Sun, Plus, Edit2, Heart, Lock, Key, LogOut, ShieldCheck, Bell, Send, AlertTriangle, CheckCircle2, Info, Server, RefreshCw, Eye, EyeOff, Bot, ExternalLink, School, Users } from 'lucide-react';
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
    reminders,
    dueReminders,
    openModal,
    preferences,
    setPreferences,
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
  } = useApp();

  const isDutch = language === 'nl';

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
    setPreferences(p => ({ ...p, daycareName: daycareInput.trim() }));
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
    setTestAlertStatus({ loading: true, message: 'Triggering test notification...' });
    try {
      const res = await testNotification();
      setTestAlertStatus(res);
      setTimeout(() => setTestAlertStatus(null), 8000);
    } catch (err) {
      setTestAlertStatus({ success: false, message: err.message || 'Notification failed' });
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
            setImportError(isDutch ? 'Geen geldige rijen gevonden in dit CSV-bestand.' : 'Could not find valid rows in this CSV file. Please make sure it is a valid export.');
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

  const handleLoadDemoData = () => {
    if (events.length > 0 && !window.confirm(t('settings.sampleConfirm'))) {
      return;
    }
    resetToSample();
    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch { }
    alert(t('settings.sampleSuccess'));
  };

  const handleClear = () => {
    if (window.confirm(t('settings.clearAllConfirm'))) {
      clearAllData();
      alert(t('settings.clearAllAlert'));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2>{t('settings.title')}</h2>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          {t('settings.subtitle')}
        </span>
      </div>

      {/* 1. Data Import Dropzone (Core feature!) */}
      <div className="trend-card" style={{ gap: '1rem' }}>
        <div className="trend-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: 'var(--color-terracotta-light)', color: 'var(--color-terracotta)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Upload size={16} />
            </div>
            <h3>{t('settings.importTitle')}</h3>
          </div>
        </div>

        <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
          {t('settings.importDesc')}
        </p>

        {/* Drag and Drop Zone */}
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
            onChange={e => e.target.files && handleFileProcess(e.target.files[0])}
          />
          <div className="dropzone-icon">
            <FileSpreadsheet size={32} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
              {t('settings.dragDropTitle')}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              {t('settings.dragDropSub')}
            </div>
          </div>
        </div>

        {importError && (
          <div style={{ backgroundColor: 'var(--status-red-light)', color: 'var(--status-red)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.82rem' }}>
            ⚠️ {importError}
          </div>
        )}

      </div>

      {/* 2. Export & Backup Section */}
      <div className="trend-card">
        <div className="trend-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: 'var(--color-sage-light)', color: 'var(--color-sage)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Download size={16} />
            </div>
            <h3>{t('settings.exportTitle')}</h3>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{t('settings.recordsCount', { count: events.length })}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <button className="btn-secondary" onClick={exportCSV} style={{ padding: '0.85rem', flexDirection: 'column', gap: '0.2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
              <FileSpreadsheet size={16} color="var(--color-sage)" />
              {t('settings.exportCsvBtn')}
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{t('settings.exportCsvSub')}</span>
          </button>

          <button className="btn-secondary" onClick={exportJSON} style={{ padding: '0.85rem', flexDirection: 'column', gap: '0.2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
              <Download size={16} color="var(--color-slate)" />
              {t('settings.exportJsonBtn')}
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{t('settings.exportJsonSub')}</span>
          </button>
        </div>

        {events.length > 0 && (
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleClear}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--status-red)', fontSize: '0.8rem', fontWeight: 600, padding: '0.4rem 0.6rem' }}
            >
              <Trash2 size={14} />
              {t('settings.clearData')}
            </button>
          </div>
        )}
      </div>

      {/* 3. Children Management */}
      <div className="trend-card">
        <div className="trend-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: 'var(--color-caramel-light)', color: 'var(--color-caramel)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Baby size={16} />
            </div>
            <h3>{t('settings.babyProfiles')}</h3>
          </div>

          <button
            className="btn-secondary"
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
            onClick={() => openModal('CHILD_SETTINGS', null)}
          >
            <Plus size={14} style={{ marginRight: 3 }} />
            {t('settings.addChild')}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {childList.map(c => (
            <div
              key={c.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                backgroundColor: c.id === activeChildId ? 'var(--bg-card-subtle)' : 'transparent',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-terracotta)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{c.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t('settings.bornOn', { date: c.birthdate })}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {c.id !== activeChildId && (
                  <button
                    className="btn-secondary"
                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                    onClick={() => setActiveChildId(c.id)}
                  >
                    {t('settings.selectBaby')}
                  </button>
                )}
                <button
                  className="btn-secondary"
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                  onClick={() => openModal('CHILD_SETTINGS', c)}
                  aria-label={t('childModal.titleEdit')}
                >
                  <Edit2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3a. Family & Daycare Settings */}
      <div className="trend-card" style={{ gap: '1rem' }}>
        <div className="trend-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: 'var(--color-daycare-light)',
                color: 'var(--color-daycare)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <School size={16} />
            </div>
            <div>
              <h3>{t('settings.familyTitle')}</h3>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {t('settings.familyDesc')}
              </div>
            </div>
          </div>
        </div>

        {/* Default Daycare Name Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t('settings.daycareNameLabel')}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
              {t('settings.daycareNameDesc')}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <School
                size={16}
                style={{
                  position: 'absolute',
                  left: '0.85rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-daycare)',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                className="form-input"
                placeholder={t('settings.daycareNamePlaceholder')}
                value={daycareInput}
                onChange={(e) => setDaycareInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveDaycareName();
                }}
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveDaycareName}
              style={{
                backgroundColor: 'var(--color-daycare)',
                fontSize: '0.82rem',
                padding: '0.5rem 1rem',
                whiteSpace: 'nowrap',
              }}
            >
              <span>{isDutch ? 'Opslaan' : 'Save'}</span>
            </button>
          </div>

          {daycareSavedToast && (
            <span
              style={{
                fontSize: '0.78rem',
                color: '#16A34A',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                marginTop: '0.1rem',
              }}
            >
              <CheckCircle2 size={14} />
              <span>{t('settings.daycareSavedToast')}</span>
            </span>
          )}
        </div>

        {/* Caregivers Management Shortcut */}
        <div
          style={{
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t('settings.manageCaregiversBtn')}</div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
              {Array.isArray(caregivers) && caregivers.length > 0
                ? (isDutch
                    ? `${caregivers.length} verzorgers actief (${caregivers.map((c) => c.name).join(', ')})`
                    : `${caregivers.length} caregivers configured (${caregivers.map((c) => c.name).join(', ')})`)
                : (isDutch ? 'Configureer wie er registreert' : 'Configure caregivers')}
            </div>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              triggerHaptic('light', preferences?.haptics);
              openModal('CAREGIVER');
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.8rem',
              padding: '0.4rem 0.8rem',
            }}
          >
            <Users size={14} />
            <span>{t('settings.manageCaregiversBtn')}</span>
          </button>
        </div>
      </div>

      {/* 3b. Reminders & Schedules */}
      <div className="trend-card">
        <div className="trend-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: 'var(--color-caramel-light)', color: 'var(--color-caramel)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bell size={16} />
            </div>
            <div>
              <h3>{t('reminders.title')}</h3>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t('reminders.subtitle')}</div>
            </div>
          </div>

          <button
            className="btn-secondary"
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
            onClick={() => openModal('REMINDERS')}
          >
            <Plus size={14} style={{ marginRight: 3 }} />
            {t('reminders.addReminder')}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', backgroundColor: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>
              {isDutch ? 'Actieve herinneringen voor' : 'Active reminders for'} {activeChild?.name || 'Baby'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              {dueReminders?.length > 0
                ? (isDutch ? `⚠️ ${dueReminders.length} herinnering(en) te laat om uit te voeren` : `⚠️ ${dueReminders.length} reminder(s) due now`)
                : (isDutch ? `✓ ${reminders?.length || 0} schema('s) actief ingesteld` : `✓ ${reminders?.length || 0} active schedule(s)`)}
            </div>
          </div>

          <button
            className="btn-primary"
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', backgroundColor: 'var(--color-caramel)' }}
            onClick={() => openModal('REMINDERS')}
          >
            {t('reminders.manageReminders')}
          </button>
        </div>
      </div>

      {/* 4. Display & Units Preferences */}
      <div className="trend-card">
        <div className="trend-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: 'var(--bg-card-subtle)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sliders size={16} />
            </div>
            <h3>{t('settings.displayUnits')}</h3>
          </div>
        </div>

        {/* Language Selection */}
        <div className="setting-row">
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t('settings.languageTitle')}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t('settings.languageDesc')}</div>
          </div>
          <div className="segmented-control" style={{ width: 220 }}>
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

        {/* Volume Units */}
        <div className="setting-row">
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t('settings.volumeUnit')}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t('settings.volumeUnitDesc')}</div>
          </div>
          <div className="segmented-control" style={{ width: 140 }}>
            <button
              type="button"
              className={`segmented-btn ${preferences.volumeUnit === 'oz' ? 'active' : ''}`}
              onClick={() => setPreferences(p => ({ ...p, volumeUnit: 'oz' }))}
            >
              Oz (fl oz)
            </button>
            <button
              type="button"
              className={`segmented-btn ${preferences.volumeUnit === 'ml' ? 'active' : ''}`}
              onClick={() => setPreferences(p => ({ ...p, volumeUnit: 'ml' }))}
            >
              mL
            </button>
          </div>
        </div>

        {/* Weight Units */}
        <div className="setting-row">
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t('settings.weightUnit')}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t('settings.weightUnitDesc')}</div>
          </div>
          <div className="segmented-control" style={{ width: 140 }}>
            <button
              type="button"
              className={`segmented-btn ${preferences.weightUnit === 'lb' ? 'active' : ''}`}
              onClick={() => setPreferences(p => ({ ...p, weightUnit: 'lb' }))}
            >
              lb / oz
            </button>
            <button
              type="button"
              className={`segmented-btn ${preferences.weightUnit === 'kg' ? 'active' : ''}`}
              onClick={() => setPreferences(p => ({ ...p, weightUnit: 'kg' }))}
            >
              kg
            </button>
          </div>
        </div>

        {/* Theme Mode */}
        <div className="setting-row">
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t('settings.appearance')}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t('settings.appearanceDesc')}</div>
          </div>
          <div className="segmented-control" style={{ width: 170 }}>
            <button
              type="button"
              className={`segmented-btn ${preferences.theme === 'light' || (!preferences.theme) ? 'active' : ''}`}
              onClick={() => {
                setPreferences(p => ({ ...p, theme: 'light' }));
                triggerHaptic('light', preferences?.haptics);
              }}
              title={t('header.themeWarmLinen')}
            >
              <Sun size={13} style={{ marginRight: 4 }} /> {t('settings.themeLight')}
            </button>
            <button
              type="button"
              className={`segmented-btn ${preferences.theme === 'dark' || preferences.theme === 'oled' ? 'active' : ''}`}
              onClick={() => {
                setPreferences(p => ({ ...p, theme: 'dark' }));
                triggerHaptic('light', preferences?.haptics);
              }}
              title={t('header.themeDark')}
            >
              <Moon size={13} style={{ marginRight: 4 }} /> {t('settings.themeDark')}
            </button>
          </div>
        </div>

        {/* Haptic Vibration */}
        <div className="setting-row">
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t('settings.haptics')}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t('settings.hapticsDesc')}</div>
          </div>
          <div className="segmented-control" style={{ width: 140 }}>
            <button
              type="button"
              className={`segmented-btn ${preferences.haptics !== false ? 'active' : ''}`}
              onClick={() => {
                setPreferences(p => ({ ...p, haptics: true }));
                triggerHaptic('success', true);
              }}
            >
              {t('settings.hapticsOn')}
            </button>
            <button
              type="button"
              className={`segmented-btn ${preferences.haptics === false ? 'active' : ''}`}
              onClick={() => setPreferences(p => ({ ...p, haptics: false }))}
            >
              {t('settings.hapticsOff')}
            </button>
          </div>
        </div>

        {/* Quick Status & Actions Customization */}
        <div className="setting-row">
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t('customizeQuick.title')}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {isDutch
                ? 'Kies welke statuskaarten en actieknoppen getoond worden'
                : 'Choose which status cards and dock buttons are displayed'}
            </div>
          </div>
          <button
            type="button"
            className="action-pill-btn"
            onClick={() => {
              triggerHaptic('light', preferences?.haptics);
              openModal('CUSTOMIZE_QUICK');
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.45rem 0.85rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              backgroundColor: 'var(--bg-card-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-full)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
            }}
          >
            <Sliders size={13} />
            <span>{isDutch ? 'Aanpassen' : 'Customize'}</span>
          </button>
        </div>
      </div>

      {/* 5. Live Notifications & Android Tray */}
      <div className="card settings-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
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
              <Bell size={16} />
            </div>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>{t('settings.notificationsTitle')}</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {t('settings.notificationsDesc')}
              </p>
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

        {/* Insecure Context Warning for Home Server Plain HTTP */}
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
                ? `Browsers blokkeren meldingen en Service Workers over gewone HTTP LAN-adressen (zoals http://192.168.x.x:3001). Om meldingen op je smartphone te ontvangen:`
                : `Browsers strictly disable Notifications and Service Workers over plain HTTP LAN addresses (e.g. http://192.168.x.x:3001). To receive notifications on your phone:`}
            </p>
            <ul style={{ margin: '0.4rem 0 0 1.2rem', padding: 0, color: 'var(--text-secondary)' }}>
              <li>
                <strong>{isDutch ? 'Optie A (Aanbevolen):' : 'Option A (Recommended):'}</strong>{' '}
                {isDutch ? 'Plaats HTTPS voor je server (bv. Caddy, Nginx Proxy Manager of Cloudflare Tunnel).' : 'Put HTTPS in front of your server (e.g., Caddy, Nginx Proxy Manager, or Cloudflare Tunnel).'}
              </li>
              <li>
                <strong>{isDutch ? 'Optie B (Chrome op Android/desktop):' : 'Option B (Chrome on Android/Desktop):'}</strong>{' '}
                {isDutch ? 'Open ' : 'Open '}
                <code>chrome://flags/#unsafely-treat-insecure-origin-as-secure</code>, {isDutch ? 'voeg deze exacte URL toe (' : 'add this exact URL ('}
                <code>{window.location.origin}</code>), {isDutch ? 'kies ' : 'set to '}
                <strong>{isDutch ? 'Ingeschakeld' : 'Enabled'}</strong>{isDutch ? ' en herstart Chrome.' : ', and restart Chrome.'}
              </li>
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          {notificationPermission !== 'granted' && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={requestNotificationPermission}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}
            >
              <Bell size={14} />
              <span>{t('settings.enableTray')}</span>
            </button>
          )}

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleTestAlert}
            disabled={testAlertStatus?.loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}
          >
            <Send size={14} />
            <span>{t('settings.sendTestAlert')}</span>
          </button>
        </div>

        {/* Test Result Feedback */}
        {testAlertStatus && (
          <div
            style={{
              padding: '0.6rem 0.85rem',
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

      {/* 6. Server Connection */}
      <div className="card settings-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'rgba(84, 108, 126, 0.15)',
                color: 'var(--color-slate, #546C7E)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Server size={16} />
            </div>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>{t('settings.serverTitle')}</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {t('settings.serverDesc')}
              </p>
            </div>
          </div>

          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 600,
              padding: '0.2rem 0.6rem',
              borderRadius: '999px',
              backgroundColor: syncService.getServerBaseUrl() ? 'rgba(84, 108, 126, 0.12)' : 'rgba(0, 0, 0, 0.06)',
              color: syncService.getServerBaseUrl() ? 'var(--color-slate, #546C7E)' : 'var(--text-secondary)',
              maxWidth: 160,
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
            className="btn btn-secondary"
            onClick={() => openModal('SERVER_SETUP')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}
          >
            <Server size={14} />
            <span>{t('settings.serverEdit')}</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleTestServer}
            disabled={serverTestStatus?.loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}
          >
            <RefreshCw size={14} className={serverTestStatus?.loading ? 'spin' : ''} />
            <span>{t('settings.serverTestBtn')}</span>
          </button>
        </div>

        {serverTestStatus && (
          <div
            style={{
              padding: '0.6rem 0.85rem',
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

      {/* 6b. Google Gemini AI (Daycare Report Extraction) */}
      <div className="card settings-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.18), rgba(59, 130, 246, 0.18))',
                color: '#9333EA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={16} />
            </div>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>{t('settings.geminiTitle')}</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {t('settings.geminiDesc')}
              </p>
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

        {/* API Key Input Field */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            {t('settings.geminiApiKeyLabel')}
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', position: 'relative' }}>
            <input
              type={showGeminiKey ? 'text' : 'password'}
              className="form-input"
              placeholder={t('settings.geminiApiKeyPlaceholder')}
              value={geminiKeyInput}
              onChange={(e) => setGeminiKeyInput(e.target.value)}
              style={{ flex: 1, paddingRight: '2.5rem', fontFamily: 'monospace', fontSize: '0.85rem' }}
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
          <span style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
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
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSaveGeminiKey}
            style={{ fontSize: '0.82rem', padding: '0.45rem 1rem' }}
          >
            <span>{t('settings.geminiSaveBtn')}</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleTestGeminiKey}
            disabled={geminiTestStatus?.loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}
          >
            <RefreshCw size={14} className={geminiTestStatus?.loading ? 'spin' : ''} />
            <span>{t('settings.geminiTestBtn')}</span>
          </button>

          {geminiSavedToast && (
            <span style={{ fontSize: '0.78rem', color: '#16A34A', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
              <CheckCircle2 size={14} />
              <span>{isDutch ? 'Opgeslagen!' : 'Saved!'}</span>
            </span>
          )}
        </div>

        {/* Test Result Status */}
        {geminiTestStatus && (
          <div
            style={{
              padding: '0.6rem 0.85rem',
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

      {/* 7. Security & Family Password */}
      <div className="card settings-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
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
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>{t('settings.securityTitle')}</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {t('settings.securityDesc')}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => openModal('CHANGE_PASSWORD')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}
          >
            <Key size={14} />
            <span>{t('settings.changeFamilyPassword')}</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={logout}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: 'var(--status-red)' }}
          >
            <LogOut size={14} />
            <span>{t('settings.signOut')}</span>
          </button>
        </div>
      </div>

      {/* App Version & Build Footer */}
      <div style={{ textAlign: 'center', padding: '0.75rem 0 0.5rem', color: 'var(--text-tertiary)', fontSize: '0.75rem', lineHeight: 1.5 }}>
        <div>
          Baby Tracker {typeof __APP_VERSION__ !== 'undefined' ? `v${__APP_VERSION__}` : 'v1.0'} {typeof __APP_BUILD_NUMBER__ !== 'undefined' && __APP_BUILD_NUMBER__ !== 'dev' ? `(build #${__APP_BUILD_NUMBER__})` : ''}
        </div>
        <div>{isDutch ? '100% Privé • Zelf gehost voor mama & papa' : '100% Private • Self-hosted for mom & dad'}</div>
      </div>
    </div>
  );
}
