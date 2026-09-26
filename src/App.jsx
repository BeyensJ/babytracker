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
          <svg viewBox="0 0 512 512" width="56" height="56">
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
