import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { TodayView } from './components/views/TodayView';
import { CalendarView } from './components/views/CalendarView';
import { TrendsView } from './components/views/TrendsView';
import { SettingsView } from './components/views/SettingsView';
import { ModalManager } from './components/modals/ModalManager';
import { LoginScreen } from './components/LoginScreen';
import { NotificationToast } from './components/NotificationToast';

import { Capacitor } from '@capacitor/core';
import { syncService } from './services/syncService';

function AppContent() {
  const { isAuthenticated, isLoadingAuth, openModal } = useApp();
  const [activeTab, setActiveTab] = useState('today');

  // Auto-prompt server setup on native Android on first launch
  useEffect(() => {
    if (Capacitor.isNativePlatform() && !syncService.getServerBaseUrl()) {
      openModal('SERVER_SETUP');
    }
  }, [openModal]);

  // Handle PWA Home Screen Shortcuts (/#nurse, /#bottle, /#sleep, /#diaper)
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleShortcut = () => {
      const hash = (window.location.hash || '').toLowerCase();
      if (!hash) return;

      if (hash === '#nurse' || hash === '#breast') {
        openModal('BREAST');
      } else if (hash === '#bottle') {
        openModal('BOTTLE');
      } else if (hash === '#sleep') {
        openModal('SLEEP');
      } else if (hash === '#diaper') {
        openModal('DIAPER');
      }

      // Smoothly clean up hash from address bar
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    };

    handleShortcut();
    window.addEventListener('hashchange', handleShortcut);
    return () => window.removeEventListener('hashchange', handleShortcut);
  }, [isAuthenticated, openModal]);

  if (isLoadingAuth) {
    return (
      <div className="app-loading-screen">
        <div className="login-logo-circle" style={{ animation: 'pulseLight 1.5s infinite ease-in-out' }}>
          <svg viewBox="0 0 100 100" width="48" height="48">
            <circle cx="50" cy="50" r="48" fill="#CE6B4C" />
            <path
              d="M50 24 C38 24 30 34 30 46 C30 62 48 76 50 78 C52 76 70 62 70 46 C70 34 62 24 50 24 Z"
              fill="#FAF5EE"
            />
            <circle cx="50" cy="46" r="9" fill="#CE6B4C" />
          </svg>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <LoginScreen />
        <ModalManager />
      </>
    );
  }

  return (
    <div className="app-container">
      <Header onOpenSettings={() => setActiveTab('settings')} />

      <main className="main-content">
        {activeTab === 'today' && <TodayView />}
        {activeTab === 'calendar' && <CalendarView />}
        {activeTab === 'trends' && <TrendsView />}
        {activeTab === 'settings' && <SettingsView />}
      </main>

      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
      <ModalManager />
      <NotificationToast />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
