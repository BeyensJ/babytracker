import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
export const dataDir = process.env.DATA_DIR || path.join(rootDir, 'data');
const dbFilePath = path.join(dataDir, 'babytracker_db.json');

let state = null;

const DEFAULT_CAREGIVERS = [
  { id: 'cg_mom', name: 'Mama', role: 'Mom', color: '#CE6B4C' },
  { id: 'cg_dad', name: 'Papa', role: 'Dad', color: '#546C7E' },
];

const DEFAULT_CHILDREN = [
  {
    id: 'child_1',
    name: 'Baby',
    birthdate: new Date().toISOString().split('T')[0],
    sex: 'UNKNOWN',
    avatarColor: 'terracotta',
  },
];

const DEFAULT_PREFERENCES = {
  theme: 'light',
  volumeUnit: 'ml',
  weightUnit: 'kg',
  lengthUnit: 'cm',
  tempUnit: 'C',
};

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

/**
 * Initialize database from disk or create clean initial state
 */
export function initDb() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const defaultPassword = process.env.FAMILY_PASSWORD || 'babytracker';

  if (fs.existsSync(dbFilePath)) {
    try {
      const raw = fs.readFileSync(dbFilePath, 'utf-8');
      state = JSON.parse(raw);
      if (!state.auth || !state.auth.passwordHash) {
        const defaultSalt = crypto.randomBytes(16).toString('hex');
        state.auth = {
          salt: defaultSalt,
          passwordHash: hashPassword(defaultPassword, defaultSalt),
          sessions: {}
        };
        saveStateSync(state);
      }
      if (state.needsOnboarding === undefined) {
        state.needsOnboarding = false;
      }
      console.log(`[DB] Loaded ${state.events?.length || 0} events from ${dbFilePath}`);
      return state;
    } catch (err) {
      console.error('[DB] Failed to read db file, backing up and re-seeding:', err);
      fs.copyFileSync(dbFilePath, `${dbFilePath}.bak.${Date.now()}`);
    }
  }

  console.log('[DB] Initializing new clean database...');
  const defaultSalt = crypto.randomBytes(16).toString('hex');
  state = {
    needsOnboarding: true,
    children: DEFAULT_CHILDREN,
    activeChildId: DEFAULT_CHILDREN[0].id,
    caregivers: DEFAULT_CAREGIVERS,
    events: [],
    activeTimers: {},
    preferences: DEFAULT_PREFERENCES,
    auth: {
      salt: defaultSalt,
      passwordHash: hashPassword(defaultPassword, defaultSalt),
      sessions: {}
    },
    lastModified: Date.now(),
  };

  saveStateSync(state);
  return state;
}

/**
 * Atomic synchronous state persistence to prevent file corruption
 */
function saveStateSync(dataToSave) {
  try {
    dataToSave.lastModified = Date.now();
    const tempFile = `${dbFilePath}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(dataToSave, null, 2), 'utf-8');
    fs.renameSync(tempFile, dbFilePath);
  } catch (err) {
    console.error('[DB] Failed to save state atomically:', err);
    throw err;
  }
}

/**
 * Get current state clone (strips sensitive auth hash/salt)
 */
export function getState() {
  if (!state) initDb();
  const clone = JSON.parse(JSON.stringify(state));
  delete clone.auth;
  if (clone.preferences) {
    delete clone.preferences.theme;
  }
  return clone;
}

/**
 * Add an event
 */
export function addEvent(eventData) {
  if (!state) initDb();
  const newEvent = {
    id: eventData.id || `evt_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`,
    childKey: eventData.childKey || state.activeChildId || 'child_1',
    beginDt: eventData.beginDt || Date.now(),
    endDt: eventData.endDt || null,
    durationMs: eventData.durationMs || 0,
    note: eventData.note || '',
    details: eventData.details || {},
    likes: Array.isArray(eventData.likes) ? eventData.likes : [],
    comments: Array.isArray(eventData.comments) ? eventData.comments : [],
    ...eventData,
  };

  state.events = [newEvent, ...state.events].sort((a, b) => b.beginDt - a.beginDt);
  saveStateSync(state);
  return newEvent;
}

/**
 * Update an existing event
 */
export function updateEvent(eventId, updates) {
  if (!state) initDb();
  let updatedEvent = null;
  state.events = state.events.map(ev => {
    if (ev.id === eventId) {
      updatedEvent = { ...ev, ...updates };
      return updatedEvent;
    }
    return ev;
  }).sort((a, b) => b.beginDt - a.beginDt);

  if (updatedEvent) {
    saveStateSync(state);
  }
  return updatedEvent;
}

/**
 * Toggle like for an event by caregiver
 */
export function toggleLike(eventId, caregiver) {
  if (!state) initDb();
  let targetEvent = null;
  const caregiverId = caregiver?.id || 'cg_mom';
  const caregiverName = caregiver?.name || 'Caregiver';
  const caregiverColor = caregiver?.color || '#CE6B4C';

  state.events = state.events.map(ev => {
    if (ev.id === eventId) {
      const currentLikes = Array.isArray(ev.likes) ? [...ev.likes] : [];
      const existingIdx = currentLikes.findIndex(l => (typeof l === 'string' ? l === caregiverId : l.caregiverId === caregiverId));
      if (existingIdx >= 0) {
        currentLikes.splice(existingIdx, 1);
      } else {
        currentLikes.push({
          caregiverId,
          caregiverName,
          caregiverColor,
          timestamp: Date.now(),
        });
      }
      targetEvent = { ...ev, likes: currentLikes };
      return targetEvent;
    }
    return ev;
  });

  if (targetEvent) {
    saveStateSync(state);
    return { event: targetEvent, likes: targetEvent.likes };
  }
  return null;
}

/**
 * Add a comment to an event
 */
export function addComment(eventId, commentData, caregiver) {
  if (!state) initDb();
  let targetEvent = null;
  const caregiverId = caregiver?.id || commentData.caregiverId || 'cg_mom';
  const caregiverName = caregiver?.name || commentData.caregiverName || 'Caregiver';
  const caregiverColor = caregiver?.color || commentData.caregiverColor || '#CE6B4C';

  const newComment = {
    id: commentData.id || `cmt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    caregiverId,
    caregiverName,
    caregiverColor,
    text: (commentData.text || '').trim(),
    timestamp: commentData.timestamp || Date.now(),
  };

  state.events = state.events.map(ev => {
    if (ev.id === eventId) {
      const currentComments = Array.isArray(ev.comments) ? [...ev.comments] : [];
      currentComments.push(newComment);
      targetEvent = { ...ev, comments: currentComments };
      return targetEvent;
    }
    return ev;
  });

  if (targetEvent) {
    saveStateSync(state);
    return { event: targetEvent, comment: newComment };
  }
  return null;
}

/**
 * Delete a comment from an event
 */
export function deleteComment(eventId, commentId) {
  if (!state) initDb();
  let targetEvent = null;

  state.events = state.events.map(ev => {
    if (ev.id === eventId) {
      const currentComments = Array.isArray(ev.comments) ? ev.comments.filter(c => c.id !== commentId) : [];
      targetEvent = { ...ev, comments: currentComments };
      return targetEvent;
    }
    return ev;
  });

  if (targetEvent) {
    saveStateSync(state);
    return { event: targetEvent, success: true };
  }
  return null;
}

/**
 * Delete an event
 */
export function deleteEvent(eventId) {
  if (!state) initDb();
  const initialCount = state.events.length;
  state.events = state.events.filter(ev => ev.id !== eventId);
  if (state.events.length !== initialCount) {
    saveStateSync(state);
    return true;
  }
  return false;
}

/**
 * Bulk import events
 */
export function importEvents(newEvents, mode = 'merge') {
  if (!state) initDb();
  if (mode === 'replace') {
    state.events = [...newEvents].sort((a, b) => b.beginDt - a.beginDt);
  } else {
    const existingKeys = new Set(state.events.map(e => `${e.type}_${e.beginDt}`));
    const toAdd = newEvents.filter(e => !existingKeys.has(`${e.type}_${e.beginDt}`));
    state.events = [...toAdd, ...state.events].sort((a, b) => b.beginDt - a.beginDt);
  }

  saveStateSync(state);
  return state.events;
}

/**
 * Update live active timers (nursing, sleep, pump)
 */
export function updateTimers(activeTimers) {
  if (!state) initDb();
  state.activeTimers = activeTimers || {};
  saveStateSync(state);
  return state.activeTimers;
}

/**
 * Update children or active child
 */
export function updateChild(childId, updates) {
  if (!state) initDb();
  state.children = state.children.map(c => (c.id === childId ? { ...c, ...updates } : c));
  saveStateSync(state);
  return state.children;
}

export function addChild(childData) {
  if (!state) initDb();
  const newChild = {
    id: `child_${Date.now()}`,
    name: childData.name || 'Baby',
    birthdate: childData.birthdate || new Date().toISOString().split('T')[0],
    birthWeightLb: childData.birthWeightLb || null,
    birthHeightIn: childData.birthHeightIn || null,
    avatarColor: childData.avatarColor || 'terracotta',
  };
  state.children.push(newChild);
  state.activeChildId = newChild.id;
  saveStateSync(state);
  return newChild;
}

export function setActiveChild(childId) {
  if (!state) initDb();
  state.activeChildId = childId;
  saveStateSync(state);
  return state.activeChildId;
}

/**
 * Caregivers management
 */
export function addCaregiver(caregiverData) {
  if (!state) initDb();
  const newCaregiver = {
    id: `cg_${Date.now()}`,
    name: caregiverData.name || 'Caregiver',
    role: caregiverData.role || 'Parent',
    color: caregiverData.color || '#C48744',
  };
  state.caregivers = [...(state.caregivers || []), newCaregiver];
  saveStateSync(state);
  return newCaregiver;
}

export function updateCaregiver(id, updates) {
  if (!state) initDb();
  state.caregivers = (state.caregivers || []).map(cg => (cg.id === id ? { ...cg, ...updates } : cg));
  saveStateSync(state);
  return state.caregivers;
}

/**
 * User Preferences
 */
export function updatePreferences(prefs) {
  if (!state) initDb();
  const { theme: _ignored, ...sharedPrefs } = prefs || {};
  state.preferences = { ...state.preferences, ...sharedPrefs };
  delete state.preferences.theme;
  saveStateSync(state);
  return { ...state.preferences };
}

/**
 * Authentication & Security Methods
 */
export function verifyPassword(password) {
  if (!state) initDb();
  const defaultPassword = process.env.FAMILY_PASSWORD || 'babytracker';
  if (!state.auth || !state.auth.passwordHash || !state.auth.salt) {
    return password === defaultPassword;
  }
  try {
    const hash = hashPassword(password, state.auth.salt);
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(state.auth.passwordHash, 'hex'));
  } catch (err) {
    console.error('[DB] Error verifying password:', err);
    return false;
  }
}

export function setPassword(newPassword) {
  if (!state) initDb();
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(newPassword, salt);
  state.auth = {
    ...state.auth,
    passwordHash,
    salt,
    sessions: state.auth?.sessions || {}
  };
  saveStateSync(state);
  return true;
}

export function createSession(caregiverId, rememberMe = true) {
  if (!state) initDb();
  const token = crypto.randomBytes(32).toString('hex');
  const ttlMs = rememberMe ? 90 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const expiresAt = Date.now() + ttlMs;

  if (!state.auth) state.auth = {};
  if (!state.auth.sessions) state.auth.sessions = {};

  const now = Date.now();
  // Prune expired sessions
  for (const [t, s] of Object.entries(state.auth.sessions)) {
    if (s.expiresAt < now) {
      delete state.auth.sessions[t];
    }
  }

  state.auth.sessions[token] = {
    caregiverId,
    createdAt: now,
    expiresAt,
  };

  saveStateSync(state);
  return { token, expiresAt };
}

export function validateSession(token) {
  if (!token) return null;
  if (!state) initDb();
  if (!state.auth?.sessions) return null;

  const session = state.auth.sessions[token];
  if (!session) return null;

  if (session.expiresAt < Date.now()) {
    delete state.auth.sessions[token];
    saveStateSync(state);
    return null;
  }

  const caregiver = state.caregivers?.find(cg => cg.id === session.caregiverId) || null;
  return { ...session, caregiver };
}

export function revokeSession(token) {
  if (!token) return false;
  if (!state) initDb();
  if (!state.auth?.sessions) return false;

  if (state.auth.sessions[token]) {
    delete state.auth.sessions[token];
    saveStateSync(state);
    return true;
  }
  return false;
}

export function checkNeedsOnboarding() {
  if (!state) initDb();
  return Boolean(state.needsOnboarding);
}

export function completeOnboarding({ baby, caregivers, password, activeCaregiverId }) {
  if (!state) initDb();

  const childId = `child_${Date.now()}`;
  const initialChild = {
    id: childId,
    name: (baby?.name || '').trim() || 'Baby',
    birthdate: baby?.birthdate || new Date().toISOString().split('T')[0],
    sex: baby?.sex || 'UNKNOWN',
    avatarColor: baby?.avatarColor || 'terracotta',
  };

  const formattedCaregivers = (Array.isArray(caregivers) && caregivers.length > 0)
    ? caregivers.map((cg, idx) => ({
        id: cg.id || `cg_${Date.now()}_${idx}`,
        name: (cg.name || '').trim() || (idx === 0 ? 'Mama' : 'Papa'),
        role: cg.role || (idx === 0 ? 'Mama' : 'Papa'),
        color: cg.color || (idx === 0 ? '#CE6B4C' : '#546C7E'),
      }))
    : DEFAULT_CAREGIVERS;

  const chosenActiveId = activeCaregiverId && formattedCaregivers.some(c => c.id === activeCaregiverId)
    ? activeCaregiverId
    : formattedCaregivers[0].id;

  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword((password || 'babytracker').trim(), salt);

  state.children = [initialChild];
  state.activeChildId = childId;
  state.caregivers = formattedCaregivers;
  state.events = [];
  state.activeTimers = {};
  state.needsOnboarding = false;
  state.auth = {
    salt,
    passwordHash,
    sessions: {},
  };

  const session = createSession(chosenActiveId, true);
  saveStateSync(state);

  return {
    success: true,
    token: session.token,
    expiresAt: session.expiresAt,
    caregiver: formattedCaregivers.find(c => c.id === chosenActiveId) || formattedCaregivers[0],
    child: initialChild,
    state: getState(),
  };
}

