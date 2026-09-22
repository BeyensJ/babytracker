import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function testPWAAndNotifications() {
  console.log('--- Testing PWA & Android Notification Tray Integration ---');

  // 1. Verify manifest.json
  const manifestPath = path.join(rootDir, 'public', 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error('manifest.json not found');
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  console.log('✓ manifest.json exists and is valid JSON');
  console.log(`  Name: ${manifest.name}`);
  console.log(`  Short name: ${manifest.short_name}`);
  console.log(`  Display: ${manifest.display}`);
  console.log(`  Theme color: ${manifest.theme_color}`);

  if (!manifest.icons || manifest.icons.length < 3) {
    throw new Error('manifest.json lacks required icons');
  }

  // 2. Verify all referenced icons exist
  for (const icon of manifest.icons) {
    const iconFile = path.join(rootDir, 'public', icon.src.replace(/^\//, ''));
    if (!fs.existsSync(iconFile)) {
      throw new Error(`Icon file missing: ${icon.src}`);
    }
    const stat = fs.statSync(iconFile);
    console.log(`✓ Icon verified: ${icon.src} (${icon.sizes}, ${stat.size} bytes)`);
  }

  // Also check badge-72.png
  const badgeFile = path.join(rootDir, 'public', 'icons', 'badge-72.png');
  if (!fs.existsSync(badgeFile)) {
    throw new Error('badge-72.png missing');
  }
  console.log('✓ Android status bar badge icon verified: badge-72.png');

  // 3. Verify Service Worker
  const swPath = path.join(rootDir, 'public', 'sw.js');
  if (!fs.existsSync(swPath)) {
    throw new Error('sw.js not found');
  }
  const swContent = fs.readFileSync(swPath, 'utf8');
  const requiredKeywords = [
    'CACHE_NAME',
    'notificationclick',
    'UPDATE_TIMER_NOTIFICATION',
    'CLEAR_TIMER_NOTIFICATION',
    'nara-active-timer',
    'ongoing',
    '/api/timers/action'
  ];
  for (const kw of requiredKeywords) {
    if (!swContent.includes(kw)) {
      throw new Error(`sw.js missing crucial feature/keyword: ${kw}`);
    }
  }
  console.log('✓ Service Worker sw.js contains all PWA offline caching & notification tray handlers');

  // 4. Test backend /api/timers/action endpoint
  console.log('--- Testing Headless Notification Action API ---');
  
  // Login first to get auth token
  const loginRes = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'baby2026', caregiverId: 'cg_mom' }),
  });
  const { token } = await loginRes.json();
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // Set up an active sleep timer first
  const timerSetupRes = await fetch('http://localhost:3001/api/timers', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      sleep: { running: true, startMs: Date.now() - 45 * 60 * 1000, sleepType: 'NAP' }
    })
  });
  const setupData = await timerSetupRes.json();
  console.log('✓ Started test sleep timer on backend:', setupData.sleep);

  // Now simulate Android Notification Tray action click: "Woke Up" (finish_timer)
  const actionRes = await fetch('http://localhost:3001/api/timers/action', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      action: 'finish_timer',
      timerType: 'sleep',
      caregiver: 'Dad (Dad)'
    })
  });
  const actionData = await actionRes.json();
  console.log('✓ Handled headless notification action finish_timer:');
  console.log('  Timers after action:', actionData.timers.sleep);
  console.log('  Recorded timeline event:', actionData.event?.type, `(duration: ${actionData.event?.details?.durationSeconds}s, by: ${actionData.event?.details?.caregiver})`);

  if (actionData.timers.sleep.running !== false) {
    throw new Error('Sleep timer failed to stop from notification action');
  }
  if (!actionData.event || actionData.event.type !== 'SLEEP') {
    throw new Error('Notification action failed to record SLEEP activity');
  }

  // Test switch_side for breastfeed timer
  const bfSetup = await fetch('http://localhost:3001/api/timers', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      breast: {
        running: true,
        activeSide: 'LEFT',
        lastSideStartMs: Date.now() - 8 * 60 * 1000,
        leftElapsedMs: 0,
        rightElapsedMs: 0,
        sessionStartMs: Date.now() - 8 * 60 * 1000
      }
    })
  });
  await bfSetup.json();
  
  // Simulate Android notification action: "Switch Side"
  const switchRes = await fetch('http://localhost:3001/api/timers/action', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ action: 'switch_side' })
  });
  const switchData = await switchRes.json();
  console.log('✓ Handled notification action switch_side:', switchData.timers.breast.activeSide);
  if (switchData.timers.breast.activeSide !== 'RIGHT') {
    throw new Error('Expected side to switch to RIGHT');
  }

  // Clear test breast timer
  await fetch('http://localhost:3001/api/timers', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ breast: null })
  });

  console.log('--- ALL PWA & NOTIFICATION TESTS PASSED SUCCESSFULLY! ---');
}

testPWAAndNotifications().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
