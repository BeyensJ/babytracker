import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { calculateBabyAge, getWakeWindowStatus } from '../utils/formatters';
import { ChevronDown, Plus, Moon, Sun, Baby, Download, Bell, BellRing, Sparkles } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

export function Header({ onOpenSettings }) {
  const {
    childList,
    activeChild,
    activeChildId,
    setActiveChildId,
    events,
    activeTimers,
    reminders,
    dueReminders,
    openModal,
    activeCaregiver,
    syncStatus,
    canInstallPWA,
    installPWA,
    notificationPermission,
    requestNotificationPermission,
    preferences,
    setPreferences,
    language,
    t,
  } = useApp();
  const isDutch = language === 'nl';
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Update live clock every 30 seconds for relative times
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Calculate current wake-window or sleep status
  const isSleeping = Boolean(activeTimers.sleep?.running);
  let awakeMs = 0;

  if (isSleeping) {
    awakeMs = -1; // sleeping
  } else {
    // Find last sleep event for active child
    const childEvents = events.filter(e => !e.childKey || e.childKey === activeChildId);
    const lastSleep = childEvents.find(e => e.type === 'SLEEP');
    if (lastSleep) {
      const isOngoing = !lastSleep.endDt && !lastSleep.durationMs;
      if (isOngoing) {
        awakeMs = -1;
      } else {
        const sleepEnd = lastSleep.endDt || (lastSleep.beginDt + (lastSleep.durationMs || 0));
        awakeMs = Math.max(0, now - sleepEnd);
      }
    } else {
      awakeMs = 60 * 60 * 1000; // default 1 hour if no sleep logged
    }
  }

  const wakeStatus = (isSleeping || awakeMs === -1)
    ? { label: language === 'nl' ? 'Slaapt nu' : 'Sleeping', status: 'neutral' }
    : getWakeWindowStatus(awakeMs, language);

  const babyAge = calculateBabyAge(activeChild?.birthdate, language);

  return (
    <header className="app-header">
      {/* Left: Child Switcher Button */}
      <div style={{ position: 'relative' }}>
        <button
          className="baby-profile-btn"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          aria-label={t('header.switchBaby')}
          id="baby-selector-btn"
        >
          <div className="baby-avatar">
            {activeChild?.name ? activeChild.name.charAt(0).toUpperCase() : 'B'}
          </div>
          <div className="baby-info">
            <div className="baby-name-row">
              <span className="baby-name">{activeChild?.name || 'Baby'}</span>
              <ChevronDown size={14} color="var(--text-tertiary)" />
            </div>
            <span className="baby-age">{babyAge}</span>
          </div>
        </button>

        {/* Dropdown Menu */}
        {dropdownOpen && (
          <>
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 40 }}
              onClick={() => setDropdownOpen(false)}
            />
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                backgroundColor: 'var(--bg-card)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                border: '1px solid var(--border-subtle)',
                width: 220,
                zIndex: 50,
                padding: '0.4rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.2rem',
                animation: 'slideInDown 0.2s ease-out',
              }}
            >
              <div style={{ padding: '0.4rem 0.6rem', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                Your Children
              </div>

              {childList.map(c => (
                <button
                  key={c.id}
                  onClick={() => {
                    setActiveChildId(c.id);
                    setDropdownOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    padding: '0.5rem 0.65rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: c.id === activeChildId ? 'var(--bg-card-subtle)' : 'transparent',
                    color: 'var(--text-primary)',
                    fontWeight: c.id === activeChildId ? 600 : 400,
                    width: '100%',
                    textAlign: 'left',
                  }}
                >
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      background: 'var(--color-terracotta)',
                      color: '#FFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, lineHeight: 1.2 }}>
                    <div style={{ fontSize: '0.85rem' }}>{c.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{calculateBabyAge(c.birthdate)}</div>
                  </div>
                </button>
              ))}

              <div style={{ height: 1, backgroundColor: 'var(--border-subtle)', margin: '0.3rem 0' }} />

              <button
                onClick={() => {
                  setDropdownOpen(false);
                  openModal('CHILD_SETTINGS', null);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-terracotta)',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                }}
              >
                <Plus size={16} />
                Add Another Child
              </button>
            </div>
          </>
        )}
      </div>

      {/* Right Controls: Streamlined Reminders, Theme, Caregiver & Sync Status */}
      <div className="header-right-controls">
        <button
          className={`header-reminders-btn ${dueReminders?.length > 0 ? 'has-due' : ''}`}
          onClick={() => {
            openModal('REMINDERS');
            triggerHaptic('light', preferences?.haptics);
          }}
          title={
            isDutch
              ? (dueReminders?.length > 0
                ? `${dueReminders.length} herinnering(en) te laat`
                : 'Herinneringen & Schema\'s')
              : (dueReminders?.length > 0
                ? `${dueReminders.length} reminder(s) due`
                : 'Reminders & Schedules')
          }
          aria-label={t('reminders.title')}
          id="header-reminders-btn"
        >
          {dueReminders?.length > 0 ? (
            <>
              <BellRing size={16} color="var(--color-terracotta)" />
              <span className="header-due-badge">{dueReminders.length}</span>
            </>
          ) : (
            <Bell size={16} color="var(--text-secondary)" />
          )}
        </button>

        <button
          className="header-theme-toggle-btn"
          onClick={() => {
            const isDark = preferences?.theme === 'dark' || preferences?.theme === 'oled';
            setPreferences(p => ({ ...p, theme: isDark ? 'light' : 'dark' }));
            triggerHaptic('light', preferences?.haptics);
          }}
          title={
            language === 'nl'
              ? (preferences?.theme === 'dark' || preferences?.theme === 'oled'
                ? 'Huidig: Nachtelijk OLED (Tik voor Licht)'
                : 'Huidig: Licht (Tik voor Donker OLED)')
              : (preferences?.theme === 'dark' || preferences?.theme === 'oled'
                ? 'Current: Dark OLED (Tap for Light)'
                : 'Current: Light (Tap for Dark OLED)')
          }
          aria-label={language === 'nl' ? 'Thema wisselen' : 'Toggle theme appearance'}
          id="quick-theme-btn"
        >
          {preferences?.theme === 'dark' || preferences?.theme === 'oled' ? (
            <Moon size={16} color="var(--color-caramel)" />
          ) : (
            <Sun size={16} color="var(--color-terracotta)" />
          )}
        </button>

        <button
          className="header-caregiver-btn"
          onClick={() => openModal('CAREGIVER')}
          title={
            language === 'nl'
              ? `Actieve verzorger: ${activeCaregiver?.name} (${activeCaregiver?.role}) · Tik om profiel te wisselen`
              : `Active Caregiver: ${activeCaregiver?.name} (${activeCaregiver?.role}) · Tap to switch profile`
          }
          id="caregiver-switcher-btn"
        >
          <div className="header-avatar-wrap">
            <div
              className="header-caregiver-avatar"
              style={{ backgroundColor: activeCaregiver?.color || 'var(--color-terracotta)' }}
            >
              {activeCaregiver?.name ? activeCaregiver.name.charAt(0).toUpperCase() : 'C'}
            </div>
            {/* Live sync indicator dot on avatar */}
            <span
              className={`header-avatar-sync-dot status-${syncStatus}`}
              title={syncStatus === 'connected' ? 'Synced with family backend' : syncStatus === 'connecting' ? 'Connecting...' : 'Offline'}
            />
          </div>

          <div className="header-caregiver-text">
            <span className="header-caregiver-name">{activeCaregiver?.name || 'Caregiver'}</span>
          </div>
        </button>
      </div>
    </header>
  );
}
