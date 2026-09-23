import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parseCSVToRows, convertCsvRowsToEvents } from '../src/utils/csvParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const dataDir = process.env.DATA_DIR || path.join(rootDir, 'data');
const dbFilePath = path.join(dataDir, 'babytracker_db.json');
const sampleCsvPath = path.join(rootDir, 'export_baby_20260922.csv');

let state = null;

const DEFAULT_CAREGIVERS = [
  { id: 'cg_mom', name: 'Mom', role: 'Mom', color: '#CE6B4C' },
  { id: 'cg_dad', name: 'Dad', role: 'Dad', color: '#546C7E' },
];

const DEFAULT_CHILDREN = [
  {
    id: 'child_1',
    name: 'Baby',
    birthdate: '2026-07-04',
    sex: 'FEMALE',
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
 * Initialize database from disk or auto-seed from CSV export
 */
export function initDb() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (fs.existsSync(dbFilePath)) {
    try {
      const raw = fs.readFileSync(dbFilePath, 'utf-8');
      state = JSON.parse(raw);
      if (!state.auth || !state.auth.passwordHash) {
        const defaultSalt = crypto.randomBytes(16).toString('hex');
        state.auth = {
          salt: defaultSalt,
          passwordHash: hashPassword('baby2026', defaultSalt),
          sessions: {}
        };
        saveStateSync(state);
      }
      console.log(`[DB] Loaded ${state.events?.length || 0} events from ${dbFilePath}`);
      return state;
    } catch (err) {
      console.error('[DB] Failed to read db file, backing up and re-seeding:', err);
      fs.copyFileSync(dbFilePath, `${dbFilePath}.bak.${Date.now()}`);
    }
  }

  // Seed from export CSV if available
  console.log('[DB] Initializing new database...');
  let seededEvents = [];
  let detectedChild = DEFAULT_CHILDREN[0];

  if (fs.existsSync(sampleCsvPath)) {
    try {
      const csvText = fs.readFileSync(sampleCsvPath, 'utf-8');
      const rows = parseCSVToRows(csvText);
      const parsed = convertCsvRowsToEvents(rows, 'child_1');
      seededEvents = parsed.events || [];
      if (parsed.detectedProfile) {
        detectedChild = {
          id: 'child_1',
          name: parsed.detectedProfile.name || 'Baby',
          birthdate: parsed.detectedProfile.birthdate || '2026-07-04',
          sex: parsed.detectedProfile.sex || 'FEMALE',
          avatarColor: 'terracotta',
        };
      }
      console.log(`[DB] Successfully auto-seeded ${seededEvents.length} events from ${sampleCsvPath}`);
    } catch (csvErr) {
      console.error('[DB] Failed to parse sample CSV, starting empty:', csvErr);
    }
  }

  const defaultSalt = crypto.randomBytes(16).toString('hex');
  state = {
    children: [detectedChild],
    activeChildId: detectedChild.id,
    caregivers: DEFAULT_CAREGIVERS,
    events: seededEvents.sort((a, b) => b.beginDt - a.beginDt),
    activeTimers: {},
    preferences: DEFAULT_PREFERENCES,
    auth: {
      salt: defaultSalt,
      passwordHash: hashPassword('baby2026', defaultSalt),
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
  state.preferences = { ...state.preferences, ...prefs };
  saveStateSync(state);
  return state.preferences;
}

/**
 * Authentication & Security Methods
 */
export function verifyPassword(password) {
  if (!state) initDb();
  if (!state.auth || !state.auth.passwordHash || !state.auth.salt) {
    return password === 'baby2026';
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

