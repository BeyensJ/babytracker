import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { formatRelative, formatDurationMs, formatVolume, getWakeWindowStatus } from '../utils/formatters';
import { Utensils, Moon, Sparkles, Sun, Clock, ChevronRight, Heart, Milk, Apple } from 'lucide-react';

export function QuickStatusBanner() {
  const { events, activeChild, activeChildId, activeTimers, preferences, openModal, language, t } = useApp();
  const [now, setNow] = useState(Date.now());
  const isDutch = language === 'nl';

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
    ? { label: isDutch ? 'Slaapt nu' : 'Sleeping', status: 'neutral' }
    : getWakeWindowStatus(awakeMs, language);

  const getAwakeDurationText = () => {
    if (awakeMs <= 0) return isDutch ? 'Net wakker' : 'Just woke up';
    const mins = Math.floor(awakeMs / 60000);
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    const hUnit = isDutch ? 'u' : 'h';
    if (hrs === 0) return isDutch ? `${remMins} min wakker` : `${remMins}m awake`;
    return isDutch ? `${hrs}${hUnit} ${remMins}m wakker` : `${hrs}h ${remMins}m awake`;
  };

  // Format feed detail and visual metadata
  const getFeedMeta = (ev) => {
    if (!ev) {
      return {
        icon: Utensils,
        badge: null,
        detail: isDutch ? 'Nog geen voeding' : 'No feeds yet',
        color: 'var(--color-terracotta)',
        bg: 'var(--color-terracotta-light)',
      };
    }
    const det = ev.details || {};
    if (ev.type === 'BREAST') {
      const dur = formatDurationMs((det.leftDurationMs || 0) + (det.rightDurationMs || 0) || ev.durationMs, language);
      const side = (det.side || (det.rightDurationMs > 0 && det.leftDurationMs > 0 ? 'BOTH' : det.rightDurationMs > 0 ? 'RIGHT' : 'LEFT')).toUpperCase();
      let sideBadge = isDutch ? 'Borst' : 'Breast';
      let sideDetail = isDutch ? 'Borstvoeding' : 'Nursing';

      if (side === 'LEFT' || (det.leftDurationMs > 0 && !det.rightDurationMs)) {
        sideBadge = isDutch ? 'Links' : 'Left';
        sideDetail = isDutch ? 'Linkerborst' : 'Left breast';
      } else if (side === 'RIGHT' || (det.rightDurationMs > 0 && !det.leftDurationMs)) {
        sideBadge = isDutch ? 'Rechts' : 'Right';
        sideDetail = isDutch ? 'Rechterborst' : 'Right breast';
      } else if (side === 'BOTH' || (det.leftDurationMs > 0 && det.rightDurationMs > 0)) {
        sideBadge = isDutch ? 'Beide' : 'Both';
        sideDetail = isDutch ? 'Beide borsten' : 'Both breasts';
      }

      return {
        icon: Heart,
        badge: sideBadge,
        color: 'var(--color-terracotta)',
        bg: 'var(--color-terracotta-light)',
        detail: dur ? `${sideDetail} · ${dur}` : sideDetail,
      };
    }

    if (ev.type === 'BOTTLE') {
      const vol = formatVolume(det.volumeFloz, preferences.volumeUnit);
      return {
        icon: Milk,
        badge: isDutch ? 'Fles' : 'Bottle',
        color: 'var(--color-caramel)',
        bg: 'var(--color-caramel-light)',
        detail: vol ? `${isDutch ? 'Flesje' : 'Bottle'} · ${vol}` : (isDutch ? 'Flesje' : 'Bottle'),
      };
    }

    if (ev.type === 'SOLIDS') {
      return {
        icon: Apple,
        badge: isDutch ? 'Hapjes' : 'Solids',
        color: 'var(--color-sage)',
        bg: 'var(--color-sage-light)',
        detail: det.food ? (isDutch ? `Hapjes · ${det.food}` : `Solids · ${det.food}`) : (isDutch ? 'Vaste voeding' : 'Solid meal'),
      };
    }

    return {
      icon: Utensils,
      badge: isDutch ? 'Voeding' : 'Feed',
      color: 'var(--color-terracotta)',
      bg: 'var(--color-terracotta-light)',
      detail: isDutch ? 'Voeding' : 'Feed',
    };
  };

  // Format diaper detail
  const getDiaperDetail = (ev) => {
    if (!ev) return isDutch ? 'Nog geen pampers' : 'No diapers yet';
    const det = ev.details || {};
    const parts = [];
    if (det.pee) parts.push(isDutch ? 'Nat' : 'Wet');
    if (det.poop) parts.push(isDutch ? 'Kaka' : 'Dirty');
    if (det.dry) parts.push(isDutch ? 'Droog' : 'Dry');
    return parts.length > 0 ? parts.join(' & ') : (isDutch ? 'Pamper ververst' : 'Diaper change');
  };

  // Format sleep detail
  const getSleepDetail = (ev) => {
    if (!ev) return isDutch ? 'Nog geen slaap' : 'No sleep yet';
    const det = ev.details || {};
    const type = det.sleepType === 'NIGHT' ? (isDutch ? 'Nacht' : 'Night') : (isDutch ? 'Dutje' : 'Nap');
    if (!ev.durationMs && !ev.endDt) {
      return isDutch ? 'Slaapt nu' : 'Sleeping now';
    }
    const dur = formatDurationMs(ev.durationMs, language);
    return dur ? `${type} · ${dur}` : type;
  };

  const babyName = activeChild?.name || (isDutch ? 'Baby' : 'Baby');

  return (
    <div className="hero-glance-card">
      {/* 1. Serene State Indicator (Awake / Sleeping) */}
      <div className="hero-glance-header">
        <div className="hero-state-wrap">
          <div className={`hero-state-badge ${isSleeping ? 'sleeping' : 'awake'}`}>
            {isSleeping ? <Moon size={14} /> : <Sun size={14} />}
            <span>
              {isSleeping
                ? (isDutch ? `${babyName} slaapt` : `${babyName} is Sleeping`)
                : (isDutch ? `${babyName} is wakker` : `${babyName} is Awake`)}
            </span>
          </div>

          <span className="hero-wake-duration">
            {isSleeping ? (
              activeTimers?.sleep?.startMs ? (
                isDutch
                  ? `Begonnen ${formatRelative(activeTimers.sleep.startMs, now, language)}`
                  : `Started ${formatRelative(activeTimers.sleep.startMs, now, language)}`
              ) : (isDutch ? 'Timer actief' : 'Timer active')
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
        {(() => {
          const feedMeta = getFeedMeta(latestFeed);
          const FeedIcon = feedMeta.icon;
          return (
            <button
              type="button"
              className="glance-pill feed"
              onClick={() => openModal(latestFeed ? latestFeed.type : 'BREAST')}
              id="glance-feed-btn"
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '0.2rem' }}>
                <div className="glance-icon-wrap feed" style={{ backgroundColor: feedMeta.bg, color: feedMeta.color, marginBottom: 0 }}>
                  <FeedIcon size={15} />
                </div>
                {feedMeta.badge && (
                  <span
                    style={{
                      fontSize: '0.66rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.45rem',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: feedMeta.bg,
                      color: feedMeta.color,
                      letterSpacing: '0.02em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {feedMeta.badge}
                  </span>
                )}
              </div>
              <div className="glance-content">
                <span className="glance-label">{isDutch ? 'Laatste voeding' : 'Last Fed'}</span>
                <span className="glance-time">
                  {latestFeed ? formatRelative(latestFeed.beginDt, now, language) : '—'}
                </span>
                <span className="glance-sub">{feedMeta.detail}</span>
              </div>
            </button>
          );
        })()}

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
            <span className="glance-label">{isDutch ? 'Laatste pamper' : 'Last Diaper'}</span>
            <span className="glance-time">
              {latestDiaper ? formatRelative(latestDiaper.beginDt, now, language) : '—'}
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
            <span className="glance-label">{isDutch ? 'Laatste slaap' : 'Last Sleep'}</span>
            <span className="glance-time">
              {latestSleep ? formatRelative(latestSleep.endDt || latestSleep.beginDt, now, language) : '—'}
            </span>
            <span className="glance-sub">{getSleepDetail(latestSleep)}</span>
          </div>
        </button>
      </div>
    </div>
  );
}
