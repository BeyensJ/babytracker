import React, { createContext, useContext, useState, useEffect } from 'react';
import { generateSampleEvents } from '../utils/sampleData';
import { exportEventsToCSV } from '../utils/csvParser';
import { syncService } from '../services/syncService';
import { pwaService } from '../services/pwaService';
import { notificationService } from '../services/notificationService';
import { triggerHaptic } from '../utils/haptics';
import { downloadFile } from '../utils/fileDownloader';

const AppContext = createContext();

const STORAGE_KEYS = {
  CHILDREN: 'babytracker_children_v1',
  ACTIVE_CHILD: 'babytracker_active_child_v1',
  EVENTS: 'babytracker_events_v1',
  PREFERENCES: 'babytracker_preferences_v1',
  ACTIVE_TIMERS: 'babytracker_active_timers_v1',
  CAREGIVERS: 'babytracker_caregivers_v1',
  ACTIVE_CAREGIVER: 'babytracker_device_caregiver_id_v1',
  DEVICE_THEME: 'babytracker_device_theme_v1',
  ONBOARDED: 'babytracker_onboarded_v1',
};

function getSavedStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

import { getTranslation } from '../i18n/translations';

const DEFAULT_CHILDREN = [
  {
    id: 'child_1',
    name: 'Baby',
    birthdate: new Date().toISOString().split('T')[0],
    sex: 'UNKNOWN',
    avatarColor: 'terracotta',
  },
];

const DEFAULT_CAREGIVERS = [
  { id: 'cg_mom', name: 'Mama', role: 'Mama', color: '#CE6B4C' },
  { id: 'cg_dad', name: 'Papa', role: 'Papa', color: '#546C7E' },
];

const DEFAULT_PREFERENCES = {
  volumeUnit: 'ml', // 'oz' or 'ml'
  weightUnit: 'kg', // 'lb' or 'kg'
  lengthUnit: 'cm', // 'in' or 'cm'
  tempUnit: 'C',    // 'F' or 'C'
  theme: 'light',   // 'light' or 'dark' (pure pitch-black OLED)
  haptics: true,    // subtle vibration feedback
  language: 'nl',   // 'nl' (Nederlands / Vlaams) or 'en' (English)
};

export function AppProvider({ children }) {
  // 1. Children state
  const [childList, setChildList] = useState(() => {
    try {
      const saved = getSavedStorage(STORAGE_KEYS.CHILDREN);
      return saved ? JSON.parse(saved) : DEFAULT_CHILDREN;
    } catch {
      return DEFAULT_CHILDREN;
    }
  });

  const [activeChildId, setActiveChildId] = useState(() => {
    try {
      const saved = getSavedStorage(STORAGE_KEYS.ACTIVE_CHILD);
      return saved || (DEFAULT_CHILDREN[0] && DEFAULT_CHILDREN[0].id) || 'child_1';
    } catch {
      return 'child_1';
    }
  });

  // 2. Caregivers & Active Caregiver (Specific to this device/browser)
  const [caregivers, setCaregivers] = useState(() => {
    try {
      const saved = getSavedStorage(STORAGE_KEYS.CAREGIVERS);
      return saved ? JSON.parse(saved) : DEFAULT_CAREGIVERS;
    } catch {
      return DEFAULT_CAREGIVERS;
    }
  });

  const [activeCaregiverId, setActiveCaregiverId] = useState(() => {
    try {
      const saved = getSavedStorage(STORAGE_KEYS.ACTIVE_CAREGIVER);
      return saved || DEFAULT_CAREGIVERS[0].id;
    } catch {
      return DEFAULT_CAREGIVERS[0].id;
    }
  });

  const activeCaregiver = caregivers.find(c => c.id === activeCaregiverId) || caregivers[0] || DEFAULT_CAREGIVERS[0];

  // 3. Events state
  const [events, setEvents] = useState(() => {
    try {
      const saved = getSavedStorage(STORAGE_KEYS.EVENTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Could not read saved events:', e);
    }
    return [];
  });

function mergePreferencesPreservingDeviceTheme(prev, incoming) {
  if (!incoming) return prev;
  let currentTheme = prev?.theme;
  if (!currentTheme) {
    try {
      currentTheme = localStorage.getItem(STORAGE_KEYS.DEVICE_THEME);
    } catch {}
  }
  if (!currentTheme) currentTheme = 'light';
  const { theme: _ignoredTheme, ...sharedIncoming } = incoming;
  return { ...prev, ...sharedIncoming, theme: currentTheme };
}

  // 4. User Preferences (Theme is strictly device-local and never synced between devices)
  const [preferences, setPreferences] = useState(() => {
    let localTheme = 'light';
    try {
      localTheme = localStorage.getItem(STORAGE_KEYS.DEVICE_THEME) || 'light';
    } catch {}

    try {
      const saved = getSavedStorage(STORAGE_KEYS.PREFERENCES);
      const parsed = saved ? JSON.parse(saved) : {};
      return { ...DEFAULT_PREFERENCES, ...parsed, theme: localTheme };
    } catch {
      return { ...DEFAULT_PREFERENCES, theme: localTheme };
    }
  });

  const language = preferences?.language || 'nl';
  const t = (key, params) => getTranslation(key, language, params);

  // 5. Live Active Timers
  const [activeTimers, setActiveTimers] = useState(() => {
    try {
      const saved = getSavedStorage(STORAGE_KEYS.ACTIVE_TIMERS);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // 6. Active Modal State
  const [activeModal, setActiveModal] = useState(null);
  const [modalInitialData, setModalInitialData] = useState(null);

  // 7. Live Synchronization Status
  const [syncStatus, setSyncStatus] = useState('connecting');

  // 8. PWA & Android Notification Tray Status
  const [canInstallPWA, setCanInstallPWA] = useState(false);
  const [isPWAInstalled, setIsPWAInstalled] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState('default');

  // 9. Family Authentication & Security
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  // --- Real-Time Backend & WebSocket Integration ---
  useEffect(() => {
    // 1. Subscribe to connection status changes
    const unsubStatus = syncService.onStatusChange(setSyncStatus);

    // 2. Subscribe to auth required (e.g. 401 or token expired)
    const unsubAuth = syncService.onAuthRequired(() => {
      setIsAuthenticated(false);
    });

    // 3. Check if server needs onboarding first, then verify session
    syncService.checkAuthStatus().then(status => {
      if (status && status.needsOnboarding) {
        setNeedsOnboarding(true);
        setIsLoadingAuth(false);
        return;
      }

      // Check if local-only mode needs onboarding
      const isLocallyOnboarded = getSavedStorage(STORAGE_KEYS.ONBOARDED) === 'true';
      if (status && status.offline && !isLocallyOnboarded && (!childList || childList.length === 0 || childList[0]?.name === 'Baby')) {
        setNeedsOnboarding(true);
        setIsLoadingAuth(false);
        return;
      }

      syncService.verifySession().then(session => {
        if (session && session.success) {
          setIsAuthenticated(true);
          if (session.caregiver?.id) {
            setActiveCaregiverId(session.caregiver.id);
          }
          syncService.connect();
          syncService.fetchFullState().then(serverState => {
            if (serverState) {
              if (serverState.children && serverState.children.length > 0) setChildList(serverState.children);
              if (serverState.activeChildId) setActiveChildId(serverState.activeChildId);
              if (serverState.caregivers && serverState.caregivers.length > 0) setCaregivers(serverState.caregivers);
              if (serverState.events && serverState.events.length > 0) setEvents(serverState.events);
              if (serverState.activeTimers) setActiveTimers(serverState.activeTimers);
              if (serverState.preferences) setPreferences(prev => mergePreferencesPreservingDeviceTheme(prev, serverState.preferences));
            }
          }).catch(() => {});
        } else {
          setIsAuthenticated(false);
          syncService.setToken(null);
        }
      }).catch(() => {
        setIsAuthenticated(false);
        syncService.setToken(null);
      }).finally(() => {
        setIsLoadingAuth(false);
      });
    }).catch(() => {
      setIsLoadingAuth(false);
    });

    // 4. Listen for real-time broadcasts from server
    const unsubs = [
      syncService.on('EVENT_ADDED', (newEvent) => {
        setEvents(prev => {
          if (prev.some(e => e.id === newEvent.id)) return prev;
          return [newEvent, ...prev].sort((a, b) => b.beginDt - a.beginDt);
        });
      }),

      syncService.on('EVENT_UPDATED', (updatedEvent) => {
        setEvents(prev =>
          prev.map(ev => (ev.id === updatedEvent.id ? updatedEvent : ev)).sort((a, b) => b.beginDt - a.beginDt)
        );
      }),

      syncService.on('EVENT_DELETED', ({ id }) => {
        setEvents(prev => prev.filter(ev => ev.id !== id));
      }),

      syncService.on('EVENTS_IMPORTED', ({ events: allEvents }) => {
        if (Array.isArray(allEvents)) {
          setEvents(allEvents.sort((a, b) => b.beginDt - a.beginDt));
        }
      }),

      syncService.on('TIMERS_UPDATED', (timers) => {
        setActiveTimers(timers || {});
      }),

      syncService.on('CHILDREN_UPDATED', (children) => {
        if (Array.isArray(children)) setChildList(children);
      }),

      syncService.on('ACTIVE_CHILD_UPDATED', ({ activeChildId: newActiveId }) => {
        if (newActiveId) setActiveChildId(newActiveId);
      }),

      syncService.on('CAREGIVERS_UPDATED', (cgs) => {
        if (Array.isArray(cgs)) setCaregivers(cgs);
      }),

      syncService.on('PREFERENCES_UPDATED', (prefs) => {
        setPreferences(prev => mergePreferencesPreservingDeviceTheme(prev, prefs));
      }),

      syncService.on('SYNC_STATE', (serverState) => {
        if (serverState.children) setChildList(serverState.children);
        if (serverState.activeChildId) setActiveChildId(serverState.activeChildId);
        if (serverState.caregivers) setCaregivers(serverState.caregivers);
        if (serverState.events) setEvents(serverState.events);
        if (serverState.activeTimers) setActiveTimers(serverState.activeTimers);
        if (serverState.preferences) setPreferences(prev => mergePreferencesPreservingDeviceTheme(prev, serverState.preferences));
      }),
    ];

    return () => {
      unsubStatus();
      unsubAuth();
      unsubs.forEach(un => un());
    };
  }, []);

  // PWA Initialization and Install Listener
  useEffect(() => {
    pwaService.init();
    setCanInstallPWA(pwaService.canInstall);
    setIsPWAInstalled(pwaService.isInstalled);
    setNotificationPermission(notificationService.getPermission());

    const unsubPwa = pwaService.subscribe(({ canInstall, isInstalled }) => {
      setCanInstallPWA(canInstall);
      setIsPWAInstalled(isInstalled);
    });

    return () => {
      unsubPwa();
    };
  }, []);

  // Synchronize local changes to LocalStorage as offline fallback
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CHILDREN, JSON.stringify(childList));
    } catch {}
  }, [childList]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_CHILD, activeChildId);
    } catch {}
  }, [activeChildId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CAREGIVERS, JSON.stringify(caregivers));
    } catch {}
  }, [caregivers]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_CAREGIVER, activeCaregiverId);
    } catch {}
  }, [activeCaregiverId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
    } catch {}
  }, [events]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(preferences));
      if (preferences.theme) {
        localStorage.setItem(STORAGE_KEYS.DEVICE_THEME, preferences.theme);
      }
      const currentTheme = preferences.theme || 'light';
      if (currentTheme === 'dark' || currentTheme === 'oled') {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }

      // Dynamically update mobile browser address bar / notch theme color
      let metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (!metaThemeColor) {
        metaThemeColor = document.createElement('meta');
        metaThemeColor.name = 'theme-color';
        document.head.appendChild(metaThemeColor);
      }

      if (currentTheme === 'dark' || currentTheme === 'oled') {
        metaThemeColor.setAttribute('content', '#000000');
      } else {
        metaThemeColor.setAttribute('content', '#FAF7F2');
      }
    } catch {}
  }, [preferences]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_TIMERS, JSON.stringify(activeTimers));
    } catch {}
  }, [activeTimers]);

  // Current Active Child
  const activeChild = childList.find(c => c.id === activeChildId) || childList[0] || DEFAULT_CHILDREN[0];

  // Modal helpers
  const openModal = (modalType, initialData = null) => {
    triggerHaptic('light', preferences?.haptics);
    setModalInitialData(initialData);
    setActiveModal(modalType);
  };

  const closeModal = () => {
    setActiveModal(null);
    setModalInitialData(null);
  };

  // Helper to update timers both locally and broadcast to server
  const broadcastTimers = (updater) => {
    setActiveTimers(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      syncService.updateTimers(next).catch(() => {});
      return next;
    });
  };

  // --- CRUD Activity Actions (With Caregiver Attribution & Live Sync) ---

  const addEvent = (eventData) => {
    const newEvent = {
      id: eventData.id || `evt_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`,
      childKey: activeChildId,
      beginDt: Date.now(),
      endDt: null,
      durationMs: 0,
      note: '',
      details: {
        caregiver: activeCaregiver?.name || 'Caregiver',
        ...(eventData.details || {}),
      },
      ...eventData,
    };

    if (!newEvent.details.caregiver && activeCaregiver?.name) {
      newEvent.details.caregiver = activeCaregiver.name;
    }

    setEvents(prev => [newEvent, ...prev].sort((a, b) => b.beginDt - a.beginDt));
    syncService.addEvent(newEvent).catch(err => console.warn('[Sync] Offline: addEvent saved locally', err));
    triggerHaptic('success', preferences?.haptics);
    return newEvent;
  };

  const updateEvent = (eventId, updates) => {
    setEvents(prev =>
      prev.map(ev => (ev.id === eventId ? { ...ev, ...updates } : ev)).sort((a, b) => b.beginDt - a.beginDt)
    );
    syncService.updateEvent(eventId, updates).catch(err => console.warn('[Sync] Offline: updateEvent saved locally', err));
    triggerHaptic('light', preferences?.haptics);
  };

  const deleteEvent = (eventId) => {
    setEvents(prev => prev.filter(ev => ev.id !== eventId));
    syncService.deleteEvent(eventId).catch(err => console.warn('[Sync] Offline: deleteEvent saved locally', err));
    triggerHaptic('warning', preferences?.haptics);
  };

  const importEvents = (newEvents, mode = 'merge') => {
    if (mode === 'replace') {
      setEvents([...newEvents].sort((a, b) => b.beginDt - a.beginDt));
    } else {
      setEvents(prev => {
        const existingKeys = new Set(prev.map(e => `${e.type}_${e.beginDt}`));
        const toAdd = newEvents.filter(e => !existingKeys.has(`${e.type}_${e.beginDt}`));
        return [...toAdd, ...prev].sort((a, b) => b.beginDt - a.beginDt);
      });
    }
    syncService.importEvents(newEvents, mode).catch(err => console.warn('[Sync] Offline: importEvents saved locally', err));
  };

  const resetToSample = () => {
    const sample = generateSampleEvents(activeChildId);
    setEvents(sample);
    syncService.importEvents(sample, 'replace').catch(() => {});
  };

  const clearAllData = () => {
    setEvents([]);
    setActiveTimers({});
    syncService.importEvents([], 'replace').catch(() => {});
    syncService.updateTimers({}).catch(() => {});
  };

  // --- Child Management ---
  const addChild = async (childData) => {
    const id = `child_${Date.now()}`;
    const newChild = {
      id,
      name: childData.name || 'Baby',
      birthdate: childData.birthdate || new Date().toISOString().split('T')[0],
      birthWeightLb: childData.birthWeightLb || null,
      birthHeightIn: childData.birthHeightIn || null,
      avatarColor: childData.avatarColor || 'terracotta',
    };
    setChildList(prev => [...prev, newChild]);
    setActiveChildId(id);
    syncService.addChild(newChild).catch(() => {});
    return newChild;
  };

  const updateChild = (childId, updates) => {
    setChildList(prev => prev.map(c => (c.id === childId ? { ...c, ...updates } : c)));
    syncService.updateChild(childId, updates).catch(() => {});
  };

  // --- Caregiver Management ---
  const addCaregiver = async (caregiverData) => {
    try {
      const newCg = await syncService.addCaregiver(caregiverData);
      setCaregivers(prev => [...prev, newCg]);
      setActiveCaregiverId(newCg.id);
      return newCg;
    } catch {
      const localCg = {
        id: `cg_${Date.now()}`,
        ...caregiverData,
      };
      setCaregivers(prev => [...prev, localCg]);
      setActiveCaregiverId(localCg.id);
      return localCg;
    }
  };

  const updateCaregiver = (id, updates) => {
    setCaregivers(prev => prev.map(cg => (cg.id === id ? { ...cg, ...updates } : cg)));
    syncService.updateCaregiver(id, updates).catch(() => {});
  };

  // --- Live Timer Operations (Synced across all devices in real-time) ---

  // 1. Breastfeeding Timer
  const startBreastTimer = (side = 'LEFT', customStartTimeMs = null) => {
    if (notificationService.getPermission() === 'default') {
      notificationService.requestPermission().then(p => setNotificationPermission(p)).catch(() => {});
    }
    const now = Date.now();
    const startMs = customStartTimeMs ? Number(customStartTimeMs) : now;
    const initialElapsed = Math.max(0, now - startMs);
    triggerHaptic('medium', preferences?.haptics);

    broadcastTimers(prev => ({
      ...prev,
      breast: {
        running: true,
        activeSide: side,
        sessionStartMs: startMs,
        leftElapsedMs: side === 'LEFT' ? initialElapsed : (prev.breast?.leftElapsedMs || 0),
        rightElapsedMs: side === 'RIGHT' ? initialElapsed : (prev.breast?.rightElapsedMs || 0),
        lastSideStartMs: now,
      },
    }));
  };

  const switchBreastSide = () => {
    const now = Date.now();
    triggerHaptic('medium', preferences?.haptics);
    broadcastTimers(prev => {
      const b = prev.breast;
      if (!b || !b.running) return prev;
      const elapsedOnCurrent = now - b.lastSideStartMs;

      return {
        ...prev,
        breast: {
          ...b,
          activeSide: b.activeSide === 'LEFT' ? 'RIGHT' : 'LEFT',
          leftElapsedMs: b.activeSide === 'LEFT' ? b.leftElapsedMs + elapsedOnCurrent : b.leftElapsedMs,
          rightElapsedMs: b.activeSide === 'RIGHT' ? b.rightElapsedMs + elapsedOnCurrent : b.rightElapsedMs,
          lastSideStartMs: now,
        },
      };
    });
  };

  const pauseBreastTimer = () => {
    const now = Date.now();
    triggerHaptic('light', preferences?.haptics);
    broadcastTimers(prev => {
      const b = prev.breast;
      if (!b || !b.running) return prev;
      const elapsedOnCurrent = now - b.lastSideStartMs;

      return {
        ...prev,
        breast: {
          ...b,
          running: false,
          leftElapsedMs: b.activeSide === 'LEFT' ? b.leftElapsedMs + elapsedOnCurrent : b.leftElapsedMs,
          rightElapsedMs: b.activeSide === 'RIGHT' ? b.rightElapsedMs + elapsedOnCurrent : b.rightElapsedMs,
          lastSideStartMs: null,
        },
      };
    });
  };

  const resumeBreastTimer = () => {
    const now = Date.now();
    triggerHaptic('light', preferences?.haptics);
    broadcastTimers(prev => {
      const b = prev.breast;
      if (!b) return prev;
      return {
        ...prev,
        breast: {
          ...b,
          running: true,
          lastSideStartMs: now,
        },
      };
    });
  };

  const stopBreastTimer = () => {
    const now = Date.now();
    const b = activeTimers.breast;
    let finalLeft = b?.leftElapsedMs || 0;
    let finalRight = b?.rightElapsedMs || 0;

    if (b?.running && b?.lastSideStartMs) {
      const currentElapsed = now - b.lastSideStartMs;
      if (b.activeSide === 'LEFT') finalLeft += currentElapsed;
      else finalRight += currentElapsed;
    }

    const totalDuration = finalLeft + finalRight;
    const beginDt = b?.sessionStartMs || (now - totalDuration);
    const existing = b?.resumedEventId ? events.find(e => e.id === b.resumedEventId) : null;
    const lastActiveSide = b?.activeSide || (finalRight > 0 && finalLeft === 0 ? 'RIGHT' : 'LEFT');

    // Open log modal WITHOUT deleting timer immediately so cancel/close keeps it running
    openModal('BREAST', {
      id: b?.resumedEventId || undefined,
      fromActiveTimer: 'breast',
      resumedEventId: b?.resumedEventId || null,
      side: finalRight > 0 && finalLeft > 0 ? 'BOTH' : (finalRight > 0 ? 'RIGHT' : 'LEFT'),
      lastActiveSide,
      leftDurationMs: finalLeft,
      rightDurationMs: finalRight,
      durationMs: totalDuration,
      beginDt,
      endDt: now,
      note: existing?.note || '',
      details: {
        ...(existing?.details || {}),
        side: finalRight > 0 && finalLeft > 0 ? 'BOTH' : (finalRight > 0 ? 'RIGHT' : 'LEFT'),
        lastActiveSide,
        leftDurationMs: finalLeft,
        rightDurationMs: finalRight,
      },
    });
  };

  // 2. Sleep Timer
  const startSleepTimer = (customStartTimeMs = null) => {
    if (notificationService.getPermission() === 'default') {
      notificationService.requestPermission().then(p => setNotificationPermission(p)).catch(() => {});
    }
    const now = Date.now();
    const startMs = customStartTimeMs ? Number(customStartTimeMs) : now;
    triggerHaptic('medium', preferences?.haptics);
    broadcastTimers(prev => ({
      ...prev,
      sleep: {
        running: true,
        startMs,
      },
    }));
  };

  const stopSleepTimer = () => {
    const s = activeTimers.sleep;
    const now = Date.now();
    const start = s?.startMs || now - 30 * 60 * 1000;
    const existing = s?.resumedEventId ? events.find(e => e.id === s.resumedEventId) : null;

    // Open log modal WITHOUT deleting timer immediately so cancel/close keeps it running
    openModal('SLEEP', {
      id: s?.resumedEventId || undefined,
      fromActiveTimer: 'sleep',
      resumedEventId: s?.resumedEventId || null,
      beginDt: start,
      endDt: now,
      durationMs: Math.max(0, now - start),
      note: existing?.note || '',
      details: {
        sleepType: 'NAP',
        ...(existing?.details || {}),
      },
    });
  };

  // 3. Pump Timer
  const startPumpTimer = (side = 'BOTH', customStartTimeMs = null) => {
    if (notificationService.getPermission() === 'default') {
      notificationService.requestPermission().then(p => setNotificationPermission(p)).catch(() => {});
    }
    const now = Date.now();
    const startMs = customStartTimeMs ? Number(customStartTimeMs) : now;
    triggerHaptic('medium', preferences?.haptics);
    broadcastTimers(prev => ({
      ...prev,
      pump: {
        running: true,
        startMs,
        side,
      },
    }));
  };

  const stopPumpTimer = () => {
    const p = activeTimers.pump;
    const now = Date.now();
    const start = p?.startMs || now - 15 * 60 * 1000;
    const pumpSide = p?.side || 'BOTH';
    const existing = p?.resumedEventId ? events.find(e => e.id === p.resumedEventId) : null;

    // Open log modal WITHOUT deleting timer immediately so cancel/close keeps it running
    openModal('PUMP', {
      id: p?.resumedEventId || undefined,
      fromActiveTimer: 'pump',
      resumedEventId: p?.resumedEventId || null,
      beginDt: start,
      endDt: now,
      durationMs: Math.max(0, now - start),
      note: existing?.note || '',
      details: {
        side: pumpSide,
        leftAmount: pumpSide === 'RIGHT' ? 0 : 50,
        rightAmount: pumpSide === 'LEFT' ? 0 : 50,
        leftFloz: pumpSide === 'RIGHT' ? 0 : 1.7,
        rightFloz: pumpSide === 'LEFT' ? 0 : 1.7,
        volumeUnit: preferences?.volumeUnit || 'ml',
        ...(existing?.details || {}),
      },
    });
  };

  // Clear an active timer explicitly when saved or deleted
  const clearActiveTimer = (timerType) => {
    broadcastTimers(prev => {
      const next = { ...prev };
      delete next[timerType];
      return next;
    });
    try {
      if (notificationService?.cancel) {
        notificationService.cancel(timerType);
      }
    } catch {}
  };

  // Resume finished timer from existing event or initial data
  const resumeBreastTimerWithData = (data = {}) => {
    if (notificationService.getPermission() === 'default') {
      notificationService.requestPermission().then(p => setNotificationPermission(p)).catch(() => {});
    }
    const now = Date.now();
    const resumedEventId = data.id || data.resumedEventId || null;
    const leftElapsedMs = Number(data.details?.leftDurationMs ?? data.leftDurationMs ?? data.leftElapsedMs) || 0;
    const rightElapsedMs = Number(data.details?.rightDurationMs ?? data.rightDurationMs ?? data.rightElapsedMs) || 0;
    const sessionStartMs = data.beginDt || (now - (leftElapsedMs + rightElapsedMs));

    // Resume on the exact same side the timer stopped on
    let side = data.details?.lastActiveSide || data.lastActiveSide;
    if (!side) {
      const explicitSide = (data.details?.side || data.side || '').toUpperCase();
      if (explicitSide === 'RIGHT') {
        side = 'RIGHT';
      } else if (explicitSide === 'LEFT') {
        side = 'LEFT';
      } else if (rightElapsedMs > 0 && leftElapsedMs === 0) {
        side = 'RIGHT';
      } else {
        side = 'LEFT';
      }
    }

    triggerHaptic('medium', preferences?.haptics);

    broadcastTimers(prev => ({
      ...prev,
      breast: {
        running: true,
        activeSide: side,
        sessionStartMs,
        leftElapsedMs,
        rightElapsedMs,
        lastSideStartMs: now,
        resumedEventId,
      },
    }));
  };

  const resumeSleepTimerWithData = (data = {}) => {
    if (notificationService.getPermission() === 'default') {
      notificationService.requestPermission().then(p => setNotificationPermission(p)).catch(() => {});
    }
    const now = Date.now();
    const resumedEventId = data.id || data.resumedEventId || null;
    const startMs = data.beginDt || data.startMs || (now - 30 * 60000);
    triggerHaptic('medium', preferences?.haptics);

    broadcastTimers(prev => ({
      ...prev,
      sleep: {
        running: true,
        startMs,
        resumedEventId,
      },
    }));
  };

  const resumePumpTimerWithData = (data = {}) => {
    if (notificationService.getPermission() === 'default') {
      notificationService.requestPermission().then(p => setNotificationPermission(p)).catch(() => {});
    }
    const now = Date.now();
    const resumedEventId = data.id || data.resumedEventId || null;
    const startMs = data.beginDt || data.startMs || (now - 15 * 60000);
    const side = data.side || data.details?.side || 'BOTH';
    triggerHaptic('medium', preferences?.haptics);

    broadcastTimers(prev => ({
      ...prev,
      pump: {
        running: true,
        startMs,
        side,
        resumedEventId,
      },
    }));
  };

  // 4. Update Start Time on Active Running Timer
  const updateTimerStartTime = (timerType, newStartTimeMs) => {
    const now = Date.now();
    const startMs = Number(newStartTimeMs);

    broadcastTimers(prev => {
      if (timerType === 'sleep' && prev.sleep) {
        return {
          ...prev,
          sleep: { ...prev.sleep, startMs },
        };
      }
      if (timerType === 'pump' && prev.pump) {
        return {
          ...prev,
          pump: { ...prev.pump, startMs },
        };
      }
      if (timerType === 'breast' && prev.breast) {
        const b = prev.breast;
        const currentElapsed = b.running && b.lastSideStartMs ? (now - b.lastSideStartMs) : 0;
        const totalOldElapsed = (b.leftElapsedMs || 0) + (b.rightElapsedMs || 0) + currentElapsed;
        const targetElapsed = Math.max(0, now - startMs);
        const diff = targetElapsed - totalOldElapsed;

        let newLeft = b.leftElapsedMs || 0;
        let newRight = b.rightElapsedMs || 0;
        if (b.activeSide === 'RIGHT') {
          newRight = Math.max(0, newRight + diff);
        } else {
          newLeft = Math.max(0, newLeft + diff);
        }

        return {
          ...prev,
          breast: {
            ...b,
            sessionStartMs: startMs,
            leftElapsedMs: newLeft,
            rightElapsedMs: newRight,
            lastSideStartMs: b.running ? now : null,
          },
        };
      }
      return prev;
    });
  };

  // 5. Synchronize Active Timers with Android Notification Tray
  useEffect(() => {
    notificationService.syncTimerNotification(
      activeTimers,
      activeCaregiver?.name || (language === 'nl' ? 'Verzorger' : 'Parent'),
      activeChild?.name || 'Baby',
      language
    );
  }, [activeTimers, activeCaregiver?.name, activeChild?.name, notificationPermission, language]);

  // 6. Listen for Notification Actions (both Native Capacitor Android Shade and Service Worker)
  useEffect(() => {
    // A. Native Capacitor Action Listener
    const unsubNative = notificationService.onNativeAction((data) => {
      const { action, timerType } = data || {};
      if (action === 'switch_side') {
        switchBreastSide();
      } else if (action === 'finish_timer') {
        if (timerType === 'breast') stopBreastTimer();
        else if (timerType === 'sleep') stopSleepTimer();
        else if (timerType === 'pump') stopPumpTimer();
      }
    });

    // B. Service Worker Action Listener (Web / PWA)
    let handleSwAction = null;
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      handleSwAction = (event) => {
        if (event.data?.type === 'NOTIFICATION_ACTION') {
          const { action, timerType } = event.data;
          if (action === 'switch_side') {
            switchBreastSide();
          } else if (action === 'finish_timer') {
            if (timerType === 'breast') stopBreastTimer();
            else if (timerType === 'sleep') stopSleepTimer();
            else if (timerType === 'pump') stopPumpTimer();
          }
        }
      };
      navigator.serviceWorker.addEventListener('message', handleSwAction);
    }

    return () => {
      unsubNative();
      if (handleSwAction && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSwAction);
      }
    };
  }, [activeTimers, activeCaregiver]);

  const installPWA = async () => {
    return await pwaService.installApp();
  };

  const requestNotificationPermission = async () => {
    const perm = await notificationService.requestPermission();
    setNotificationPermission(perm);
    if (perm === 'granted') {
      await notificationService.syncTimerNotification(
        activeTimers,
        activeCaregiver?.name || (language === 'nl' ? 'Verzorger' : 'Parent'),
        activeChild?.name || 'Baby',
        language
      );
    }
    return perm;
  };

  const testNotification = async () => {
    const result = await notificationService.testNotification();
    setNotificationPermission(notificationService.getPermission());
    return result;
  };

  const notificationDiagnostics = notificationService.getDiagnostics();

  // --- Export Helpers ---
  const exportCSV = async () => {
    const csvContent = exportEventsToCSV(events, activeChild.name);
    const filename = `babytracker_${activeChild.name.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`;
    await downloadFile(filename, csvContent, 'text/csv;charset=utf-8;');
  };

  const exportJSON = async () => {
    const dataStr = JSON.stringify({ child: activeChild, events, preferences }, null, 2);
    const filename = `babytracker_backup_${activeChild.name.toLowerCase()}_${new Date().toISOString().split('T')[0]}.json`;
    await downloadFile(filename, dataStr, 'application/json');
  };

  // --- Family Authentication Operations ---
  const login = async (password, caregiverId, rememberMe = true) => {
    const data = await syncService.login(password, caregiverId, rememberMe);
    setIsAuthenticated(true);
    if (caregiverId) {
      setActiveCaregiverId(caregiverId);
    }
    try {
      const serverState = await syncService.fetchFullState();
      if (serverState) {
        if (serverState.children && serverState.children.length > 0) setChildList(serverState.children);
        if (serverState.activeChildId) setActiveChildId(serverState.activeChildId);
        if (serverState.caregivers && serverState.caregivers.length > 0) setCaregivers(serverState.caregivers);
        if (serverState.events && serverState.events.length > 0) setEvents(serverState.events);
        if (serverState.activeTimers) setActiveTimers(serverState.activeTimers);
        if (serverState.preferences) setPreferences(prev => mergePreferencesPreservingDeviceTheme(prev, serverState.preferences));
      }
    } catch (err) {
      console.warn('[Sync] Could not fetch state after login:', err);
    }
    return data;
  };

  const logout = async () => {
    await syncService.logout();
    setIsAuthenticated(false);
  };

  const changePassword = async (currentPassword, newPassword) => {
    return await syncService.changePassword(currentPassword, newPassword);
  };

  const completeOnboarding = async ({ baby, caregivers: newCaregivers, password, activeCaregiverId: chosenCaregiverId }) => {
    try {
      const res = await syncService.completeOnboarding({
        baby,
        caregivers: newCaregivers,
        password,
        activeCaregiverId: chosenCaregiverId,
      });

      const initialChild = res.child || {
        id: `child_${Date.now()}`,
        name: baby?.name || 'Baby',
        birthdate: baby?.birthdate || new Date().toISOString().split('T')[0],
        sex: baby?.sex || 'UNKNOWN',
        avatarColor: baby?.avatarColor || 'terracotta',
      };

      setChildList([initialChild]);
      setActiveChildId(initialChild.id);
      if (res.state?.caregivers) {
        setCaregivers(res.state.caregivers);
      } else if (newCaregivers && newCaregivers.length > 0) {
        setCaregivers(newCaregivers);
      }
      if (chosenCaregiverId) {
        setActiveCaregiverId(chosenCaregiverId);
      }
      setEvents([]);
      setActiveTimers({});

      try {
        localStorage.setItem(STORAGE_KEYS.ONBOARDED, 'true');
      } catch {}

      setNeedsOnboarding(false);
      setIsAuthenticated(true);
      return res;
    } catch (err) {
      if (err.message?.includes('fetch') || err.message?.includes('network') || !syncService.getServerBaseUrl()) {
        const initialChild = {
          id: `child_${Date.now()}`,
          name: baby?.name || 'Baby',
          birthdate: baby?.birthdate || new Date().toISOString().split('T')[0],
          sex: baby?.sex || 'UNKNOWN',
          avatarColor: baby?.avatarColor || 'terracotta',
        };
        setChildList([initialChild]);
        setActiveChildId(initialChild.id);
        if (newCaregivers && newCaregivers.length > 0) {
          setCaregivers(newCaregivers);
        }
        if (chosenCaregiverId) {
          setActiveCaregiverId(chosenCaregiverId);
        }
        try {
          localStorage.setItem(STORAGE_KEYS.ONBOARDED, 'true');
        } catch {}
        setNeedsOnboarding(false);
        setIsAuthenticated(true);
        return { success: true };
      }
      throw err;
    }
  };

  const value = {
    isAuthenticated,
    isLoadingAuth,
    needsOnboarding,
    completeOnboarding,
    login,
    logout,
    changePassword,
    childList,
    activeChild,
    activeChildId,
    setActiveChildId: (id) => {
      setActiveChildId(id);
      syncService.setActiveChild(id).catch(() => {});
    },
    addChild,
    updateChild,
    caregivers,
    activeCaregiver,
    activeCaregiverId,
    setActiveCaregiverId,
    addCaregiver,
    updateCaregiver,
    syncStatus,
    events,
    addEvent,
    updateEvent,
    deleteEvent,
    importEvents,
    resetToSample,
    clearAllData,
    preferences,
    language,
    t,
    setPreferences: (prefsOrUpdater) => {
      setPreferences(prev => {
        const next = typeof prefsOrUpdater === 'function' ? prefsOrUpdater(prev) : (typeof prefsOrUpdater === 'object' ? { ...prev, ...prefsOrUpdater } : prefsOrUpdater);
        if (next && next.theme) {
          try {
            localStorage.setItem(STORAGE_KEYS.DEVICE_THEME, next.theme);
          } catch {}
        }
        // Do NOT broadcast device-local theme to server
        const { theme: _ignoredLocalTheme, ...sharedPrefs } = next || {};
        syncService.updatePreferences(sharedPrefs).catch(() => {});
        return next;
      });
    },
    activeTimers,
    startBreastTimer,
    switchBreastSide,
    pauseBreastTimer,
    resumeBreastTimer,
    resumeBreastTimerWithData,
    stopBreastTimer,
    startSleepTimer,
    stopSleepTimer,
    resumeSleepTimerWithData,
    startPumpTimer,
    stopPumpTimer,
    resumePumpTimerWithData,
    clearActiveTimer,
    updateTimerStartTime,
    exportCSV,
    exportJSON,
    activeModal,
    modalInitialData,
    openModal,
    closeModal,
    canInstallPWA,
    isPWAInstalled,
    installPWA,
    notificationPermission,
    requestNotificationPermission,
    testNotification,
    notificationDiagnostics,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
