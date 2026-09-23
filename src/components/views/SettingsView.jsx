import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { parseCSVToRows, convertNaraRowsToEvents, convertNaraJsonToEvents } from '../../utils/csvParser';
import { Upload, Download, FileSpreadsheet, Sparkles, Trash2, Baby, Sliders, Moon, Sun, Plus, Edit2, Heart, Lock, Key, LogOut, ShieldCheck, Bell, Send, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';
import confetti from 'canvas-confetti';

export function SettingsView() {
  const {
    childList,
    activeChild,
    activeChildId,
    setActiveChildId,
    events,
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

  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [importError, setImportError] = useState('');
  const [testAlertStatus, setTestAlertStatus] = useState(null);

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

  // Process selected or dropped file
  const handleFileProcess = (file) => {
    if (!file) return;
    setImportError('');

    const reader = new FileReader();
    const isJson = file.name.endsWith('.json');

    reader.onload = (e) => {
      try {
        const content = e.target.result;
        let parsedEvents = [];
        let detectedProfile = null;
        let detectedUnits = null;

        if (isJson) {
          const json = JSON.parse(content);
          const res = convertNaraJsonToEvents(json, activeChildId);
          parsedEvents = res.events;
          detectedProfile = res.detectedProfile;
          detectedUnits = res.detectedUnits;
        } else {
          // Parse CSV
          const rows = parseCSVToRows(content);
          if (rows.length === 0) {
            setImportError('Could not find valid rows in this CSV file. Please make sure it is a valid export.');
            return;
          }
          const res = convertNaraRowsToEvents(rows, activeChildId);
          parsedEvents = res.events;
          detectedProfile = res.detectedProfile;
          detectedUnits = res.detectedUnits;
        }

        if (parsedEvents.length === 0) {
          setImportError('No recognizable Nara Baby tracking rows found in this file.');
          return;
        }

        // Open Import Preview Modal for user inspection
        openModal('IMPORT_PREVIEW', {
          fileName: file.name,
          parsedEvents,
          detectedProfile,
          detectedUnits,
          detectedCaregivers: res.detectedCaregivers,
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

  // 1-Click loader for the provided example export file
  const handleLoadBabyExport = async () => {
    try {
      const res = await fetch('/example_nara_export.csv');
      const csvText = await res.text();
      const rows = parseCSVToRows(csvText);
      const parsed = convertNaraRowsToEvents(rows, activeChildId);

      openModal('IMPORT_PREVIEW', {
        fileName: 'export_narababy_baby_20260922.csv',
        parsedEvents: parsed.events,
        detectedProfile: parsed.detectedProfile,
        detectedUnits: parsed.detectedUnits,
        detectedCaregivers: parsed.detectedCaregivers,
        activeChildId,
      });
    } catch (err) {
      alert('Failed to load example file: ' + err.message);
    }
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

      {/* 1. Nara Baby Import Dropzone (Core feature!) */}
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
                  aria-label="Edit child profile"
                >
                  <Edit2 size={13} />
                </button>
              </div>
            </div>
          ))}
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t('settings.appearance')}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t('settings.appearanceDesc')}</div>
          </div>
          <div className="segmented-control" style={{ width: 220 }}>
            <button
              type="button"
              className={`segmented-btn ${preferences.theme === 'light' ? 'active' : ''}`}
              onClick={() => {
                setPreferences(p => ({ ...p, theme: 'light' }));
                triggerHaptic('light', preferences?.haptics);
              }}
              title="Warm Linen Daytime"
            >
              <Sun size={13} style={{ marginRight: 4 }} /> {t('settings.themeLight')}
            </button>
            <button
              type="button"
              className={`segmented-btn ${preferences.theme === 'dark' ? 'active' : ''}`}
              onClick={() => {
                setPreferences(p => ({ ...p, theme: 'dark' }));
                triggerHaptic('light', preferences?.haptics);
              }}
              title="Cozy Mocha Night"
            >
              <Moon size={13} style={{ marginRight: 4 }} /> {t('settings.themeDark')}
            </button>
            <button
              type="button"
              className={`segmented-btn ${preferences.theme === 'oled' ? 'active' : ''}`}
              onClick={() => {
                setPreferences(p => ({ ...p, theme: 'oled' }));
                triggerHaptic('light', preferences?.haptics);
              }}
              title="Pitch-Black OLED Mode (#000000)"
            >
              <Sparkles size={13} style={{ marginRight: 4 }} /> {t('settings.themeOled')}
            </button>
          </div>
        </div>

        {/* Haptic Vibration */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
              Home Server Notice: Insecure HTTP Connection
            </div>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
              Browsers strictly disable Notifications and Service Workers over plain HTTP LAN addresses (e.g. <code>http://192.168.x.x:3001</code>). To receive notifications on your phone:
            </p>
            <ul style={{ margin: '0.4rem 0 0 1.2rem', padding: 0, color: 'var(--text-secondary)' }}>
              <li><strong>Option A (Recommended):</strong> Put HTTPS in front of your server (e.g., Caddy, Nginx Proxy Manager, or Cloudflare Tunnel).</li>
              <li><strong>Option B (Chrome on Android/Desktop):</strong> Open <code>chrome://flags/#unsafely-treat-insecure-origin-as-secure</code>, add this exact URL (<code>{window.location.origin}</code>), set to <strong>Enabled</strong>, and restart Chrome.</li>
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

      {/* 6. Security & Family Password */}
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
    </div>
  );
}
