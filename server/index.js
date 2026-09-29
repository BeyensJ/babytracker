import express from 'express';
import cors from 'cors';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';
import * as db from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Initialize Database on server startup
db.initDb();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Setup WebSocket Server for Real-Time Sync
const wss = new WebSocketServer({ server, path: '/ws' });

/**
 * Broadcast message to all connected clients (except optionally the sender)
 */
function broadcast(type, payload, excludeWs = null) {
  const message = JSON.stringify({ type, payload, timestamp: Date.now() });
  let count = 0;
  wss.clients.forEach(client => {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      client.send(message);
      count++;
    }
  });
  return count;
}

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const token = url.searchParams.get('token');
  const session = db.validateSession(token);

  if (!session) {
    console.warn(`[WS] Unauthorized connection rejected from ${req.socket.remoteAddress}`);
    ws.send(JSON.stringify({ type: 'AUTH_ERROR', payload: { error: 'Unauthorized. Please sign in.' } }));
    ws.close(4401, 'Unauthorized');
    return;
  }

  const clientIp = req.socket.remoteAddress;
  console.log(`[WS] Authenticated client connected from ${clientIp} (${session.caregiver?.name || 'Caregiver'}). Total active clients: ${wss.clients.size}`);

  // Send immediate sync on connection
  ws.send(JSON.stringify({
    type: 'SYNC_STATE',
    payload: db.getState(),
    timestamp: Date.now(),
  }));

  ws.on('message', rawMsg => {
    try {
      const data = JSON.parse(rawMsg.toString());
      if (data.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
        return;
      }
      if (data.type === 'SYNC_REQUEST') {
        ws.send(JSON.stringify({
          type: 'SYNC_STATE',
          payload: db.getState(),
          timestamp: Date.now(),
        }));
        return;
      }
    } catch (e) {
      console.error('[WS] Error processing client message:', e);
    }
  });

  ws.on('close', () => {
    console.log(`[WS] Client disconnected. Remaining clients: ${wss.clients.size}`);
  });
});

// --- Health Check Endpoint (Public for Docker / Kubernetes / Monitoring) ---
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: Date.now(),
    service: 'baby-tracker'
  });
});

// --- Authentication Middleware & Endpoints ---

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Please enter the family password.' });
  }
  const token = authHeader.split(' ')[1];
  const session = db.validateSession(token);
  if (!session) {
    return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
  }
  req.session = session;
  next();
}

// 1. Auth & Setup Routes
app.get('/api/auth/status', (req, res) => {
  const needsOnboarding = db.checkNeedsOnboarding();
  res.json({
    needsOnboarding,
    requiresAuth: true,
  });
});

app.post('/api/setup/complete', (req, res) => {
  try {
    const { baby, caregivers, password, activeCaregiverId } = req.body;
    if (!password || password.trim().length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters long.' });
    }
    const result = db.completeOnboarding({ baby, caregivers, password, activeCaregiverId });
    broadcast('CHILDREN_UPDATED', db.getState().children);
    broadcast('CAREGIVERS_UPDATED', db.getState().caregivers);
    broadcast('ACTIVE_CHILD_UPDATED', { activeChildId: db.getState().activeChildId });
    broadcast('SYNC_STATE', db.getState());
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { password, caregiverId, rememberMe = true } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Password is required.' });
    }
    const isValid = db.verifyPassword(password);
    if (!isValid) {
      return res.status(401).json({ error: 'Incorrect family password.' });
    }
    const session = db.createSession(caregiverId || 'cg_mom', rememberMe);
    const caregiver = db.getState().caregivers?.find(cg => cg.id === (caregiverId || 'cg_mom')) || null;
    res.json({
      success: true,
      token: session.token,
      expiresAt: session.expiresAt,
      caregiver,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/verify', requireAuth, (req, res) => {
  res.json({
    success: true,
    caregiver: req.session.caregiver,
    expiresAt: req.session.expiresAt,
  });
});

app.post('/api/auth/change-password', requireAuth, (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.trim().length < 4) {
      return res.status(400).json({ error: 'New password must be at least 4 characters long.' });
    }
    const isCurrentValid = db.verifyPassword(currentPassword);
    if (!isCurrentValid) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }
    db.setPassword(newPassword.trim());
    res.json({ success: true, message: 'Family password updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    db.revokeSession(token);
  }
  res.json({ success: true });
});

// Guard all data endpoints with requireAuth
app.use('/api/sync', requireAuth);
app.use('/api/events', requireAuth);
app.use('/api/timers', requireAuth);
app.use('/api/caregivers', requireAuth);
app.use('/api/children', requireAuth);
app.use('/api/preferences', requireAuth);

// --- REST API Endpoints ---

// 1. Full State Sync
app.get('/api/sync/state', (req, res) => {
  try {
    const state = db.getState();
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Events CRUD
app.post('/api/events', (req, res) => {
  try {
    const newEvent = db.addEvent(req.body);
    broadcast('EVENT_ADDED', newEvent);
    res.status(201).json(newEvent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/events/:id', (req, res) => {
  try {
    const updated = db.updateEvent(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Event not found' });
    broadcast('EVENT_UPDATED', updated);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/events/:id', (req, res) => {
  try {
    const success = db.deleteEvent(req.params.id);
    if (!success) return res.status(404).json({ error: 'Event not found' });
    broadcast('EVENT_DELETED', { id: req.params.id });
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/events/import', (req, res) => {
  try {
    const { events, mode } = req.body;
    const allEvents = db.importEvents(events, mode);
    broadcast('EVENTS_IMPORTED', { events: allEvents, mode });
    res.json({ count: allEvents.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Active Live Timers (Syncs stopwatch in real-time across devices)
app.post('/api/timers', (req, res) => {
  try {
    const timers = db.updateTimers(req.body);
    broadcast('TIMERS_UPDATED', timers);
    res.json(timers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3b. Headless Action endpoint for Notification Tray clicks (e.g. Android lockscreen/tray buttons)
app.post('/api/timers/action', (req, res) => {
  try {
    const { action, timerType, caregiver } = req.body;
    const currentState = db.getState();
    const timers = { ...(currentState.activeTimers || {}) };
    let createdEvent = null;

    if (action === 'switch_side' && timers.breast?.running) {
      const now = Date.now();
      const currentSide = timers.breast.activeSide || 'LEFT';
      const lastStart = timers.breast.lastSideStartMs || now;
      const sideDuration = now - lastStart;
      
      const newSide = currentSide === 'LEFT' ? 'RIGHT' : 'LEFT';
      const leftElapsed = (timers.breast.leftElapsedMs || 0) + (currentSide === 'LEFT' ? sideDuration : 0);
      const rightElapsed = (timers.breast.rightElapsedMs || 0) + (currentSide === 'RIGHT' ? sideDuration : 0);

      timers.breast = {
        ...timers.breast,
        activeSide: newSide,
        leftElapsedMs: leftElapsed,
        rightElapsedMs: rightElapsed,
        lastSideStartMs: now,
      };
      db.updateTimers(timers);
      broadcast('TIMERS_UPDATED', timers);
      return res.json({ success: true, timers });
    }

    if (action === 'finish_timer' || action === 'stop_timer') {
      const now = Date.now();
      if ((!timerType || timerType === 'breast') && timers.breast) {
        const b = timers.breast;
        let leftSec = Math.round((b.leftElapsedMs || 0) / 1000);
        let rightSec = Math.round((b.rightElapsedMs || 0) / 1000);
        if (b.running && b.lastSideStartMs) {
          const deltaSec = Math.round((now - b.lastSideStartMs) / 1000);
          if (b.activeSide === 'LEFT') leftSec += deltaSec;
          else rightSec += deltaSec;
        }
        const totalSec = leftSec + rightSec;
        const beginDt = new Date(b.sessionStartMs || (now - totalSec * 1000)).toISOString();
        const endDt = new Date(now).toISOString();
        
        let side = 'BOTH';
        if (leftSec > 0 && rightSec === 0) side = 'LEFT';
        else if (rightSec > 0 && leftSec === 0) side = 'RIGHT';

        createdEvent = db.addEvent({
          type: 'BREAST',
          beginDt,
          endDt,
          durationMs: totalSec * 1000,
          details: {
            side,
            leftDurationMs: leftSec * 1000,
            rightDurationMs: rightSec * 1000,
            leftDurationSeconds: leftSec,
            rightDurationSeconds: rightSec,
            totalDurationSeconds: totalSec,
            caregiver: caregiver || 'Mom',
          }
        });
        timers.breast = null;
      } else if ((!timerType || timerType === 'sleep') && timers.sleep?.running) {
        const s = timers.sleep;
        const startMs = s.startMs || now;
        const durationSec = Math.max(0, Math.round((now - startMs) / 1000));
        const beginDt = new Date(startMs).toISOString();
        const endDt = new Date(now).toISOString();

        createdEvent = db.addEvent({
          type: 'SLEEP',
          beginDt,
          endDt,
          durationMs: durationSec * 1000,
          details: {
            durationSeconds: durationSec,
            sleepType: s.sleepType || 'NAP',
            caregiver: caregiver || 'Parent',
          }
        });
        timers.sleep = { running: false, startMs: null, sleepType: 'NAP' };
      } else if ((!timerType || timerType === 'pump') && timers.pump?.running) {
        const p = timers.pump;
        const startMs = p.startMs || now;
        const durationSec = Math.max(0, Math.round((now - startMs) / 1000));
        const beginDt = new Date(startMs).toISOString();
        const endDt = new Date(now).toISOString();

        createdEvent = db.addEvent({
          type: 'PUMP',
          beginDt,
          endDt,
          durationMs: durationSec * 1000,
          details: {
            durationSeconds: durationSec,
            side: p.side || 'BOTH',
            caregiver: caregiver || 'Mom',
          }
        });
        timers.pump = { running: false, startMs: null, side: 'BOTH' };
      }

      db.updateTimers(timers);
      broadcast('TIMERS_UPDATED', timers);
      if (createdEvent) {
        broadcast('EVENT_ADDED', createdEvent);
      }
      return res.json({ success: true, timers, event: createdEvent });
    }

    res.json({ success: true, timers });
  } catch (err) {
    console.error('[API] Error handling timer action:', err);
    res.status(500).json({ error: err.message });
  }
});

// 4. Caregivers Management
app.get('/api/caregivers', (req, res) => {
  res.json(db.getState().caregivers || []);
});

app.post('/api/caregivers', (req, res) => {
  try {
    const newCaregiver = db.addCaregiver(req.body);
    broadcast('CAREGIVERS_UPDATED', db.getState().caregivers);
    res.status(201).json(newCaregiver);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/caregivers/:id', (req, res) => {
  try {
    const caregivers = db.updateCaregiver(req.params.id, req.body);
    broadcast('CAREGIVERS_UPDATED', caregivers);
    res.json(caregivers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Children Management
app.put('/api/children/:id', (req, res) => {
  try {
    const children = db.updateChild(req.params.id, req.body);
    broadcast('CHILDREN_UPDATED', children);
    res.json(children);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/children', (req, res) => {
  try {
    const newChild = db.addChild(req.body);
    broadcast('CHILDREN_UPDATED', db.getState().children);
    res.status(201).json(newChild);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/children/active', (req, res) => {
  try {
    const activeId = db.setActiveChild(req.body.id);
    broadcast('ACTIVE_CHILD_UPDATED', { activeChildId: activeId });
    res.json({ activeChildId: activeId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Preferences
app.post('/api/preferences', (req, res) => {
  try {
    const { theme: _ignoredTheme, ...sharedPrefs } = req.body;
    const prefs = db.updatePreferences(sharedPrefs);
    broadcast('PREFERENCES_UPDATED', prefs);
    res.json(prefs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Serve Production Frontend Static Assets (Docker / Production Mode) ---
const distDir = path.join(rootDir, 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.use((req, res, next) => {
    // Let API and WebSocket requests bypass SPA fallback
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/ws')) {
      return res.sendFile(path.join(distDir, 'index.html'));
    }
    next();
  });
  console.log(`[Server] Serving production frontend build from ${distDir}`);
}

// Start listening
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] Baby Tracker Real-Time Backend running at http://0.0.0.0:${PORT}`);
  console.log(`[Server] WebSocket sync endpoint ready at ws://0.0.0.0:${PORT}/ws`);
});

// Graceful shutdown handling for Docker containers
function handleShutdown(signal) {
  console.log(`[Server] Received ${signal}. Shutting down gracefully...`);
  wss.clients.forEach(client => client.close(1001, 'Server shutting down'));
  server.close(() => {
    console.log('[Server] HTTP and WebSocket server closed cleanly.');
    process.exit(0);
  });
  // Force exit after 3 seconds if connections linger
  setTimeout(() => process.exit(0), 3000).unref();
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

