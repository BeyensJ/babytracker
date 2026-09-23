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
    t,
    language,
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
    </div>
  );
}

function BreastTimerRow({ timer, now, onSwitch, onPause, onResume, onFinish, onUpdateStartTime, t, language }) {
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
          <div className="timer-title">{language === 'nl' ? 'Borstvoedingstimer' : 'Nursing Timer'}</div>
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
              {t('timers.startedAt', { time: formatTime(sessionStart, language, true) })}
            </span>
            <button
              type="button"
              className="timer-adjust-link"
              onClick={() => setShowAdjust(!showAdjust)}
              title={language === 'nl' ? 'Begintijd aanpassen' : 'Adjust starting time'}
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

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
        <div className="timer-digital-clock">{formatTimerClock(totalElapsed)}</div>
        <div className="timer-actions">
          {timer.running ? (
            <>
              <button className="timer-btn switch-side" onClick={onSwitch} title={language === 'nl' ? 'Wissel van borst' : 'Switch to other side'}>
                <RefreshCw size={13} />
                {timer.activeSide === 'LEFT' ? (language === 'nl' ? 'Naar R' : 'To R') : (language === 'nl' ? 'Naar L' : 'To L')}
              </button>
              <button className="timer-btn pause" onClick={onPause} title={t('timers.pause')}>
                <Pause size={13} />
              </button>
            </>
          ) : (
            <button className="timer-btn pause" onClick={onResume} title={t('timers.resume')}>
              <Play size={13} />
              {t('timers.resume')}
            </button>
          )}

          <button className="timer-btn finish" onClick={onFinish} title={language === 'nl' ? 'Afronden en opslaan' : 'Finish and log'}>
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
          <div className="timer-title">{language === 'nl' ? 'Slaapt nu' : 'Sleeping Now'}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem' }}>
            <span className="timer-subtitle">
              {t('timers.startedAt', { time: formatTime(timer.startMs, language, true) })}
            </span>
            <button
              type="button"
              className="timer-adjust-link"
              onClick={() => setShowAdjust(!showAdjust)}
              title={language === 'nl' ? 'Begintijd aanpassen' : 'Adjust starting time'}
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
          {language === 'nl' ? 'Wakker' : 'Woke Up'}
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
          <Milk size={18} color="#FFF" />
          <span className="timer-pulse-ring" />
        </div>
        <div>
          <div className="timer-title">{language === 'nl' ? 'Afkolftimer' : 'Pumping Session'}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem' }}>
            <span className="timer-subtitle">
              {t('timers.startedAt', { time: formatTime(timer.startMs, language, true) })}
            </span>
            <button
              type="button"
              className="timer-adjust-link"
              onClick={() => setShowAdjust(!showAdjust)}
              title={language === 'nl' ? 'Begintijd aanpassen' : 'Adjust starting time'}
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

