import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { getTranslation } from '../i18n/translations';
import { generateSampleEvents } from '../utils/sampleData';
import { exportEventsToCSV } from '../utils/csvParser';
import { syncService } from '../services/syncService';
import { pwaService } from '../services/pwaService';
import { notificationService } from '../services/notificationService';
import { triggerHaptic } from '../utils/haptics';
import { downloadFile } from '../utils/fileDownloader';
import { computeNextDueTime, isReminderDue, createTimelineEventPayload, RECURRENCE_TYPES } from '../utils/reminderUtils';
import { formatDurationMs } from '../utils/formatters';

const AppContext = createContext();

const STORAGE_KEYS = {
  CHILDREN: 'babytracker_children_v1',
  ACTIVE_CHILD: 'babytracker_active_child_v1',
  EVENTS: 'babytracker_events_v1',
  REMINDERS: 'babytracker_reminders_v1',
  PREFERENCES: 'babytracker_preferences_v1',
  ACTIVE_TIMERS: 'babytracker_active_timers_v1',
  CAREGIVERS: 'babytracker_caregivers_v1',
  ACTIVE_CAREGIVER: 'babytracker_device_caregiver_id_v1',
  DEVICE_THEME: 'babytracker_device_theme_v1',
  DEVICE_ZEN_MODE: 'babytracker_device_zen_mode_v1',
  DEVICE_LANGUAGE: 'babytracker_device_language_v1',
  DEVICE_HAPTICS: 'babytracker_device_haptics_v1',
  ONBOARDED: 'babytracker_onboarded_v1',
};

function getSavedStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

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
  {
    id: 'cg_mom',
    name: 'Mama',
    role: 'Mama',
    color: '#CE6B4C',
    quickStatusCards: ['FEEDS', 'SLEEP', 'PUMP', 'DAYCARE'],
    quickActionButtons: ['BREAST', 'BOTTLE', 'SLEEP', 'PUMP', 'DAYCARE'],
  },
  {
    id: 'cg_dad',
    name: 'Papa',
    role: 'Papa',
    color: '#546C7E',
    quickStatusCards: ['FEEDS', 'SLEEP', 'PUMP', 'DAYCARE'],
    quickActionButtons: ['BREAST', 'BOTTLE', 'SLEEP', 'PUMP', 'DAYCARE'],
  },
];

const DEFAULT_PREFERENCES = {
  volumeUnit: 'ml', // 'oz' or 'ml'
  weightUnit: 'kg', // 'lb' or 'kg'
  lengthUnit: 'cm', // 'in' or 'cm'
  tempUnit: 'C',    // 'F' or 'C'
  theme: 'light',   // 'light' (warm linen) or 'dark' (pitch-black OLED)
  zenMode: false,   // minimalist clean layout mode
  haptics: true,    // subtle vibration feedback
  language: 'nl',   // 'nl' (Nederlands / Vlaams) or 'en' (English)
  geminiApiKey: '', // Google Gemini API Key for Daycare report AI extraction
  daycareName: '',  // Default family daycare / nursery name
  quickStatusCards: ['FEEDS', 'SLEEP', 'PUMP', 'DAYCARE'], // Displayed quick summary cards
  quickActionButtons: ['BREAST', 'BOTTLE', 'SLEEP', 'PUMP', 'DAYCARE'], // Displayed dock quick actions
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

  // 3b. Reminders state
  const [reminders, setReminders] = useState(() => {
    try {
      const saved = getSavedStorage(STORAGE_KEYS.REMINDERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Could not read saved reminders:', e);
    }
    return [];
  });

function mergePreferencesPreservingDeviceSettings(prev, incoming) {
  if (!incoming) return prev;
  let currentTheme = prev?.theme;
  if (!currentTheme) {
    try {
      currentTheme = localStorage.getItem(STORAGE_KEYS.DEVICE_THEME);
    } catch {}
  }
  if (!currentTheme) currentTheme = 'light';

  let currentZen = prev?.zenMode;
  if (typeof currentZen !== 'boolean') {
    try {
      const savedZen = localStorage.getItem(STORAGE_KEYS.DEVICE_ZEN_MODE);
      if (savedZen !== null) currentZen = savedZen === 'true';
    } catch {}
  }
  if (typeof currentZen !== 'boolean') currentZen = false;

  let currentLang = prev?.language;
  if (!currentLang) {
    try {
      currentLang = localStorage.getItem(STORAGE_KEYS.DEVICE_LANGUAGE);
    } catch {}
  }
  if (!currentLang) currentLang = 'nl';

  let currentHaptics = prev?.haptics;
  if (typeof currentHaptics !== 'boolean') {
    try {
      const savedHaptics = localStorage.getItem(STORAGE_KEYS.DEVICE_HAPTICS);
      if (savedHaptics !== null) currentHaptics = savedHaptics === 'true';
    } catch {}
  }
  if (typeof currentHaptics !== 'boolean') currentHaptics = true;

  // Strip device-local settings and user-specific settings from incoming shared payload
  const {
    theme: _ignoredTheme,
    zenMode: _ignoredZen,
    language: _ignoredLang,
    haptics: _ignoredHaptics,
    quickStatusCards: _ignoredQuickStatus,
    quickActionButtons: _ignoredQuickActions,
    ...sharedIncoming
  } = incoming;

  return {
    ...DEFAULT_PREFERENCES,
    ...prev,
    ...sharedIncoming,
    theme: currentTheme,
    zenMode: currentZen,
    language: currentLang,
    haptics: currentHaptics,
  };
}

  // 4. Preferences:
  // Device-local settings: Theme, Zen Mode, Language, Haptics (never broadcast to other devices or db)
  // Shared family settings: Volume, Weight, Length, Temp units, Daycare name, Gemini API key
  // User/Caregiver settings: Quick action & status cards (stored per caregiver)
  const [preferences, setPreferences] = useState(() => {
    let localTheme = 'light';
    let localZen = false;
    let localLang = 'nl';
    let localHaptics = true;

    try {
      localTheme = localStorage.getItem(STORAGE_KEYS.DEVICE_THEME) || 'light';
    } catch {}
    try {
      const savedZen = localStorage.getItem(STORAGE_KEYS.DEVICE_ZEN_MODE);
      if (savedZen !== null) localZen = savedZen === 'true';
    } catch {}
    try {
      const savedLang = localStorage.getItem(STORAGE_KEYS.DEVICE_LANGUAGE);
      if (savedLang) localLang = savedLang;
    } catch {}
    try {
      const savedHaptics = localStorage.getItem(STORAGE_KEYS.DEVICE_HAPTICS);
      if (savedHaptics !== null) localHaptics = savedHaptics === 'true';
    } catch {}

    try {
      const saved = getSavedStorage(STORAGE_KEYS.PREFERENCES);
      const parsed = saved ? JSON.parse(saved) : {};
      return {
        ...DEFAULT_PREFERENCES,
        ...parsed,
        theme: localTheme,
        zenMode: localZen,
        language: localLang,
        haptics: localHaptics,
      };
    } catch {
      return {
        ...DEFAULT_PREFERENCES,
        theme: localTheme,
        zenMode: localZen,
        language: localLang,
        haptics: localHaptics,
      };
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
              if (serverState.reminders) setReminders(serverState.reminders);
              if (serverState.activeTimers) setActiveTimers(serverState.activeTimers);
              if (serverState.preferences) setPreferences(prev => mergePreferencesPreservingDeviceSettings(prev, serverState.preferences));
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

      syncService.on('REMINDER_ADDED', (newReminder) => {
        setReminders(prev => {
          if (prev.some(r => r.id === newReminder.id)) return prev;
          return [newReminder, ...prev];
        });
      }),

      syncService.on('REMINDER_UPDATED', (updatedReminder) => {
        setReminders(prev =>
          prev.map(r => (r.id === updatedReminder.id ? updatedReminder : r))
        );
      }),

      syncService.on('REMINDER_DELETED', ({ id }) => {
        setReminders(prev => prev.filter(r => r.id !== id));
      }),

      syncService.on('REMINDERS_UPDATED', (allReminders) => {
        if (Array.isArray(allReminders)) {
          setReminders(allReminders);
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
        setPreferences(prev => mergePreferencesPreservingDeviceSettings(prev, prefs));
      }),

      syncService.on('SYNC_STATE', (serverState) => {
        if (serverState.children) setChildList(serverState.children);
        if (serverState.activeChildId) setActiveChildId(serverState.activeChildId);
        if (serverState.caregivers) setCaregivers(serverState.caregivers);
        if (serverState.events) setEvents(serverState.events);
        if (serverState.reminders) setReminders(serverState.reminders);
        if (serverState.activeTimers) setActiveTimers(serverState.activeTimers);
        if (serverState.preferences) setPreferences(prev => mergePreferencesPreservingDeviceSettings(prev, serverState.preferences));
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
      localStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(reminders));
    } catch {}
  }, [reminders]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(preferences));
      if (preferences.theme) {
        localStorage.setItem(STORAGE_KEYS.DEVICE_THEME, preferences.theme);
      }
      if (typeof preferences.zenMode === 'boolean') {
        localStorage.setItem(STORAGE_KEYS.DEVICE_ZEN_MODE, String(preferences.zenMode));
      }
      if (preferences.language) {
        localStorage.setItem(STORAGE_KEYS.DEVICE_LANGUAGE, preferences.language);
      }
      if (typeof preferences.haptics === 'boolean') {
        localStorage.setItem(STORAGE_KEYS.DEVICE_HAPTICS, String(preferences.haptics));
      }
      const currentTheme = preferences.theme === 'dark' || preferences.theme === 'oled' ? 'dark' : 'light';
      if (currentTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }

      const isZenActive = Boolean(preferences.zenMode);
      if (isZenActive) {
        document.documentElement.setAttribute('data-zen-mode', 'true');
      } else {
        document.documentElement.removeAttribute('data-zen-mode');
      }

      // Dynamically update mobile browser address bar / notch theme color
      let metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (!metaThemeColor) {
        metaThemeColor = document.createElement('meta');
        metaThemeColor.name = 'theme-color';
        document.head.appendChild(metaThemeColor);
      }

      if (currentTheme === 'dark') {
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

  // Dynamically synchronize baby accent color with CSS variables
  useEffect(() => {
    const colorKey = activeChild?.avatarColor || 'terracotta';
    document.documentElement.style.setProperty('--baby-accent', `var(--color-${colorKey}, #B85333)`);
    document.documentElement.style.setProperty('--baby-accent-light', `var(--color-${colorKey}-light, rgba(206, 107, 76, 0.12))`);
  }, [activeChild?.avatarColor]);

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

  const toggleEventLike = (eventId) => {
    let isNowLiked = false;
    const cgId = activeCaregiver?.id || 'cg_mom';
    const cgName = activeCaregiver?.name || 'Caregiver';
    const cgColor = activeCaregiver?.color || '#CE6B4C';

    setEvents(prev =>
      prev.map(ev => {
        if (ev.id === eventId) {
          const currentLikes = Array.isArray(ev.likes) ? [...ev.likes] : [];
          const existingIdx = currentLikes.findIndex(l => (typeof l === 'string' ? l === cgId : l.caregiverId === cgId));
          if (existingIdx >= 0) {
            currentLikes.splice(existingIdx, 1);
            isNowLiked = false;
          } else {
            currentLikes.push({
              caregiverId: cgId,
              caregiverName: cgName,
              caregiverColor: cgColor,
              timestamp: Date.now(),
            });
            isNowLiked = true;
          }
          return { ...ev, likes: currentLikes };
        }
        return ev;
      }).sort((a, b) => b.beginDt - a.beginDt)
    );

    triggerHaptic(isNowLiked ? 'medium' : 'light', preferences?.haptics);
    syncService.toggleLike(eventId, activeCaregiver).catch(err => console.warn('[Sync] Offline: toggleLike saved locally', err));
    return isNowLiked;
  };

  const addEventComment = (eventId, text) => {
    if (!text || !text.trim()) return null;
    const cgId = activeCaregiver?.id || 'cg_mom';
    const cgName = activeCaregiver?.name || 'Caregiver';
    const cgColor = activeCaregiver?.color || '#CE6B4C';

    const newComment = {
      id: `cmt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      caregiverId: cgId,
      caregiverName: cgName,
      caregiverColor: cgColor,
      text: text.trim(),
      timestamp: Date.now(),
    };

    setEvents(prev =>
      prev.map(ev => {
        if (ev.id === eventId) {
          const currentComments = Array.isArray(ev.comments) ? [...ev.comments] : [];
          return { ...ev, comments: [...currentComments, newComment] };
        }
        return ev;
      }).sort((a, b) => b.beginDt - a.beginDt)
    );

    triggerHaptic('success', preferences?.haptics);
    syncService.addComment(eventId, text.trim(), activeCaregiver).catch(err => console.warn('[Sync] Offline: addComment saved locally', err));
    return newComment;
  };

  const deleteEventComment = (eventId, commentId) => {
    setEvents(prev =>
      prev.map(ev => {
        if (ev.id === eventId) {
          const currentComments = Array.isArray(ev.comments) ? ev.comments.filter(c => c.id !== commentId) : [];
          return { ...ev, comments: currentComments };
        }
        return ev;
      }).sort((a, b) => b.beginDt - a.beginDt)
    );

    triggerHaptic('warning', preferences?.haptics);
    syncService.deleteComment(eventId, commentId).catch(err => console.warn('[Sync] Offline: deleteComment saved locally', err));
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
        quickStatusCards: ['FEEDS', 'SLEEP', 'PUMP', 'DAYCARE'],
        quickActionButtons: ['BREAST', 'BOTTLE', 'SLEEP', 'PUMP', 'DAYCARE'],
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

  // --- Reminders Management ---
  const addReminder = (reminderData) => {
    const now = Date.now();
    const newReminder = {
      id: reminderData.id || `rem_${now}_${Math.random().toString(36).substr(2, 6)}`,
      childKey: reminderData.childKey || activeChildId || 'child_1',
      title: reminderData.title || '',
      activityType: reminderData.activityType || 'ROUTINE',
      prefilledData: reminderData.prefilledData || {},
      recurrence: reminderData.recurrence || RECURRENCE_TYPES.DAILY,
      recurrenceDays: Array.isArray(reminderData.recurrenceDays) ? reminderData.recurrenceDays : [1, 2, 3, 4, 5],
      intervalHours: Number(reminderData.intervalHours) || 3,
      dayOfMonth: Number(reminderData.dayOfMonth) || 1,
      time: reminderData.time || '08:00',
      date: reminderData.date || null,
      dueTime: reminderData.dueTime || computeNextDueTime(reminderData, now),
      lastCompletedAt: null,
      completed: false,
      enabled: reminderData.enabled !== false,
      createdAt: now,
      updatedAt: now,
    };

    setReminders(prev => [newReminder, ...prev.filter(r => r.id !== newReminder.id)]);
    syncService.addReminder(newReminder).catch(err => console.warn('[Sync] Offline: addReminder saved locally', err));
    triggerHaptic('success', preferences?.haptics);
    return newReminder;
  };

  const updateReminder = (id, updates) => {
    setReminders(prev =>
      prev.map(r => {
        if (r.id === id) {
          const updated = { ...r, ...updates, updatedAt: Date.now() };
          return updated;
        }
        return r;
      })
    );
    syncService.updateReminder(id, updates).catch(err => console.warn('[Sync] Offline: updateReminder saved locally', err));
    triggerHaptic('light', preferences?.haptics);
  };

  const deleteReminder = (id) => {
    setReminders(prev => prev.filter(r => r.id !== id));
    syncService.deleteReminder(id).catch(err => console.warn('[Sync] Offline: deleteReminder saved locally', err));
    triggerHaptic('warning', preferences?.haptics);
  };

  const toggleReminderEnabled = (id) => {
    const target = reminders.find(r => r.id === id);
    if (!target) return;
    const newEnabled = !target.enabled;
    let nextDue = target.dueTime;
    if (newEnabled && target.dueTime < Date.now()) {
      nextDue = computeNextDueTime(target, Date.now());
    }
    updateReminder(id, { enabled: newEnabled, dueTime: nextDue, completed: false });
  };

  const completeReminder = (reminderId, shouldLogEvent = true, customEventPayload = null) => {
    const reminder = reminders.find(r => r.id === reminderId);
    if (!reminder) return null;

    const now = Date.now();
    const isDutch = language === 'nl';
    let createdEvent = null;
    let toastMessage = '';

    const isDaycare =
      reminder.activityType === 'DAYCARE' ||
      reminder.id?.includes('daycare') ||
      (reminder.title && /crèche|creche|opvang|daycare|onthaalouder/i.test(reminder.title)) ||
      (reminder.note && /crèche|creche|opvang|daycare|onthaalouder/i.test(reminder.note)) ||
      Boolean(reminder.prefilledData?.daycareName) ||
      reminder.prefilledData?.subType === 'DROPOFF' ||
      reminder.prefilledData?.subType === 'PICKUP';

    const isPickUp = isDaycare && (
      reminder.prefilledData?.subType === 'PICKUP' ||
      reminder.id?.includes('pickup') ||
      (reminder.title && /ophaal|ophalen|pickup|pick-up|afhalen|eind|stop/i.test(reminder.title)) ||
      (reminder.note && /ophaal|ophalen|pickup|pick-up|afhalen|eind|stop/i.test(reminder.note))
    );

    const isDropOff = isDaycare && !isPickUp;

    if (isDaycare && shouldLogEvent) {
      const finalDaycareName = reminder.prefilledData?.daycareName || preferences?.daycareName || (isDutch ? 'Opvang / Crèche' : 'Daycare');

      if (isDropOff) {
        // Drop-off 1-click: MUST START the live daycare timer!
        // DO NOT log any timeline event!
        startDaycare(now, finalDaycareName, activeCaregiverId);
        toastMessage = isDutch
          ? `${reminder.title || 'Afzetten bij opvang'} voltooid · Opvangtimer gestart ⏱️`
          : `${reminder.title || 'Daycare Drop-off'} complete · Daycare timer started ⏱️`;
      } else {
        // Pick-up 1-click: MUST STOP the live daycare timer and save the completed stay!
        let dropOffMs = activeTimers?.daycare?.dropOffMs || activeTimers?.daycare?.startMs;
        const dropOffCaregiver = activeTimers?.daycare?.caregiverId;

        // If timer was not running, check when drop-off reminder was completed today, or default to 8:00 AM today / 8 hours ago
        if (!dropOffMs) {
          const dropOffReminder = reminders.find(r =>
            r.id !== reminder.id &&
            (r.activityType === 'DAYCARE' || r.id?.includes('dropoff') || (r.title && /afzet|dropoff|crèche|opvang/i.test(r.title))) &&
            !(r.id?.includes('pickup') || (r.title && /ophaal|pickup/i.test(r.title)))
          );
          if (dropOffReminder?.lastCompletedAt && (now - dropOffReminder.lastCompletedAt < 24 * 60 * 60 * 1000)) {
            dropOffMs = dropOffReminder.lastCompletedAt;
          } else {
            const today8am = new Date();
            today8am.setHours(8, 0, 0, 0);
            dropOffMs = now > today8am.getTime() ? today8am.getTime() : (now - 8 * 60 * 60 * 1000);
          }
        }

        const durationMs = Math.max(0, now - dropOffMs);
        const daycareEventPayload = customEventPayload || {
          id: `evt_${now}_${Math.random().toString(36).substr(2, 7)}`,
          childKey: reminder.childKey || activeChildId,
          type: 'DAYCARE',
          beginDt: dropOffMs,
          endDt: now,
          durationMs,
          note: reminder.note || reminder.prefilledData?.note || '',
          details: {
            daycareName: finalDaycareName,
            dropOffCaregiver: dropOffCaregiver || activeCaregiverId,
            pickUpCaregiver: activeCaregiverId,
            sourceReminderId: reminder.id,
            caregiver: activeCaregiver?.name || 'Parent',
          },
        };

        createdEvent = addEvent(daycareEventPayload);
        if (activeTimers?.daycare?.running) {
          clearActiveTimer('daycare');
        }

        toastMessage = isDutch
          ? `${reminder.title || 'Ophalen van opvang'} voltooid · Verblijf opgeslagen (${formatDurationMs(durationMs, language)})`
          : `${reminder.title || 'Daycare Pick-up'} complete · Stay logged (${formatDurationMs(durationMs, language)})`;
      }
    } else if (shouldLogEvent) {
      const eventPayload = customEventPayload || createTimelineEventPayload(reminder, activeCaregiver?.name || 'Parent', preferences?.daycareName);
      eventPayload.childKey = reminder.childKey || activeChildId;
      createdEvent = addEvent(eventPayload);
    }

    let nextDueTime = reminder.dueTime;
    let isCompleted = false;

    if (reminder.recurrence === RECURRENCE_TYPES.ONCE) {
      isCompleted = true;
    } else {
      nextDueTime = computeNextDueTime(reminder, now);
      isCompleted = false;
    }

    const updates = {
      dueTime: nextDueTime,
      lastCompletedAt: now,
      completed: isCompleted,
    };

    // Auto-heal legacy reminders so they are properly tagged as DAYCARE and subType
    if (isDaycare && (reminder.activityType !== 'DAYCARE' || !reminder.prefilledData?.subType)) {
      updates.activityType = 'DAYCARE';
      updates.prefilledData = {
        ...(reminder.prefilledData || {}),
        subType: isPickUp ? 'PICKUP' : 'DROPOFF',
        daycareName: reminder.prefilledData?.daycareName || preferences?.daycareName || '',
      };
    }

    updateReminder(reminderId, updates);
    triggerHaptic('success', preferences?.haptics);

    const reminderTitle = reminder.title || reminder.activityType;
    if (!toastMessage) {
      toastMessage = isDutch
        ? `${reminderTitle} gemarkeerd als voltooid${shouldLogEvent ? ' en toegevoegd aan tijdlijn.' : '.'}`
        : `${reminderTitle} marked complete${shouldLogEvent ? ' and logged to timeline.' : '.'}`;
    }

    notificationService.showToast({
      id: `toast_${now}`,
      type: 'success',
      title: isDutch ? 'Herinnering voltooid' : 'Reminder completed',
      message: toastMessage,
    });

    return { reminder, event: createdEvent };
  };

  const snoozeReminder = (reminderId, minutes = 30) => {
    const reminder = reminders.find(r => r.id === reminderId);
    if (!reminder) return;
    const now = Date.now();
    const newDueTime = now + minutes * 60 * 1000;
    updateReminder(reminderId, { dueTime: newDueTime, completed: false });
    triggerHaptic('light', preferences?.haptics);

    notificationService.showToast({
      id: `toast_${now}`,
      type: 'info',
      title: language === 'nl' ? 'Herinnering uitgesteld' : 'Reminder snoozed',
      message: language === 'nl'
        ? `Uitgesteld met ${minutes >= 60 ? `${minutes / 60} uur` : `${minutes} minuten`}.`
        : `Snoozed for ${minutes >= 60 ? `${minutes / 60} hour(s)` : `${minutes} minutes`}.`,
    });
  };

  // Filtered lists for active child
  const childReminders = reminders.filter(r => !r.childKey || r.childKey === activeChildId);
  const dueReminders = childReminders.filter(r => isReminderDue(r));
  const upcomingReminders = childReminders.filter(r => r.enabled && !r.completed && r.dueTime > Date.now());

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

  // 4. Daycare Stay Timer (Drop-off & Pick-up)
  const startDaycare = (customDropOffMs = null, daycareName = '', caregiverId = null) => {
    if (notificationService.getPermission() === 'default') {
      notificationService.requestPermission().then(p => setNotificationPermission(p)).catch(() => {});
    }
    const now = Date.now();
    const dropOffMs = customDropOffMs ? Number(customDropOffMs) : now;
    const finalDaycareName = (daycareName && daycareName.trim()) || preferences?.daycareName || '';
    triggerHaptic('medium', preferences?.haptics);
    broadcastTimers(prev => ({
      ...prev,
      daycare: {
        running: true,
        startMs: dropOffMs,
        dropOffMs,
        daycareName: finalDaycareName,
        caregiverId: caregiverId || activeCaregiverId,
      },
    }));
  };

  const stopDaycare = () => {
    const d = activeTimers.daycare;
    const now = Date.now();
    const dropOffMs = d?.dropOffMs || d?.startMs || (now - 8 * 60 * 60 * 1000);
    const existing = d?.resumedEventId ? events.find(e => e.id === d.resumedEventId) : null;

    openModal('DAYCARE', {
      id: d?.resumedEventId || undefined,
      fromActiveTimer: 'daycare',
      resumedEventId: d?.resumedEventId || null,
      beginDt: dropOffMs,
      endDt: now,
      durationMs: Math.max(0, now - dropOffMs),
      note: existing?.note || '',
      details: {
        daycareName: d?.daycareName || existing?.details?.daycareName || preferences?.daycareName || '',
        dropOffCaregiver: d?.caregiverId || existing?.details?.dropOffCaregiver || activeCaregiverId,
        pickUpCaregiver: activeCaregiverId,
        reportUrl: existing?.details?.reportUrl || null,
        reportType: existing?.details?.reportType || null,
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

  const resumeDaycareWithData = (data = {}) => {
    if (notificationService.getPermission() === 'default') {
      notificationService.requestPermission().then(p => setNotificationPermission(p)).catch(() => {});
    }
    const dropOffMs = data.beginDt || Date.now();
    triggerHaptic('medium', preferences?.haptics);
    broadcastTimers(prev => ({
      ...prev,
      daycare: {
        running: true,
        startMs: dropOffMs,
        dropOffMs,
        daycareName: data.details?.daycareName || '',
        caregiverId: data.details?.dropOffCaregiver || activeCaregiverId,
        resumedEventId: data.id || null,
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
      if (timerType === 'daycare' && prev.daycare) {
        return {
          ...prev,
          daycare: { ...prev.daycare, startMs, dropOffMs: startMs },
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

  // Storage key for keeping track of notified reminder moments to avoid duplicates
  const NOTIFIED_REMINDERS_KEY = 'babytracker_notified_reminders_v1';

  const getNotifiedReminderMoments = () => {
    try {
      const raw = localStorage.getItem(NOTIFIED_REMINDERS_KEY);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  };

  const markReminderMomentNotified = (key) => {
    try {
      const moments = getNotifiedReminderMoments();
      moments.add(key);
      const arr = Array.from(moments).slice(-150);
      localStorage.setItem(NOTIFIED_REMINDERS_KEY, JSON.stringify(arr));
    } catch {}
  };

  // 5b. Scheduled Moment Push Notification Scheduler for Reminders
  useEffect(() => {
    const checkAndNotifyDueReminders = () => {
      const now = Date.now();
      const notified = getNotifiedReminderMoments();

      reminders.forEach((reminder) => {
        if (!reminder.enabled) return;
        if (reminder.completed && reminder.recurrence === RECURRENCE_TYPES.ONCE) return;

        const dueTime = Number(reminder.dueTime);
        if (!dueTime || isNaN(dueTime)) return;

        // If due within the last 15 minutes and hasn't been notified yet for this scheduled moment
        if (dueTime <= now && now - dueTime < 15 * 60 * 1000) {
          const key = `${reminder.id}_${dueTime}`;
          if (!notified.has(key)) {
            markReminderMomentNotified(key);
            const baby = childList.find((c) => c.id === reminder.childKey) || activeChild;
            notificationService.dispatchReminderNotification(
              reminder,
              baby?.name || activeChild?.name || 'Baby',
              language,
              preferences?.daycareName || ''
            );
          }
        }
      });
    };

    // Run check immediately
    checkAndNotifyDueReminders();

    // Schedule exact timeouts for all upcoming reminders within the next 24 hours
    const timeouts = [];
    const now = Date.now();
    const notified = getNotifiedReminderMoments();

    reminders.forEach((reminder) => {
      if (!reminder.enabled) return;
      if (reminder.completed && reminder.recurrence === RECURRENCE_TYPES.ONCE) return;

      const dueTime = Number(reminder.dueTime);
      if (!dueTime || isNaN(dueTime)) return;

      const delay = dueTime - now;
      const key = `${reminder.id}_${dueTime}`;

      if (delay > 0 && delay <= 24 * 60 * 60 * 1000 && !notified.has(key)) {
        const timeoutId = setTimeout(() => {
          const currentNotified = getNotifiedReminderMoments();
          if (!currentNotified.has(key)) {
            markReminderMomentNotified(key);
            const baby = childList.find((c) => c.id === reminder.childKey) || activeChild;
            notificationService.dispatchReminderNotification(
              reminder,
              baby?.name || activeChild?.name || 'Baby',
              language,
              preferences?.daycareName || ''
            );
          }
        }, delay);
        timeouts.push(timeoutId);
      }
    });

    // Heartbeat check every 15s to handle device sleep / background wakeups
    const heartbeatInterval = setInterval(checkAndNotifyDueReminders, 15000);

    const onWakeOrFocus = () => {
      if (document.visibilityState === 'visible') {
        checkAndNotifyDueReminders();
      }
    };
    window.addEventListener('visibilitychange', onWakeOrFocus);
    window.addEventListener('focus', onWakeOrFocus);

    return () => {
      timeouts.forEach(clearTimeout);
      clearInterval(heartbeatInterval);
      window.removeEventListener('visibilitychange', onWakeOrFocus);
      window.removeEventListener('focus', onWakeOrFocus);
    };
  }, [reminders, childList, activeChild, language]);

  // 6. Listen for Notification Actions (both Native Capacitor Android Shade and Service Worker)
  useEffect(() => {
    // A. Native Capacitor Action Listener
    const unsubNative = notificationService.onNativeAction((data) => {
      const { action, timerType, reminderId } = data || {};
      if (action === 'complete_reminder' && reminderId) {
        completeReminder(reminderId);
      } else if (action === 'snooze_reminder' && reminderId) {
        snoozeReminder(reminderId, 30);
      } else if (action === 'open_reminder') {
        openModal('REMINDERS', { tab: 'due', reminderId });
      } else if (action === 'switch_side') {
        switchBreastSide();
      } else if (action === 'finish_timer') {
        if (timerType === 'breast') stopBreastTimer();
        else if (timerType === 'sleep') stopSleepTimer();
        else if (timerType === 'pump') stopPumpTimer();
        else if (timerType === 'daycare') stopDaycare();
      }
    });

    // B. Service Worker Action Listener (Web / PWA)
    let handleSwAction = null;
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      handleSwAction = (event) => {
        if (event.data?.type === 'NOTIFICATION_ACTION') {
          const { action, timerType, reminderId } = event.data;
          if (action === 'complete_reminder' && reminderId) {
            completeReminder(reminderId);
          } else if (action === 'snooze_reminder' && reminderId) {
            snoozeReminder(reminderId, 30);
          } else if (action === 'open_reminder') {
            openModal('REMINDERS', { tab: 'due', reminderId });
          } else if (action === 'switch_side') {
            switchBreastSide();
          } else if (action === 'finish_timer') {
            if (timerType === 'breast') stopBreastTimer();
            else if (timerType === 'sleep') stopSleepTimer();
            else if (timerType === 'pump') stopPumpTimer();
            else if (timerType === 'daycare') stopDaycare();
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
  }, [activeTimers, activeCaregiver, reminders]);

  const installPWA = async () => {
    return await pwaService.installApp();
  };

  const requestNotificationPermission = async () => {
    const perm = await notificationService.requestPermission();
    setNotificationPermission(perm);
    if (perm === 'granted') {
      notificationService.subscribeWebPush().catch(() => {});
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
        if (serverState.preferences) setPreferences(prev => mergePreferencesPreservingDeviceSettings(prev, serverState.preferences));
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

  const effectivePreferences = useMemo(() => {
    const cgStatus = activeCaregiver?.quickStatusCards;
    const cgActions = activeCaregiver?.quickActionButtons;
    return {
      ...preferences,
      quickStatusCards: Array.isArray(cgStatus) && cgStatus.length > 0 ? cgStatus : DEFAULT_PREFERENCES.quickStatusCards,
      quickActionButtons: Array.isArray(cgActions) && cgActions.length > 0 ? cgActions : DEFAULT_PREFERENCES.quickActionButtons,
    };
  }, [preferences, activeCaregiver?.quickStatusCards, activeCaregiver?.quickActionButtons]);

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
    toggleEventLike,
    addEventComment,
    deleteEventComment,
    importEvents,
    reminders,
    dueReminders,
    upcomingReminders,
    addReminder,
    updateReminder,
    deleteReminder,
    completeReminder,
    snoozeReminder,
    toggleReminderEnabled,
    resetToSample,
    clearAllData,
    preferences: effectivePreferences,
    isZenMode: Boolean(preferences?.zenMode),
    toggleZenMode: () => {
      setPreferences(prev => {
        const nextZen = !prev?.zenMode;
        try {
          localStorage.setItem(STORAGE_KEYS.DEVICE_ZEN_MODE, String(nextZen));
        } catch {}
        triggerHaptic('light', prev?.haptics);
        return {
          ...prev,
          zenMode: nextZen,
        };
      });
    },
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
        if (next && typeof next.zenMode === 'boolean') {
          try {
            localStorage.setItem(STORAGE_KEYS.DEVICE_ZEN_MODE, String(next.zenMode));
          } catch {}
        }
        if (next && next.language) {
          try {
            localStorage.setItem(STORAGE_KEYS.DEVICE_LANGUAGE, next.language);
          } catch {}
        }
        if (next && typeof next.haptics === 'boolean') {
          try {
            localStorage.setItem(STORAGE_KEYS.DEVICE_HAPTICS, String(next.haptics));
          } catch {}
        }

        // If next contains quickStatusCards or quickActionButtons, save them for the active caregiver!
        const hasQuickStatus = Array.isArray(next?.quickStatusCards);
        const hasQuickActions = Array.isArray(next?.quickActionButtons);
        if ((hasQuickStatus || hasQuickActions) && activeCaregiverId) {
          const caregiverUpdates = {};
          if (hasQuickStatus) caregiverUpdates.quickStatusCards = next.quickStatusCards;
          if (hasQuickActions) caregiverUpdates.quickActionButtons = next.quickActionButtons;
          setCaregivers(prevCgs => prevCgs.map(cg => (cg.id === activeCaregiverId ? { ...cg, ...caregiverUpdates } : cg)));
          syncService.updateCaregiver(activeCaregiverId, caregiverUpdates).catch(() => {});
        }

        // Do NOT broadcast device-local settings (theme, zenMode, language, haptics)
        // or user-specific settings (quickStatusCards, quickActionButtons) to server family preferences
        const {
          theme: _ignoredLocalTheme,
          zenMode: _ignoredLocalZen,
          language: _ignoredLocalLang,
          haptics: _ignoredLocalHaptics,
          quickStatusCards: _ignoredQuickStatus,
          quickActionButtons: _ignoredQuickActions,
          ...sharedPrefs
        } = next || {};
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
    startDaycare,
    stopDaycare,
    resumeDaycareWithData,
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
