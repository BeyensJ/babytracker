import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { formatRelative, formatDurationMs, formatVolume } from '../utils/formatters';
import { Utensils, Moon, Sparkles } from 'lucide-react';

export function QuickStatusBanner() {
  const { events, activeChildId, preferences, openModal } = useApp();
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

  // Format feed detail
  const getFeedDetail = (ev) => {
    if (!ev) return 'None logged';
    const det = ev.details || {};
    if (ev.type === 'BREAST') {
      const dur = formatDurationMs((det.leftDurationMs || 0) + (det.rightDurationMs || 0) || ev.durationMs);
      return dur ? `Breast (${dur})` : `Breast (${det.side || 'Nurse'})`;
    }
    if (ev.type === 'BOTTLE') {
      const vol = formatVolume(det.volumeFloz, preferences.volumeUnit);
      return `Bottle (${vol})`;
    }
    if (ev.type === 'SOLIDS') {
      return det.food ? `Solid (${det.food})` : 'Solid Meal';
    }
    if (ev.type === 'COMBO') {
      const vol = formatVolume(det.volumeFloz, preferences.volumeUnit);
      return `Combo (${vol})`;
    }
    return 'Feed';
  };

  // Format diaper detail
  const getDiaperDetail = (ev) => {
    if (!ev) return 'None logged';
    const det = ev.details || {};
    const parts = [];
    if (det.pee) parts.push('Wet');
    if (det.poop) parts.push('Dirty');
    if (det.dry) parts.push('Dry');
    return parts.length > 0 ? parts.join('/') : 'Diaper';
  };

  // Format sleep detail
  const getSleepDetail = (ev) => {
    if (!ev) return 'None logged';
    const det = ev.details || {};
    const type = det.sleepType === 'NIGHT' ? 'Night' : 'Nap';
    if (!ev.durationMs && !ev.endDt) {
      return 'Sleeping now';
    }
    const dur = formatDurationMs(ev.durationMs);
    return dur ? `${type} (${dur})` : type;
  };

  return (
    <div className="quick-status-strip">
      {/* Last Fed Card */}
      <div className="status-card feed" onClick={() => openModal(latestFeed ? latestFeed.type : 'BREAST')}>
        <div className="status-card-header">
          <span>Last Fed</span>
          <Utensils size={13} color="var(--color-terracotta)" />
        </div>
        <div className="status-card-time">
          {latestFeed ? formatRelative(latestFeed.beginDt, now) : '—'}
        </div>
        <div className="status-card-detail">
          {getFeedDetail(latestFeed)}
        </div>
      </div>

      {/* Last Diaper Card */}
      <div className="status-card diaper" onClick={() => openModal('DIAPER')}>
        <div className="status-card-header">
          <span>Last Diaper</span>
          <Sparkles size={13} color="var(--color-caramel)" />
        </div>
        <div className="status-card-time">
          {latestDiaper ? formatRelative(latestDiaper.beginDt, now) : '—'}
        </div>
        <div className="status-card-detail">
          {getDiaperDetail(latestDiaper)}
        </div>
      </div>

      {/* Last Sleep Card */}
      <div className="status-card sleep" onClick={() => openModal('SLEEP')}>
        <div className="status-card-header">
          <span>Last Sleep</span>
          <Moon size={13} color="var(--color-slate)" />
        </div>
        <div className="status-card-time">
          {latestSleep ? formatRelative(latestSleep.endDt || latestSleep.beginDt, now) : '—'}
        </div>
        <div className="status-card-detail">
          {getSleepDetail(latestSleep)}
        </div>
      </div>
    </div>
  );
}
