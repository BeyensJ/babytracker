import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { formatTimerClock, formatTime } from '../utils/formatters';
import { Heart, Moon, Milk, Play, Pause, RefreshCw, Check, Clock, Bell, School, Trash2 } from 'lucide-react';
import { PumpIcon } from './icons/PumpIcon';

export function ActiveTimersDock() {
  const {
    activeTimers,
    switchBreastSide,
    pauseBreastTimer,
    resumeBreastTimer,
    stopBreastTimer,
    stopSleepTimer,
    stopPumpTimer,
    stopDaycare,
    clearActiveTimer,
    updateTimerStartTime,
    notificationPermission,
    requestNotificationPermission,
    t,
    language,
    showConfirm,
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
  const hasDaycareTimer = Boolean(activeTimers.daycare?.running);

  if (!hasBreastTimer && !hasSleepTimer && !hasPumpTimer && !hasDaycareTimer) {
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
          t={t}
          language={language}
        />
      )}

      {/* 2. Sleep Timer */}
      {hasSleepTimer && (
        <SleepTimerRow
          timer={activeTimers.sleep}
          now={tick}
          onFinish={stopSleepTimer}
          onUpdateStartTime={(newTs) => updateTimerStartTime('sleep', newTs)}
          t={t}
          language={language}
        />
      )}

      {/* 3. Pump Timer */}
      {hasPumpTimer && (
        <PumpTimerRow
          timer={activeTimers.pump}
          now={tick}
          onFinish={stopPumpTimer}
          onUpdateStartTime={(newTs) => updateTimerStartTime('pump', newTs)}
          t={t}
          language={language}
        />
      )}

      {/* 4. Daycare Stay Timer */}
      {hasDaycareTimer && (
        <DaycareTimerRow
          timer={activeTimers.daycare}
          now={tick}
          onFinish={stopDaycare}
          onUpdateStartTime={(newTs) => updateTimerStartTime('daycare', newTs)}
          t={t}
          language={language}
        />
      )}
    </div>
  );
}

function BreastTimerRow({ timer, now, onSwitch, onPause, onResume, onFinish, onUpdateStartTime, t, language }) {
  const [showAdjust, setShowAdjust] = useState(false);
  const isDutch = language === 'nl';

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
          <div className="timer-title">{t('timers.nursingTimer')}</div>
          {/* Compact side pills showing L and R with active side prominently highlighted */}
          <div className="nursing-compact-sides">
            <button
              type="button"
              className={`nursing-side-pill ${timer.activeSide === 'LEFT' ? 'active' : ''}`}
              onClick={timer.activeSide !== 'LEFT' && timer.running ? onSwitch : undefined}
              title={isDutch ? 'Linkerborst' : 'Left side'}
            >
              <span className="nursing-pill-letter">L</span>
              <span className="nursing-pill-digits">{formatTimerClock(leftElapsed)}</span>
            </button>
            <button
              type="button"
              className={`nursing-side-pill ${timer.activeSide === 'RIGHT' ? 'active' : ''}`}
              onClick={timer.activeSide !== 'RIGHT' && timer.running ? onSwitch : undefined}
              title={isDutch ? 'Rechterborst' : 'Right side'}
            >
              <span className="nursing-pill-letter">R</span>
              <span className="nursing-pill-digits">{formatTimerClock(rightElapsed)}</span>
            </button>
            <button
              type="button"
              className="timer-adjust-link"
              onClick={() => setShowAdjust(!showAdjust)}
              title={t('timers.adjustStartTime')}
            >
              <Clock size={11} /> {t('timeline.edit')}
            </button>
          </div>
          {showAdjust && (
            <div className="timer-start-inline-edit">
              <button type="button" onClick={() => onUpdateStartTime(sessionStart - 5 * 60000)}>-5m</button>
              <button type="button" onClick={() => onUpdateStartTime(sessionStart - 10 * 60000)}>-10m</button>
              <button type="button" onClick={() => onUpdateStartTime(sessionStart + 5 * 60000)}>+5m</button>
              <button type="button" onClick={() => setShowAdjust(false)}>{t('common.done')}</button>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
        <div className="timer-digital-clock">{formatTimerClock(totalElapsed)}</div>
        <div className="timer-actions">
          {timer.running ? (
            <>
              <button
                type="button"
                className="timer-btn switch-side"
                onClick={onSwitch}
                title={timer.activeSide === 'LEFT' ? (isDutch ? 'Wissel naar Rechts' : 'Switch to Right') : (isDutch ? 'Wissel naar Links' : 'Switch to Left')}
              >
                <RefreshCw size={12} />
                <span>{timer.activeSide === 'LEFT' ? '→ R' : '→ L'}</span>
              </button>
              <button
                type="button"
                className="timer-btn pause"
                onClick={onPause}
                title={t('timers.pause')}
              >
                <Pause size={13} />
              </button>
            </>
          ) : (
            <button
              type="button"
              className="timer-btn pause"
              onClick={onResume}
              title={t('timers.resume')}
              style={{ background: 'var(--color-terracotta)', color: '#fff' }}
            >
              <Play size={13} />
            </button>
          )}

          <button
            type="button"
            className="timer-btn finish"
            onClick={onFinish}
            title={t('timers.finishAndLog')}
          >
            <Check size={14} />
            {t('common.done')}
          </button>
        </div>
      </div>
    </div>
  );
}

function SleepTimerRow({ timer, now, onFinish, onUpdateStartTime, t, language }) {
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
          <div className="timer-title">{t('timers.sleepingNow')}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem' }}>
            <span className="timer-subtitle">
              {t('timers.startedAt', { time: formatTime(timer.startMs, language, true) })}
            </span>
            <button
              type="button"
              className="timer-adjust-link"
              onClick={() => setShowAdjust(!showAdjust)}
              title={t('timers.adjustStartTime')}
            >
              <Clock size={11} /> {t('timeline.edit')}
            </button>
          </div>
          {showAdjust && (
            <div className="timer-start-inline-edit">
              <button type="button" onClick={() => onUpdateStartTime(timer.startMs - 5 * 60000)}>-5m</button>
              <button type="button" onClick={() => onUpdateStartTime(timer.startMs - 15 * 60000)}>-15m</button>
              <button type="button" onClick={() => onUpdateStartTime(timer.startMs + 5 * 60000)}>+5m</button>
              <button type="button" onClick={() => setShowAdjust(false)}>{t('common.done')}</button>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
        <div className="timer-digital-clock">{formatTimerClock(elapsed)}</div>
        <button className="timer-btn finish" onClick={onFinish}>
          <Check size={14} />
          {t('timers.wokeUp')}
        </button>
      </div>
    </div>
  );
}

function PumpTimerRow({ timer, now, onFinish, onUpdateStartTime, t, language }) {
  const [showAdjust, setShowAdjust] = useState(false);
  const elapsed = Math.max(0, now - timer.startMs);

  return (
    <div className="active-timer-row">
      <div className="timer-left-meta">
        <div className="timer-pulse-icon pump">
          <PumpIcon size={18} color="#FFF" />
          <span className="timer-pulse-ring" />
        </div>
        <div>
          <div className="timer-title">{t('timers.pumpingSession')}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem' }}>
            <span className="timer-subtitle">
              {t('timers.startedAt', { time: formatTime(timer.startMs, language, true) })}
            </span>
            <button
              type="button"
              className="timer-adjust-link"
              onClick={() => setShowAdjust(!showAdjust)}
              title={t('timers.adjustStartTime')}
            >
              <Clock size={11} /> {t('timeline.edit')}
            </button>
          </div>
          {showAdjust && (
            <div className="timer-start-inline-edit">
              <button type="button" onClick={() => onUpdateStartTime(timer.startMs - 5 * 60000)}>-5m</button>
              <button type="button" onClick={() => onUpdateStartTime(timer.startMs - 10 * 60000)}>-10m</button>
              <button type="button" onClick={() => onUpdateStartTime(timer.startMs + 5 * 60000)}>+5m</button>
              <button type="button" onClick={() => setShowAdjust(false)}>{t('common.done')}</button>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
        <div className="timer-digital-clock">{formatTimerClock(elapsed)}</div>
        <button className="timer-btn finish" onClick={onFinish}>
          <Check size={14} />
          {t('common.done')}
        </button>
      </div>
    </div>
  );
}

function DaycareTimerRow({ timer, now, onFinish, onUpdateStartTime, t, language }) {
  const [showAdjust, setShowAdjust] = useState(false);
  const startMs = timer.dropOffMs || timer.startMs || now;
  const elapsed = Math.max(0, now - startMs);
  const isDutch = language === 'nl';

  return (
    <div className="active-timer-row">
      <div className="timer-left-meta">
        <div className="timer-pulse-icon daycare" style={{ backgroundColor: 'var(--color-daycare)' }}>
          <School size={18} color="#FFF" />
          <span className="timer-pulse-ring" style={{ borderColor: 'var(--color-daycare)' }} />
        </div>
        <div>
          <div className="timer-title">{timer.daycareName || (isDutch ? 'Op de opvang' : 'At Daycare')}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem' }}>
            <span className="timer-subtitle">
              {isDutch ? `Afgezet om ${formatTime(startMs, language, true)}` : `Dropped off at ${formatTime(startMs, language, true)}`}
            </span>
            <button
              type="button"
              className="timer-adjust-link"
              onClick={() => setShowAdjust(!showAdjust)}
              title={isDutch ? 'Afzettijd aanpassen' : 'Adjust drop-off time'}
            >
              <Clock size={11} /> {t('timeline.edit')}
            </button>
          </div>
          {showAdjust && (
            <div className="timer-start-inline-edit">
              <button type="button" onClick={() => onUpdateStartTime(startMs - 15 * 60000)}>-15m</button>
              <button type="button" onClick={() => onUpdateStartTime(startMs - 30 * 60000)}>-30m</button>
              <button type="button" onClick={() => onUpdateStartTime(startMs + 15 * 60000)}>+15m</button>
              <button type="button" onClick={() => setShowAdjust(false)}>{t('common.done')}</button>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
        <div className="timer-digital-clock">{formatTimerClock(elapsed)}</div>
        <button className="timer-btn finish" onClick={onFinish} style={{ background: 'var(--color-daycare)' }}>
          <Check size={14} />
          {isDutch ? 'Ophalen' : 'Pick Up'}
        </button>
      </div>
    </div>
  );
}

