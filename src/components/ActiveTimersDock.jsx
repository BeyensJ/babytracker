import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { formatTimerClock, formatTime } from '../utils/formatters';
import { Heart, Moon, Milk, Play, Pause, RefreshCw, Check, Clock, Bell } from 'lucide-react';

export function ActiveTimersDock() {
  const {
    activeTimers,
    switchBreastSide,
    pauseBreastTimer,
    resumeBreastTimer,
    stopBreastTimer,
    stopSleepTimer,
    stopPumpTimer,
    updateTimerStartTime,
    notificationPermission,
    requestNotificationPermission,
  } = useApp();

  const [tick, setTick] = useState(Date.now());
  const [dismissTrayHint, setDismissTrayHint] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setTick(Date.now()), 500);
    return () => clearInterval(interval);
  }, []);

  const hasBreastTimer = Boolean(activeTimers.breast);
  const hasSleepTimer = Boolean(activeTimers.sleep?.running);
  const hasPumpTimer = Boolean(activeTimers.pump?.running);

  if (!hasBreastTimer && !hasSleepTimer && !hasPumpTimer) {
    return null;
  }

  return (
    <div className="active-timers-dock">
      {/* 1. Breastfeed Timer */}
      {hasBreastTimer && (
        <BreastTimerRow
          timer={activeTimers.breast}
          now={tick}
          onSwitch={switchBreastSide}
          onPause={pauseBreastTimer}
          onResume={resumeBreastTimer}
          onFinish={stopBreastTimer}
          onUpdateStartTime={(newTs) => updateTimerStartTime('breast', newTs)}
        />
      )}

      {/* 2. Sleep Timer */}
      {hasSleepTimer && (
        <SleepTimerRow
          timer={activeTimers.sleep}
          now={tick}
          onFinish={stopSleepTimer}
          onUpdateStartTime={(newTs) => updateTimerStartTime('sleep', newTs)}
        />
      )}

      {/* 3. Pump Timer */}
      {hasPumpTimer && (
        <PumpTimerRow
          timer={activeTimers.pump}
          now={tick}
          onFinish={stopPumpTimer}
          onUpdateStartTime={(newTs) => updateTimerStartTime('pump', newTs)}
        />
      )}

      {/* Android Notification Tray Hint */}
      {notificationPermission !== 'granted' && !dismissTrayHint && (
        <div className="notification-tray-hint">
          <div className="tray-hint-left">
            <Bell size={13} color="var(--color-terracotta)" />
            <span>Keep active timer in your Android notification tray while locked</span>
          </div>
          <div className="tray-hint-actions">
            <button
              type="button"
              className="tray-enable-btn"
              onClick={requestNotificationPermission}
            >
              Enable Tray
            </button>
            <button
              type="button"
              className="tray-dismiss-btn"
              onClick={() => setDismissTrayHint(true)}
              title="Dismiss hint"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function BreastTimerRow({ timer, now, onSwitch, onPause, onResume, onFinish, onUpdateStartTime }) {
  const [showAdjust, setShowAdjust] = useState(false);

  let leftElapsed = timer.leftElapsedMs || 0;
  let rightElapsed = timer.rightElapsedMs || 0;

  if (timer.running && timer.lastSideStartMs) {
    const delta = now - timer.lastSideStartMs;
    if (timer.activeSide === 'LEFT') leftElapsed += delta;
    else rightElapsed += delta;
  }

  const totalElapsed = leftElapsed + rightElapsed;
  const sessionStart = timer.sessionStartMs || (now - totalElapsed);

  return (
    <div className="active-timer-row">
      <div className="timer-left-meta">
        <div className="timer-pulse-icon breast">
          <Heart size={18} color="#FFF" />
          {timer.running && <span className="timer-pulse-ring" />}
        </div>
        <div>
          <div className="timer-title">Nursing Timer</div>
          <div className="timer-side-badges" style={{ marginTop: '0.2rem' }}>
            <span className={`side-badge ${timer.activeSide === 'LEFT' ? 'active' : ''}`}>
              L: {formatTimerClock(leftElapsed)}
            </span>
            <span className={`side-badge ${timer.activeSide === 'RIGHT' ? 'active' : ''}`}>
              R: {formatTimerClock(rightElapsed)}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
            <span style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.7)' }}>
              Started at {formatTime(sessionStart)}
            </span>
            <button
              type="button"
              className="timer-adjust-link"
              onClick={() => setShowAdjust(!showAdjust)}
              title="Adjust starting time"
            >
              <Clock size={11} /> Edit
            </button>
          </div>
          {showAdjust && (
            <div className="timer-start-inline-edit">
              <button type="button" onClick={() => onUpdateStartTime(sessionStart - 5 * 60000)}>-5m</button>
              <button type="button" onClick={() => onUpdateStartTime(sessionStart - 10 * 60000)}>-10m</button>
              <button type="button" onClick={() => onUpdateStartTime(sessionStart + 5 * 60000)}>+5m</button>
              <button type="button" onClick={() => setShowAdjust(false)}>Done</button>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
        <div className="timer-digital-clock">{formatTimerClock(totalElapsed)}</div>
        <div className="timer-actions">
          {timer.running ? (
            <>
              <button className="timer-btn switch-side" onClick={onSwitch} title="Switch to other side">
                <RefreshCw size={13} />
                {timer.activeSide === 'LEFT' ? 'To R' : 'To L'}
              </button>
              <button className="timer-btn pause" onClick={onPause} title="Pause">
                <Pause size={13} />
              </button>
            </>
          ) : (
            <button className="timer-btn pause" onClick={onResume} title="Resume">
              <Play size={13} />
              Resume
            </button>
          )}

          <button className="timer-btn finish" onClick={onFinish} title="Finish and log">
            <Check size={14} />
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function SleepTimerRow({ timer, now, onFinish, onUpdateStartTime }) {
  const [showAdjust, setShowAdjust] = useState(false);
  const elapsed = Math.max(0, now - timer.startMs);

  return (
    <div className="active-timer-row">
      <div className="timer-left-meta">
        <div className="timer-pulse-icon sleep">
          <Moon size={18} color="#FFF" />
          <span className="timer-pulse-ring" />
        </div>
        <div>
          <div className="timer-title">Sleeping Now</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem' }}>
            <span className="timer-subtitle">
              Started at {formatTime(timer.startMs)}
            </span>
            <button
              type="button"
              className="timer-adjust-link"
              onClick={() => setShowAdjust(!showAdjust)}
              title="Adjust starting time"
            >
              <Clock size={11} /> Edit
            </button>
          </div>
          {showAdjust && (
            <div className="timer-start-inline-edit">
              <button type="button" onClick={() => onUpdateStartTime(timer.startMs - 5 * 60000)}>-5m</button>
              <button type="button" onClick={() => onUpdateStartTime(timer.startMs - 15 * 60000)}>-15m</button>
              <button type="button" onClick={() => onUpdateStartTime(timer.startMs + 5 * 60000)}>+5m</button>
              <button type="button" onClick={() => setShowAdjust(false)}>Done</button>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
        <div className="timer-digital-clock">{formatTimerClock(elapsed)}</div>
        <button className="timer-btn finish" onClick={onFinish}>
          <Check size={14} />
          Woke Up
        </button>
      </div>
    </div>
  );
}

function PumpTimerRow({ timer, now, onFinish, onUpdateStartTime }) {
  const [showAdjust, setShowAdjust] = useState(false);
  const elapsed = Math.max(0, now - timer.startMs);

  return (
    <div className="active-timer-row">
      <div className="timer-left-meta">
        <div className="timer-pulse-icon pump">
          <Milk size={18} color="#FFF" />
          <span className="timer-pulse-ring" />
        </div>
        <div>
          <div className="timer-title">Pumping Session</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem' }}>
            <span className="timer-subtitle">
              Started at {formatTime(timer.startMs)}
            </span>
            <button
              type="button"
              className="timer-adjust-link"
              onClick={() => setShowAdjust(!showAdjust)}
              title="Adjust starting time"
            >
              <Clock size={11} /> Edit
            </button>
          </div>
          {showAdjust && (
            <div className="timer-start-inline-edit">
              <button type="button" onClick={() => onUpdateStartTime(timer.startMs - 5 * 60000)}>-5m</button>
              <button type="button" onClick={() => onUpdateStartTime(timer.startMs - 10 * 60000)}>-10m</button>
              <button type="button" onClick={() => onUpdateStartTime(timer.startMs + 5 * 60000)}>+5m</button>
              <button type="button" onClick={() => setShowAdjust(false)}>Done</button>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
        <div className="timer-digital-clock">{formatTimerClock(elapsed)}</div>
        <button className="timer-btn finish" onClick={onFinish}>
          <Check size={14} />
          Done
        </button>
      </div>
    </div>
  );
}

