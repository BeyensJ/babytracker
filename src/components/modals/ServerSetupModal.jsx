import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { syncService } from '../../services/syncService';
import { Server, Wifi, CheckCircle2, AlertTriangle, RefreshCw, X } from 'lucide-react';

export function ServerSetupModal({ isOpen, onClose }) {
  const { t, language } = useApp();
  const isDutch = language === 'nl';

  const [serverUrl, setServerUrl] = useState('');
  const [testStatus, setTestStatus] = useState(null); // null | { loading: boolean, success: boolean, message: string }
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const current = syncService.getServerBaseUrl();
      setServerUrl(current || '');
      setTestStatus(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTest = async () => {
    setTestStatus({ loading: true, message: t('settings.serverTesting') });
    try {
      const res = await syncService.checkServerHealth(serverUrl);
      if (res.reachable) {
        setTestStatus({
          loading: false,
          success: true,
          message: isDutch
            ? `Verbonden! Server reageert (HTTP ${res.status})`
            : `Connected! Server responded (HTTP ${res.status})`,
        });
      } else {
        setTestStatus({
          loading: false,
          success: false,
          message: isDutch
            ? `Kan server niet bereiken: ${res.error || 'Controleer IP en poort'}`
            : `Cannot reach server: ${res.error || 'Check IP and port'}`,
        });
      }
    } catch (err) {
      setTestStatus({
        loading: false,
        success: false,
        message: err.message || (isDutch ? 'Verbinding mislukt' : 'Connection failed'),
      });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      syncService.setServerBaseUrl(serverUrl);
      // Reconnect WebSocket with new base URL
      syncService.disconnect();
      if (syncService.hasToken()) {
        syncService.connect();
      }
      onClose();
      // Optional slight reload or state re-sync
      window.location.reload();
    } catch {
      setIsSaving(false);
    }
  };

  const handleResetToDefault = () => {
    setServerUrl('');
    syncService.setServerBaseUrl('');
    syncService.disconnect();
    if (syncService.hasToken()) {
      syncService.connect();
    }
    onClose();
    window.location.reload();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
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
              <Server size={18} />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>
              {t('settings.serverTitle')}
            </h3>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem 1.25rem' }}>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              {t('settings.serverDesc')}. {isDutch ? 'Voer het volledige adres in van je server (bijv. http://192.168.1.150:3001 of https://baby.mijndomein.nl).' : 'Enter your server address (e.g. http://192.168.1.150:3001 or https://baby.mydomain.com).'}
            </p>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-primary)' }}>
                {t('settings.serverUrlLabel')}
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="http://192.168.1.150:3001"
                  value={serverUrl}
                  onChange={(e) => {
                    setServerUrl(e.target.value);
                    setTestStatus(null);
                  }}
                  style={{ flex: 1, fontSize: '0.85rem' }}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleTest}
                  disabled={testStatus?.loading}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap', fontSize: '0.8rem', padding: '0.5rem 0.75rem' }}
                >
                  <Wifi size={14} className={testStatus?.loading ? 'spin' : ''} />
                  <span>{t('settings.serverTestBtn')}</span>
                </button>
              </div>
            </div>

            {/* Test Status feedback */}
            {testStatus && (
              <div
                style={{
                  padding: '0.6rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.78rem',
                  backgroundColor: testStatus.loading
                    ? 'rgba(0, 0, 0, 0.04)'
                    : testStatus.success
                    ? 'rgba(46, 125, 50, 0.12)'
                    : 'rgba(211, 47, 47, 0.12)',
                  color: testStatus.loading
                    ? 'var(--text-secondary)'
                    : testStatus.success
                    ? '#2E7D32'
                    : '#D32F2F',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                {testStatus.loading ? (
                  <RefreshCw size={14} className="spin" />
                ) : testStatus.success ? (
                  <CheckCircle2 size={15} />
                ) : (
                  <AlertTriangle size={15} />
                )}
                <span>{testStatus.message}</span>
              </div>
            )}

            {/* Current vs Default indicator */}
            <div style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{t('settings.serverCurrent')}: <strong>{syncService.getServerBaseUrl() || t('settings.serverDefault')}</strong></span>
              {syncService.getServerBaseUrl() && (
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  style={{ background: 'none', border: 'none', color: 'var(--color-terracotta)', cursor: 'pointer', textDecoration: 'underline', padding: 0, fontSize: '0.74rem' }}
                >
                  {isDutch ? 'Herstel standaard' : 'Reset to default'}
                </button>
              )}
            </div>
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', padding: '0.75rem 1.25rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSaving}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSaving}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <CheckCircle2 size={15} />
              <span>{t('settings.serverSaveBtn')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
