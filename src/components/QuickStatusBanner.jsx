import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { formatRelative, formatDurationMs, formatVolume, getWakeWindowStatus } from '../utils/formatters';
import { Utensils, Moon, Sparkles, Sun, Clock, ChevronRight } from 'lucide-react';

export function QuickStatusBanner() {
  const { events, activeChild, activeChildId, activeTimers, preferences, openModal } = useApp();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  const childEvents = events.filter(e => !e.childKey || e.childKey === activeChildId);

  // Find latest Feed, Diaper, Sleep
  const latestFeed = childEvents.find(e => ['BREAST', 'BOTTLE', 'SOLIDS', 'COMBO'].includes(e.type));
  const latestDiaper = childEvents.find(e => e.type === 'DIAPER');
  const latestSleep = childEvents.find(e => e.type === 'SLEEP');

  // Wake Window & Current Status Calculation
  const isSleeping = Boolean(activeTimers?.sleep?.running);
  let awakeMs = 0;

  if (isSleeping) {
    awakeMs = -1;
  } else if (latestSleep) {
    const isOngoing = !latestSleep.endDt && !latestSleep.durationMs;
    if (isOngoing) {
      awakeMs = -1;
    } else {
      const sleepEnd = latestSleep.endDt || (latestSleep.beginDt + (latestSleep.durationMs || 0));
      awakeMs = Math.max(0, now - sleepEnd);
    }
  } else {
    awakeMs = 60 * 60 * 1000;
  }

  const wakeStatus = (isSleeping || awakeMs === -1)
    ? { label: 'Sleeping', status: 'neutral' }
    : getWakeWindowStatus(awakeMs);

  const getAwakeDurationText = () => {
    if (awakeMs <= 0) return 'Just woke up';
    const mins = Math.floor(awakeMs / 60000);
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hrs === 0) return `${remMins}m awake`;
    return `${hrs}h ${remMins}m awake`;
  };

  // Format feed detail
  const getFeedDetail = (ev) => {
    if (!ev) return 'No feeds yet';
    const det = ev.details || {};
    if (ev.type === 'BREAST') {
      const dur = formatDurationMs((det.leftDurationMs || 0) + (det.rightDurationMs || 0) || ev.durationMs);
      return dur ? `Nurse · ${dur}` : `Nurse · ${det.side || 'Both'}`;
    }
    if (ev.type === 'BOTTLE') {
      const vol = formatVolume(det.volumeFloz, preferences.volumeUnit);
      return `Bottle · ${vol}`;
    }
    if (ev.type === 'SOLIDS') {
      return det.food ? `Solids · ${det.food}` : 'Solid meal';
    }
    if (ev.type === 'COMBO') {
      const vol = formatVolume(det.volumeFloz, preferences.volumeUnit);
      return `Combo · ${vol}`;
    }
    return 'Feed';
  };

  // Format diaper detail
  const getDiaperDetail = (ev) => {
    if (!ev) return 'No diapers yet';
    const det = ev.details || {};
    const parts = [];
    if (det.pee) parts.push('Wet');
    if (det.poop) parts.push('Dirty');
    if (det.dry) parts.push('Dry');
    return parts.length > 0 ? parts.join(' & ') : 'Diaper change';
  };

  // Format sleep detail
  const getSleepDetail = (ev) => {
    if (!ev) return 'No sleep yet';
    const det = ev.details || {};
    const type = det.sleepType === 'NIGHT' ? 'Night' : 'Nap';
    if (!ev.durationMs && !ev.endDt) {
      return 'Sleeping now';
    }
    const dur = formatDurationMs(ev.durationMs);
    return dur ? `${type} · ${dur}` : type;
  };

  const babyName = activeChild?.name || 'Baby';

  return (
    <div className="hero-glance-card">
      {/* 1. Serene State Indicator (Awake / Sleeping) */}
      <div className="hero-glance-header">
        <div className="hero-state-wrap">
          <div className={`hero-state-badge ${isSleeping ? 'sleeping' : 'awake'}`}>
            {isSleeping ? <Moon size={14} /> : <Sun size={14} />}
            <span>{isSleeping ? `${babyName} is Sleeping` : `${babyName} is Awake`}</span>
          </div>

          <span className="hero-wake-duration">
            {isSleeping ? (
              activeTimers?.sleep?.startMs ? (
                `Started ${formatRelative(activeTimers.sleep.startMs, now)}`
              ) : 'Timer active'
            ) : (
              getAwakeDurationText()
            )}
          </span>
        </div>

        {/* Subtle Next Action Cue */}
        {!isSleeping && (
          <div className={`hero-cue-pill ${wakeStatus.status}`}>
            <span className="hero-cue-dot" />
            <span>{wakeStatus.label}</span>
          </div>
        )}
      </div>

      {/* 2. Modern 3-Column Activity Glance Pills */}
      <div className="hero-glance-grid">
        {/* Last Fed */}
        <button
          type="button"
          className="glance-pill feed"
          onClick={() => openModal(latestFeed ? latestFeed.type : 'BREAST')}
          id="glance-feed-btn"
        >
          <div className="glance-icon-wrap feed">
            <Utensils size={15} />
          </div>
          <div className="glance-content">
            <span className="glance-label">Last Fed</span>
            <span className="glance-time">
              {latestFeed ? formatRelative(latestFeed.beginDt, now) : '—'}
            </span>
            <span className="glance-sub">{getFeedDetail(latestFeed)}</span>
          </div>
        </button>

        {/* Last Diaper */}
        <button
          type="button"
          className="glance-pill diaper"
          onClick={() => openModal('DIAPER')}
          id="glance-diaper-btn"
        >
          <div className="glance-icon-wrap diaper">
            <Sparkles size={15} />
          </div>
          <div className="glance-content">
            <span className="glance-label">Last Diaper</span>
            <span className="glance-time">
              {latestDiaper ? formatRelative(latestDiaper.beginDt, now) : '—'}
            </span>
            <span className="glance-sub">{getDiaperDetail(latestDiaper)}</span>
          </div>
        </button>

        {/* Last Sleep */}
        <button
          type="button"
          className="glance-pill sleep"
          onClick={() => openModal('SLEEP')}
          id="glance-sleep-btn"
        >
          <div className="glance-icon-wrap sleep">
            <Moon size={15} />
          </div>
          <div className="glance-content">
            <span className="glance-label">Last Sleep</span>
            <span className="glance-time">
              {latestSleep ? formatRelative(latestSleep.endDt || latestSleep.beginDt, now) : '—'}
            </span>
            <span className="glance-sub">{getSleepDetail(latestSleep)}</span>
          </div>
        </button>
      </div>
    </div>
  );
}
