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
    if (events.length > 0 && !window.confirm('Replace current data with sample dataset?')) {
      return;
    }
    resetToSample();
    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch {}
    alert('Loaded 14 days of realistic baby data! Check Today and Trends tabs.');
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear all logged activities? This cannot be undone.')) {
      clearAllData();
      alert('All activity data cleared.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2>Data & Settings</h2>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Import from Nara Baby, export backups, and configure preferences
        </span>
      </div>

      {/* 1. Nara Baby Import Dropzone (Core feature!) */}
      <div className="trend-card" style={{ gap: '1rem' }}>
        <div className="trend-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: 'var(--color-terracotta-light)', color: 'var(--color-terracotta)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Upload size={16} />
            </div>
            <h3>Import From Nara Baby</h3>
          </div>
        </div>

        <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
          Upload your exported CSV or JSON file from the Nara Baby app. Our smart parser accurately detects all nursing sessions, sleep stretches, wake windows, diapers, growth checkups, and baby firsts!
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
              Drag & Drop your Nara Baby CSV or JSON here
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              or click to browse your device files
            </div>
          </div>
        </div>

        {importError && (
          <div style={{ backgroundColor: 'var(--status-red-light)', color: 'var(--status-red)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.82rem' }}>
            ⚠️ {importError}
          </div>
        )}

        {/* Direct 1-Click Button for Provided Baby Export */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1rem', backgroundColor: 'var(--color-terracotta-light)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(206, 107, 76, 0.2)' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-terracotta)' }}>
              Load Baby's Export (1,319 Events)
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Found your provided export file: 696 feeds, 383 sleeps, 180 diapers, 16 firsts
            </span>
          </div>
          <button
            className="btn-primary"
            style={{ padding: '0.5rem 1rem', fontSize: '0.84rem' }}
            onClick={handleLoadBabyExport}
            id="load-baby-export-btn"
          >
            <Heart size={14} style={{ marginRight: 4 }} />
            Load My Export
          </button>
        </div>

        {/* Generic Demo Data Button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', backgroundColor: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Need generic sample data?</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              Load a synthetic 14-day baby care dataset
            </span>
          </div>
          <button
            className="btn-secondary"
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.78rem' }}
            onClick={handleLoadDemoData}
            id="load-sample-data-btn"
          >
            <Sparkles size={13} style={{ marginRight: 3 }} />
            Load Sample Data
          </button>
        </div>
      </div>

      {/* 2. Export & Backup Section */}
      <div className="trend-card">
        <div className="trend-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: 'var(--color-sage-light)', color: 'var(--color-sage)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Download size={16} />
            </div>
            <h3>Export & Backup</h3>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{events.length} records</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <button className="btn-secondary" onClick={exportCSV} style={{ padding: '0.85rem', flexDirection: 'column', gap: '0.2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
              <FileSpreadsheet size={16} color="var(--color-sage)" />
              Export CSV
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Nara-compatible CSV format</span>
          </button>

          <button className="btn-secondary" onClick={exportJSON} style={{ padding: '0.85rem', flexDirection: 'column', gap: '0.2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
              <Download size={16} color="var(--color-slate)" />
              JSON Archive
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Complete backup file</span>
          </button>
        </div>

        {events.length > 0 && (
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleClear}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--status-red)', fontSize: '0.8rem', fontWeight: 600, padding: '0.4rem 0.6rem' }}
            >
              <Trash2 size={14} />
              Clear All Logged Data
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
            <h3>Baby Profiles</h3>
          </div>

          <button
            className="btn-secondary"
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
            onClick={() => openModal('CHILD_SETTINGS', null)}
          >
            <Plus size={14} style={{ marginRight: 3 }} />
            Add Child
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
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Born: {c.birthdate}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {c.id !== activeChildId && (
                  <button
                    className="btn-secondary"
                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                    onClick={() => setActiveChildId(c.id)}
                  >
                    Select
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
            <h3>Display & Units</h3>
          </div>
        </div>

        {/* Volume Units */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Volume Units</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>For bottles and pumping</div>
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
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Weight Units</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>For baby growth</div>
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
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Appearance</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Linen daytime, Mocha, or Midnight OLED</div>
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
              <Sun size={13} style={{ marginRight: 4 }} /> Light
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
              <Moon size={13} style={{ marginRight: 4 }} /> Dark
            </button>
            <button
              type="button"
              className={`segmented-btn ${preferences.theme === 'oled' ? 'active' : ''}`}
              onClick={() => {
                setPreferences(p => ({ ...p, theme: 'oled' }));
                triggerHaptic('light', preferences?.haptics);
              }}
              title="Pitch-Black OLED Mode (#000000) for nighttime feedings"
            >
              <Sparkles size={13} style={{ marginRight: 4 }} /> OLED
            </button>
          </div>
        </div>

        {/* Haptic Vibration */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Haptic Vibration</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Tactile feedback on taps, timers & quick logs</div>
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
              On
            </button>
            <button
              type="button"
              className={`segmented-btn ${preferences.haptics === false ? 'active' : ''}`}
              onClick={() => setPreferences(p => ({ ...p, haptics: false }))}
            >
              Off
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
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Live Notifications & Tray</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Shows active timers pinned in your Android notification shade while locked
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
              ? '● Active & Allowed'
              : notificationPermission === 'insecure-context'
              ? '⚠️ Requires HTTPS'
              : notificationPermission === 'denied'
              ? '✕ Denied'
              : '○ Not Enabled'}
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
              <span>Enable Live Tray</span>
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
            <span>Send Test Alert</span>
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
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Security & Family Password</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Protected so only you and your wife can view and track baby data
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
            <span>Change Family Password</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={logout}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: 'var(--status-red)' }}
          >
            <LogOut size={14} />
            <span>Lock Device / Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
