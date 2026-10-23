import express from 'express';
import cors from 'cors';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import webpush from 'web-push';
import * as db from './db.js';
import { computeNextDueTime, createTimelineEventPayload, RECURRENCE_TYPES, getCategorySummary } from '../src/utils/reminderUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Initialize Database on server startup
db.initDb();

const uploadsDir = path.join(db.dataDir || process.env.DATA_DIR || path.join(rootDir, 'data'), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve uploaded photos statically
app.use('/api/uploads', express.static(uploadsDir, { maxAge: '30d' }));
app.use('/uploads', express.static(uploadsDir, { maxAge: '30d' }));

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

// Setup VAPID keys for Web Push
const dataDir = db.dataDir || process.env.DATA_DIR || path.join(rootDir, 'data');
const vapidFilePath = path.join(dataDir, 'vapid.json');
let vapidKeys = null;
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  vapidKeys = {
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY,
  };
} else if (fs.existsSync(vapidFilePath)) {
  try {
    vapidKeys = JSON.parse(fs.readFileSync(vapidFilePath, 'utf8'));
  } catch (e) {
    console.warn('[Push] Error reading vapid.json:', e.message);
  }
}

if (!vapidKeys || !vapidKeys.publicKey || !vapidKeys.privateKey) {
  try {
    vapidKeys = webpush.generateVAPIDKeys();
    fs.writeFileSync(vapidFilePath, JSON.stringify(vapidKeys, null, 2), 'utf8');
    console.log('[Push] Generated new VAPID keys saved to', vapidFilePath);
  } catch (err) {
    console.warn('[Push] Could not generate VAPID keys:', err.message);
  }
}

if (vapidKeys?.publicKey && vapidKeys?.privateKey) {
  try {
    webpush.setVapidDetails(
      process.env.VAPID_EMAIL || 'mailto:support@babytracker.local',
      vapidKeys.publicKey,
      vapidKeys.privateKey
    );
    console.log('[Push] Web Push initialized with VAPID');
  } catch (err) {
    console.warn('[Push] webpush.setVapidDetails error:', err.message);
  }
}

// Public Push & Notification Action Routes (Headless Service Worker accessible)
app.get('/api/push/vapid-public-key', (req, res) => {
  if (vapidKeys?.publicKey) {
    res.json({ publicKey: vapidKeys.publicKey });
  } else {
    res.status(503).json({ error: 'Push not configured' });
  }
});

app.post('/api/push/subscribe', (req, res) => {
  try {
    const sub = req.body;
    if (!sub || !sub.endpoint) {
      return res.status(400).json({ error: 'Invalid subscription' });
    }
    db.addPushSubscription(sub);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/push/unsubscribe', (req, res) => {
  try {
    const { endpoint } = req.body;
    if (endpoint) {
      db.removePushSubscription(endpoint);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Headless Notification Action for Reminders (allows tapping "Complete" / "Snooze" from lockscreen)
app.post('/api/reminders/:id/action', (req, res) => {
  try {
    const { action, minutes = 30, caregiver = 'Parent' } = req.body;
    const currentState = db.getState();
    const reminder = (currentState.reminders || []).find(r => r.id === req.params.id);
    if (!reminder) return res.status(404).json({ error: 'Reminder not found' });

    const now = Date.now();

    if (action === 'complete_reminder') {
      const isDaycare = reminder.activityType === 'DAYCARE' ||
        reminder.id?.startsWith('daycare_') ||
        reminder.subType === 'DROPOFF' || reminder.subType === 'PICKUP' ||
        /opvang|crèche|creche|onthaalouder|daycare/i.test(`${reminder.title || ''} ${reminder.note || ''}`);

      const titleAndNote = `${reminder.title || ''} ${reminder.note || ''} ${reminder.subType || ''}`.toLowerCase();
      const isPickUp = isDaycare && (reminder.subType === 'PICKUP' || /pick[- ]?up|ophalen|ophalen van|afhalen/i.test(titleAndNote));
      const isDropOff = isDaycare && (reminder.subType === 'DROPOFF' || /drop[- ]?off|afzetten|brengen|wegbrengen/i.test(titleAndNote) || !isPickUp);

      let createdEvent = null;
      const timers = { ...(currentState.activeTimers || {}) };

      if (isDaycare && isDropOff) {
        // Start live daycare timer, do NOT create premature timeline log
        const daycareName = reminder.prefilledData?.daycareName || currentState.preferences?.daycareName || '';
        timers.daycare = {
          running: true,
          startMs: now,
          dropOffMs: now,
          daycareName,
          caregiverId: caregiver || 'Parent',
        };
        db.updateTimers(timers);
        broadcast('TIMERS_UPDATED', timers);
      } else if (isDaycare && isPickUp) {
        // Stop live daycare timer and log complete stay
        const d = timers.daycare;
        const dropOffMs = d?.dropOffMs || d?.startMs || (now - 8 * 60 * 60 * 1000);
        const daycareName = reminder.prefilledData?.daycareName || d?.daycareName || currentState.preferences?.daycareName || '';
        const durationMs = Math.max(0, now - dropOffMs);

        createdEvent = db.addEvent({
          type: 'DAYCARE',
          childKey: reminder.childKey || currentState.activeChildId || 'child_1',
          beginDt: new Date(dropOffMs).toISOString(),
          endDt: new Date(now).toISOString(),
          durationMs,
          note: reminder.note ? `${reminder.note} (Daycare)` : 'Daycare stay',
          details: {
            daycareName,
            dropOffCaregiver: d?.caregiverId || caregiver || 'Parent',
            pickUpCaregiver: caregiver || 'Parent',
            durationSeconds: Math.round(durationMs / 1000),
          }
        });
        broadcast('EVENT_ADDED', createdEvent);

        delete timers.daycare;
        db.updateTimers(timers);
        broadcast('TIMERS_UPDATED', timers);
      } else {
        const eventPayload = createTimelineEventPayload(reminder, caregiver);
        eventPayload.childKey = reminder.childKey || currentState.activeChildId || 'child_1';
        createdEvent = db.addEvent(eventPayload);
        broadcast('EVENT_ADDED', createdEvent);
      }

      let nextDueTime = reminder.dueTime;
      let isCompleted = false;

      if (reminder.recurrence === RECURRENCE_TYPES.ONCE) {
        isCompleted = true;
      } else {
        nextDueTime = computeNextDueTime(reminder, now);
        isCompleted = false;
      }

      const updated = db.updateReminder(reminder.id, {
        dueTime: nextDueTime,
        lastCompletedAt: now,
        completed: isCompleted,
        activityType: isDaycare ? 'DAYCARE' : reminder.activityType,
        subType: isDaycare ? (isPickUp ? 'PICKUP' : 'DROPOFF') : reminder.subType,
      });

      broadcast('REMINDER_UPDATED', updated);
      broadcast('REMINDERS_UPDATED', db.getState().reminders);
      return res.json({ success: true, reminder: updated, event: createdEvent });
    }

    if (action === 'snooze_reminder') {
      const newDueTime = now + (Number(minutes) || 30) * 60000;
      const updated = db.updateReminder(reminder.id, {
        dueTime: newDueTime,
        completed: false,
      });

      broadcast('REMINDER_UPDATED', updated);
      broadcast('REMINDERS_UPDATED', db.getState().reminders);
      return res.json({ success: true, reminder: updated });
    }

    res.status(400).json({ error: 'Invalid reminder action' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Background Reminder Push Notification Checker (checks every 30s)
const sentReminderKeys = new Set();
async function checkAndSendDueReminderPushes() {
  if (!vapidKeys) return;
  const subscriptions = db.getPushSubscriptions();
  if (!subscriptions || subscriptions.length === 0) return;

  const currentState = db.getState();
  const reminders = currentState.reminders || [];
  const children = currentState.children || [];
  const now = Date.now();

  for (const reminder of reminders) {
    if (!reminder.enabled) continue;
    if (reminder.completed && reminder.recurrence === RECURRENCE_TYPES.ONCE) continue;
    const dueTime = Number(reminder.dueTime);
    if (!dueTime || isNaN(dueTime)) continue;

    if (dueTime <= now && now - dueTime < 15 * 60 * 1000) {
      const key = `${reminder.id}_${dueTime}`;
      if (sentReminderKeys.has(key)) continue;
      sentReminderKeys.add(key);

      const baby = children.find(c => c.id === reminder.childKey);
      const babyName = baby?.name || '';

      const emojiMap = {
        BREAST: '🤱',
        BOTTLE: '🍼',
        SLEEP: '🌙',
        DIAPER: '✨',
        PUMP: '🥛',
        SOLIDS: '🍎',
        GROWTH: '📏',
        HEALTH: '💊',
        ROUTINE: '⏰',
        NOTE: '📝',
        MILESTONE: '🏆',
      };
      const emoji = emojiMap[reminder.activityType] || '⏰';
      const summary = getCategorySummary(reminder.activityType, reminder.prefilledData, 'nl');
      const hasTitle = Boolean(reminder.title && reminder.title.trim().length > 0);
      const mainTitle = hasTitle ? reminder.title.trim() : summary;
      const title = `${emoji} ${mainTitle}${babyName ? ` — ${babyName}` : ''}`;

      const d = new Date(dueTime);
      const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      const body = hasTitle && summary && summary !== reminder.activityType && summary !== mainTitle
        ? `${summary} • Gepland om ${timeStr}`
        : `Herinnering gepland om ${timeStr}`;

      const payload = JSON.stringify({
        title,
        body,
        icon: '/icons/icon-192.png',
        badge: '/icons/badge-72.png',
        tag: `babytracker-reminder-${reminder.id}-${dueTime}`,
        vibrate: [200, 100, 200, 100, 250],
        timestamp: dueTime,
        actions: [
          { action: 'complete_reminder', title: 'Voltooid ✓' },
          { action: 'snooze_reminder', title: '+30 min ⏳' },
        ],
        data: {
          reminderId: reminder.id,
          dueTime,
          url: '/',
        },
      });

      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(sub, payload);
        } catch (err) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            db.removePushSubscription(sub.endpoint);
          }
        }
      }
    }
  }
}
setInterval(checkAndSendDueReminderPushes, 30000);

// Guard all data endpoints with requireAuth
app.use('/api/sync', requireAuth);
app.use('/api/events', requireAuth);
app.use('/api/reminders', requireAuth);
app.use('/api/timers', requireAuth);
app.use('/api/caregivers', requireAuth);
app.use('/api/children', requireAuth);
app.use('/api/preferences', requireAuth);
app.use('/api/upload', requireAuth);
app.use('/api/daycare', requireAuth);

// --- REST API Endpoints ---

// 0. File / Photo Upload (Supports Images and PDF Daycare Reports)
app.post('/api/upload', (req, res) => {
  try {
    const dataUrl = req.body.file || req.body.image;
    if (!dataUrl || typeof dataUrl !== 'string') {
      return res.status(400).json({ error: 'No file or image data provided' });
    }

    const matches = dataUrl.match(/^data:([A-Za-z0-9-+/.]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Invalid base64 data' });
    }

    const mimeType = matches[1].toLowerCase();
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    let ext = 'jpg';
    if (mimeType.includes('pdf')) ext = 'pdf';
    else if (mimeType.includes('png')) ext = 'png';
    else if (mimeType.includes('webp')) ext = 'webp';
    else if (mimeType.includes('gif')) ext = 'gif';

    const prefix = ext === 'pdf' ? 'doc' : 'photo';
    const safeName = `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
    const filePath = path.join(uploadsDir, safeName);

    fs.writeFileSync(filePath, buffer);

    res.json({
      success: true,
      url: `/api/uploads/${safeName}`,
      filename: safeName,
      mimeType,
      size: buffer.length,
    });
  } catch (err) {
    console.error('[API] Error handling file upload:', err);
    res.status(500).json({ error: err.message });
  }
});

// 0b. Daycare Report AI Extraction (Google Gemini)
app.post('/api/daycare/test-gemini', async (req, res) => {
  try {
    const currentState = db.getState();
    const apiKey = req.body?.apiKey || currentState.preferences?.geminiApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ success: false, error: 'Geen API-sleutel ingevoerd.' });
    }

    const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
    const testRes = await fetch(testUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Respond with the word OK.' }] }],
      }),
    });

    if (!testRes.ok) {
      // Fallback check to gemini-1.5-flash
      const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
      const fallbackRes = await fetch(fallbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Respond with the word OK.' }] }],
        }),
      });

      if (!fallbackRes.ok) {
        const errJson = await fallbackRes.json().catch(() => ({}));
        const errMsg = errJson.error?.message || `HTTP ${fallbackRes.status}`;
        return res.json({ success: false, error: errMsg });
      }
      return res.json({ success: true, model: 'gemini-1.5-flash' });
    }

    return res.json({ success: true, model: 'gemini-2.5-flash' });
  } catch (err) {
    return res.json({ success: false, error: err.message });
  }
});

app.post('/api/daycare/extract-report', async (req, res) => {
  try {
    const currentState = db.getState();
    const apiKey = req.body?.apiKey || currentState.preferences?.geminiApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({
        error: 'MISSING_API_KEY',
        message: 'No Gemini API key found. Please configure your Gemini API key in Settings.',
      });
    }

    const { file, mimeType: userMimeType, date, daycareName, childName } = req.body;
    if (!file || typeof file !== 'string') {
      return res.status(400).json({ error: 'No file data provided.' });
    }

    let mimeType = userMimeType || 'image/jpeg';
    let base64Data = file;
    if (file.startsWith('data:')) {
      const parts = file.split(';base64,');
      mimeType = parts[0].replace('data:', '');
      base64Data = parts[1];
    }

    const systemPrompt = `You are an expert pediatric daycare report reader.
Analyze the provided daycare report (which can be a photo of a handwritten/printed daily sheet, a screenshot of a daycare app like Bitcare/Konnect, or a PDF report).
The child's name is "${childName || 'Baby'}" and the date of the report is "${date || 'today'}".

Extract all relevant baby care events that occurred at daycare into structured JSON.
Possible activity categories:
1. SLEEP: naps at daycare. Include "time" (start HH:MM), "endTime" (HH:MM) or "durationMinutes".
2. BOTTLE: bottle feeds / milk. Include "time" (HH:MM), volume in ml (e.g. 180), milkType ("FORMULA", "BREAST_MILK", "WATER").
3. SOLIDS: solid food, fruit puree, vegetable puree, lunch, snacks. Include "time" (HH:MM), food description, mealType ("Lunch", "Snack", "Breakfast"), portion or reaction.
4. DIAPER: diaper changes. Include "time" (HH:MM), boolean "pee", boolean "poop", and texture/notes if noted.
5. HEALTH: temperature in °C, medication administered, illness or teething symptoms.
6. ROUTINE: outdoor walk, playtime, tummy time, bath, crafts.
7. NOTE: teacher remarks, child's mood, general observations, sleep quality.

Format your response as a valid JSON object matching this exact structure:
{
  "daycareName": string or null,
  "reportDate": "YYYY-MM-DD" or null,
  "generalSummary": string,
  "events": [
    {
      "type": "SLEEP" | "BOTTLE" | "SOLIDS" | "DIAPER" | "HEALTH" | "ROUTINE" | "NOTE",
      "time": "HH:MM",
      "endTime": "HH:MM",
      "durationMinutes": number,
      "title": string,
      "details": object,
      "daycareRemark": string
    }
  ]
}`;

    const requestBody = {
      contents: [
        {
          parts: [
            { text: systemPrompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        response_mime_type: 'application/json',
        temperature: 0.1,
      },
    };

    let geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
    let geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!geminiRes.ok && geminiRes.status === 404) {
      // Fallback to gemini-1.5-flash if 2.5-flash not found
      geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
      geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
    }

    if (!geminiRes.ok) {
      const errData = await geminiRes.json().catch(() => ({}));
      const msg = errData.error?.message || `Gemini API returned status ${geminiRes.status}`;
      return res.status(502).json({ error: 'GEMINI_API_ERROR', message: msg });
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return res.status(502).json({ error: 'EMPTY_RESPONSE', message: 'No content generated by Gemini.' });
    }

    const cleanedText = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed = JSON.parse(cleanedText);

    res.json({
      success: true,
      daycareName: parsed.daycareName || daycareName || null,
      reportDate: parsed.reportDate || date || null,
      generalSummary: parsed.generalSummary || '',
      events: Array.isArray(parsed.events) ? parsed.events : [],
    });
  } catch (err) {
    console.error('[API] Daycare report extraction error:', err);
    res.status(500).json({ error: 'EXTRACTION_FAILED', message: err.message });
  }
});

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

app.post('/api/events/:id/like', (req, res) => {
  try {
    const caregiver = req.body?.caregiver || req.session?.caregiver;
    const result = db.toggleLike(req.params.id, caregiver);
    if (!result) return res.status(404).json({ error: 'Event not found' });
    broadcast('EVENT_UPDATED', result.event);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/events/:id/comments', (req, res) => {
  try {
    const caregiver = req.body?.caregiver || req.session?.caregiver;
    const commentData = {
      text: req.body?.text,
      caregiverId: caregiver?.id,
      caregiverName: caregiver?.name,
      caregiverColor: caregiver?.color,
    };
    if (!commentData.text || !commentData.text.trim()) {
      return res.status(400).json({ error: 'Comment text is required' });
    }
    const result = db.addComment(req.params.id, commentData, caregiver);
    if (!result) return res.status(404).json({ error: 'Event not found' });
    broadcast('EVENT_UPDATED', result.event);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/events/:id/comments/:commentId', (req, res) => {
  try {
    const result = db.deleteComment(req.params.id, req.params.commentId);
    if (!result) return res.status(404).json({ error: 'Event or comment not found' });
    broadcast('EVENT_UPDATED', result.event);
    res.json(result);
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
      } else if ((!timerType || timerType === 'daycare') && timers.daycare?.running) {
        const d = timers.daycare;
        const startMs = d.dropOffMs || d.startMs || now;
        const durationSec = Math.max(0, Math.round((now - startMs) / 1000));
        const beginDt = new Date(startMs).toISOString();
        const endDt = new Date(now).toISOString();

        createdEvent = db.addEvent({
          type: 'DAYCARE',
          beginDt,
          endDt,
          durationMs: durationSec * 1000,
          details: {
            daycareName: d.daycareName || currentState.preferences?.daycareName || '',
            dropOffCaregiver: d.caregiverId || caregiver || 'Parent',
            pickUpCaregiver: caregiver || 'Parent',
            durationSeconds: durationSec,
          }
        });
        delete timers.daycare;
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
    const {
      theme: _ignoredTheme,
      zenMode: _ignoredZen,
      language: _ignoredLang,
      haptics: _ignoredHaptics,
      quickStatusCards: _ignoredQuickStatus,
      quickActionButtons: _ignoredQuickActions,
      ...sharedPrefs
    } = req.body;
    const prefs = db.updatePreferences(sharedPrefs);
    broadcast('PREFERENCES_UPDATED', prefs);
    res.json(prefs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Reminders Management
app.get('/api/reminders', (req, res) => {
  try {
    res.json(db.getState().reminders || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reminders', (req, res) => {
  try {
    const newReminder = db.addReminder(req.body);
    broadcast('REMINDER_ADDED', newReminder);
    broadcast('REMINDERS_UPDATED', db.getState().reminders);
    res.status(201).json(newReminder);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/reminders/:id', (req, res) => {
  try {
    const updated = db.updateReminder(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Reminder not found' });
    broadcast('REMINDER_UPDATED', updated);
    broadcast('REMINDERS_UPDATED', db.getState().reminders);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/reminders/:id', (req, res) => {
  try {
    const success = db.deleteReminder(req.params.id);
    if (!success) return res.status(404).json({ error: 'Reminder not found' });
    broadcast('REMINDER_DELETED', { id: req.params.id });
    broadcast('REMINDERS_UPDATED', db.getState().reminders);
    res.json({ success: true, id: req.params.id });
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

