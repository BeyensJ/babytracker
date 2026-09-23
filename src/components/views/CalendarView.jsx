import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { toDateKey, formatDateHeading, formatDurationMs, formatVolume, formatTime } from '../../utils/formatters';
import { TimelineItem } from '../TimelineItem';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Moon,
  Utensils,
  Sparkles,
  Plus,
  Clock,
  Layers,
  CalendarDays,
  Info,
} from 'lucide-react';

export function CalendarView() {
  const { events, activeChild, activeChildId, preferences, openModal, t, language } = useApp();

  // Mode: 'week' (multi-day rhythm schedule) or 'month' (month calendar grid)
  const [viewMode, setViewMode] = useState('week');

  // Filter events by active child
  const childEvents = useMemo(() => {
    return events.filter(e => !e.childKey || e.childKey === activeChildId);
  }, [events, activeChildId]);

  // Index events by Date Key ('YYYY-MM-DD')
  const eventsByDate = useMemo(() => {
    const map = {};
    childEvents.forEach(ev => {
      const key = toDateKey(ev.beginDt);
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    });
    return map;
  }, [childEvents]);

  // Selected date key ('YYYY-MM-DD')
  const [selectedDateKey, setSelectedDateKey] = useState(() => {
    const todayKey = toDateKey(Date.now());
    if (eventsByDate[todayKey]) return todayKey;
    if (childEvents.length > 0) return toDateKey(childEvents[0].beginDt);
    return todayKey;
  });

  // Active Week Monday Date object
  const [weekMonday, setWeekMonday] = useState(() => {
    const initial = selectedDateKey ? new Date(selectedDateKey + 'T12:00:00') : new Date();
    // Monday of this week (Mon = 1, Sun = 0)
    const day = initial.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    const mon = new Date(initial);
    mon.setDate(initial.getDate() + diff);
    mon.setHours(0, 0, 0, 0);
    return mon;
  });

  // Active Month Date object for Month Grid view
  const [activeMonth, setActiveMonth] = useState(() => {
    const initial = selectedDateKey ? new Date(selectedDateKey + 'T12:00:00') : new Date();
    return new Date(initial.getFullYear(), initial.getMonth(), 1);
  });

  // --- Week Navigation ---
  const handlePrevWeek = () => {
    setWeekMonday(prev => {
      const next = new Date(prev);
      next.setDate(prev.getDate() - 7);
      return next;
    });
  };

  const handleNextWeek = () => {
    setWeekMonday(prev => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + 7);
      return next;
    });
  };

  const handleJumpToCurrentWeek = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    const mon = new Date(now);
    mon.setDate(now.getDate() + diff);
    mon.setHours(0, 0, 0, 0);
    setWeekMonday(mon);

    const todayKey = toDateKey(now.getTime());
    setSelectedDateKey(todayKey);
  };

  // --- Month Navigation ---
  const handlePrevMonth = () => {
    setActiveMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setActiveMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleJumpToTodayMonth = () => {
    const now = new Date();
    setActiveMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    const todayKey = toDateKey(now.getTime());
    setSelectedDateKey(todayKey);

    const day = now.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    const mon = new Date(now);
    mon.setDate(now.getDate() + diff);
    mon.setHours(0, 0, 0, 0);
    setWeekMonday(mon);
  };

  // --- Day Navigation ---
  const handlePrevDay = () => {
    const d = new Date(selectedDateKey + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    const newKey = toDateKey(d.getTime());
    setSelectedDateKey(newKey);
    if (d.getMonth() !== activeMonth.getMonth() || d.getFullYear() !== activeMonth.getFullYear()) {
      setActiveMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  };

  const handleNextDay = () => {
    const d = new Date(selectedDateKey + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    const newKey = toDateKey(d.getTime());
    setSelectedDateKey(newKey);
    if (d.getMonth() !== activeMonth.getMonth() || d.getFullYear() !== activeMonth.getFullYear()) {
      setActiveMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  };

  // --- 7-Day Week Data with Cross-Midnight Sleep Slices ---
  const weekDaysData = useMemo(() => {
    const days = [];
    const weekdays = language === 'nl' ? ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    for (let i = 0; i < 7; i++) {
      const curDate = new Date(weekMonday);
      curDate.setDate(weekMonday.getDate() + i);
      const dateKey = toDateKey(curDate.getTime());
      const dayStart = new Date(dateKey + 'T00:00:00').getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;

      // Find all events overlapping this 24-hour day window
      const sleepSlices = [];
      const pins = [];
      let totalSleepSliceMs = 0;
      let feedCount = 0;
      let diaperCount = 0;

      childEvents.forEach(ev => {
        const begin = ev.beginDt;
        const end = ev.endDt || (ev.durationMs ? begin + ev.durationMs : begin + 30 * 60 * 1000);

        if (ev.type === 'SLEEP') {
          // Check if sleep overlaps this day (including cross-midnight overnight sleeps!)
          if (begin < dayEnd && end > dayStart) {
            const sliceStart = Math.max(dayStart, begin);
            const sliceEnd = Math.min(dayEnd, end);
            const durMs = Math.max(0, sliceEnd - sliceStart);
            totalSleepSliceMs += durMs;

            const startMin = (sliceStart - dayStart) / (60 * 1000);
            const durMin = durMs / (60 * 1000);
            const leftPct = (startMin / 1440) * 100;
            const widthPct = Math.max(0.7, (durMin / 1440) * 100);

            const continuesFromPrev = begin < dayStart;
            const continuesToNext = end > dayEnd;
            const totalDurMs = end - begin;

            sleepSlices.push({
              id: `${ev.id}_slice_${i}`,
              eventId: ev.id,
              leftPct,
              widthPct,
              sliceDurMs: durMs,
              totalDurMs,
              continuesFromPrev,
              continuesToNext,
              fullTimeStr: `${formatTime(begin, language)} – ${formatTime(end, language)}`,
              caregiver: ev.details?.caregiver,
              isNight: ev.details?.sleepType === 'NIGHT' || continuesFromPrev || continuesToNext,
            });
          }
        } else {
          // Point events on this day
          if (begin >= dayStart && begin < dayEnd) {
            const minFromMidnight = (begin - dayStart) / (60 * 1000);
            const leftPct = (minFromMidnight / 1440) * 100;

            let pinType = 'other';
            if (['BREAST', 'BOTTLE', 'SOLIDS', 'COMBO'].includes(ev.type)) {
              pinType = 'feed';
              feedCount++;
            } else if (ev.type === 'DIAPER') {
              pinType = 'diaper';
              diaperCount++;
            }

            pins.push({
              id: ev.id,
              leftPct,
              type: pinType,
              evType: ev.type,
              timeStr: formatTime(begin, language),
              note: ev.note,
            });
          }
        }
      });

      days.push({
        weekdayName: weekdays[i],
        dayNum: curDate.getDate(),
        dateKey,
        isToday: dateKey === toDateKey(Date.now()),
        sleepSlices,
        pins,
        totalSleepSliceMs,
        feedCount,
        diaperCount,
      });
    }

    return days;
  }, [weekMonday, childEvents, language]);

  // Week header range string (e.g. "Sep 15 – Sep 21, 2026")
  const weekRangeTitle = useMemo(() => {
    const sunday = new Date(weekMonday);
    sunday.setDate(weekMonday.getDate() + 6);

    const loc = language === 'nl' ? 'nl-BE' : 'en-US';
    const m1 = weekMonday.toLocaleDateString(loc, { month: 'short', day: 'numeric' });
    const m2 = sunday.toLocaleDateString(loc, { month: 'short', day: 'numeric', year: 'numeric' });
    return `${m1} – ${m2}`;
  }, [weekMonday, language]);

  // Aggregate stats for the 7-day week
  const weekTotals = useMemo(() => {
    let totalSleepMs = 0;
    let totalFeeds = 0;
    let totalDiapers = 0;
    let nightSleepTotalMs = 0;
    let nightSleepCount = 0;

    weekDaysData.forEach(day => {
      totalSleepMs += day.totalSleepSliceMs;
      totalFeeds += day.feedCount;
      totalDiapers += day.diaperCount;

      day.sleepSlices.forEach(s => {
        if (s.isNight) {
          nightSleepTotalMs += s.sliceDurMs;
          nightSleepCount++;
        }
      });
    });

    const avgSleepPerDayMs = Math.round(totalSleepMs / 7);
    const avgNightSleepMs = nightSleepCount > 0 ? Math.round(nightSleepTotalMs / 7) : 0;

    return {
      totalSleepFormatted: `${(totalSleepMs / 3600000).toFixed(1)}h`,
      avgSleepFormatted: `${(avgSleepPerDayMs / 3600000).toFixed(1)}h ${language === 'nl' ? '/ dag' : '/ day'}`,
      avgNightFormatted: `${(avgNightSleepMs / 3600000).toFixed(1)}h ${language === 'nl' ? '/ nacht' : '/ night'}`,
      totalFeeds,
      totalDiapers,
    };
  }, [weekDaysData, language]);

  // --- Month Calendar Days (Mon - Sun) ---
  const monthYear = activeMonth.getFullYear();
  const monthIdx = activeMonth.getMonth();
  const monthName = activeMonth.toLocaleDateString(language === 'nl' ? 'nl-BE' : 'en-US', { month: 'long', year: 'numeric' });

  const monthCalendarDays = useMemo(() => {
    const daysInCurrentMonth = new Date(monthYear, monthIdx + 1, 0).getDate();
    let firstDayIndex = new Date(monthYear, monthIdx, 1).getDay() - 1;
    if (firstDayIndex === -1) firstDayIndex = 6;

    const days = [];
    const prevMonthDays = new Date(monthYear, monthIdx, 0).getDate();

    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const prevDate = new Date(monthYear, monthIdx - 1, dayNum);
      days.push({
        dayNum,
        dateKey: toDateKey(prevDate.getTime()),
        isCurrentMonth: false,
      });
    }

    const todayKey = toDateKey(Date.now());
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const curDate = new Date(monthYear, monthIdx, d);
      const dateKey = toDateKey(curDate.getTime());
      const dayEvs = eventsByDate[dateKey] || [];

      days.push({
        dayNum: d,
        dateKey,
        isCurrentMonth: true,
        isToday: dateKey === todayKey,
        hasFeed: dayEvs.some(e => ['BREAST', 'BOTTLE', 'SOLIDS', 'COMBO'].includes(e.type)),
        hasSleep: dayEvs.some(e => e.type === 'SLEEP'),
        hasDiaper: dayEvs.some(e => e.type === 'DIAPER'),
        hasOther: dayEvs.some(e => ['GROWTH', 'HEALTH', 'ROUTINE', 'MILESTONE', 'NOTE'].includes(e.type)),
      });
    }

    const totalCells = Math.ceil(days.length / 7) * 7;
    const remaining = totalCells - days.length;
    for (let nextDay = 1; nextDay <= remaining; nextDay++) {
      const nextDate = new Date(monthYear, monthIdx + 1, nextDay);
      days.push({
        dayNum: nextDay,
        dateKey: toDateKey(nextDate.getTime()),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [monthYear, monthIdx, eventsByDate]);

  // Selected Day's events
  const selectedEvents = useMemo(() => {
    return (eventsByDate[selectedDateKey] || []).sort((a, b) => b.beginDt - a.beginDt);
  }, [eventsByDate, selectedDateKey]);

  // Daily statistics for selected day
  const dayStats = useMemo(() => {
    let totalSleepMs = 0;
    let napCount = 0;
    let totalNursingMs = 0;
    let totalBottleFloz = 0;
    let feedCount = 0;
    let wetDiapers = 0;
    let dirtyDiapers = 0;

    selectedEvents.forEach(ev => {
      const det = ev.details || {};
      if (ev.type === 'SLEEP') {
        const dur = ev.durationMs || (ev.endDt ? ev.endDt - ev.beginDt : 0);
        totalSleepMs += dur;
        napCount++;
      } else if (ev.type === 'BREAST' || ev.type === 'COMBO') {
        feedCount++;
        totalNursingMs += (det.leftDurationMs || 0) + (det.rightDurationMs || 0) || ev.durationMs || 0;
      } else if (ev.type === 'BOTTLE') {
        feedCount++;
        totalBottleFloz += det.volumeFloz || 0;
      } else if (ev.type === 'SOLIDS') {
        feedCount++;
      } else if (ev.type === 'DIAPER') {
        if (det.pee) wetDiapers++;
        if (det.poop) dirtyDiapers++;
      }
    });

    return {
      totalSleepMs,
      napCount,
      totalNursingMs,
      totalBottleFloz,
      feedCount,
      diaperTotal: wetDiapers + dirtyDiapers,
      wetDiapers,
      dirtyDiapers,
    };
  }, [selectedEvents]);

  // 24-Hour Day Rhythm calculations for selected date (used in Month view)
  const selectedDayRhythm = useMemo(() => {
    if (!selectedDateKey) return { sleepBlocks: [], eventPins: [] };

    const dayStart = new Date(selectedDateKey + 'T00:00:00').getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;

    const sleepBlocks = [];
    const eventPins = [];

    childEvents.forEach(ev => {
      const begin = ev.beginDt;
      const end = ev.endDt || (ev.durationMs ? begin + ev.durationMs : begin + 30 * 60 * 1000);

      if (ev.type === 'SLEEP') {
        if (begin < dayEnd && end > dayStart) {
          const sliceStart = Math.max(dayStart, begin);
          const sliceEnd = Math.min(dayEnd, end);
          const durMs = Math.max(0, sliceEnd - sliceStart);

          const startMin = (sliceStart - dayStart) / (60 * 1000);
          const durMin = durMs / (60 * 1000);
          const leftPct = (startMin / 1440) * 100;
          const widthPct = Math.max(0.8, (durMin / 1440) * 100);

          const continuesFromPrev = begin < dayStart;
          const continuesToNext = end > dayEnd;

          sleepBlocks.push({
            id: `${ev.id}_selected_slice`,
            leftPct,
            widthPct,
            sliceDurMs: durMs,
            totalDurMs: end - begin,
            continuesFromPrev,
            continuesToNext,
            timeStr: `${formatTime(sliceStart)} – ${formatTime(sliceEnd)}`,
            fullTimeStr: `${formatTime(begin)} – ${formatTime(end)}`,
            isNight: ev.details?.sleepType === 'NIGHT' || continuesFromPrev || continuesToNext,
          });
        }
      } else {
        if (begin >= dayStart && begin < dayEnd) {
          const minFromMidnight = (begin - dayStart) / (60 * 1000);
          const leftPct = (minFromMidnight / 1440) * 100;

          let pinType = 'other';
          if (['BREAST', 'BOTTLE', 'SOLIDS', 'COMBO'].includes(ev.type)) pinType = 'feed';
          else if (ev.type === 'DIAPER') pinType = 'diaper';

          eventPins.push({
            id: ev.id,
            leftPct,
            type: pinType,
            evType: ev.type,
            timeStr: formatTime(begin),
            note: ev.note,
          });
        }
      }
    });

    return { sleepBlocks, eventPins };
  }, [childEvents, selectedDateKey]);

  const weekdays = language === 'nl' ? ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="calendar-view-container">
      {/* Top Header & View Mode Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2>{language === 'nl' ? 'Kalender & Slaapritme' : 'Calendar & Rhythm'}</h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {language === 'nl' ? `Schema & meerdaags slaapritme voor ${activeChild?.name || 'baby'}` : `Schedule & multi-day sleep rhythm for ${activeChild?.name || 'Baby'}`}
          </span>
        </div>

        {/* View Mode Toggle: Day, Week, Month */}
        <div className="calendar-view-toggle">
          <button
            className={`calendar-toggle-btn ${viewMode === 'day' ? 'active' : ''}`}
            onClick={() => setViewMode('day')}
            id="view-toggle-day"
          >
            <Clock size={14} style={{ display: 'inline', marginRight: 5, verticalAlign: -1 }} />
            {t('calendar.viewDay')}
          </button>
          <button
            className={`calendar-toggle-btn ${viewMode === 'week' ? 'active' : ''}`}
            onClick={() => setViewMode('week')}
            id="view-toggle-week"
          >
            <Layers size={14} style={{ display: 'inline', marginRight: 5, verticalAlign: -1 }} />
            {language === 'nl' ? 'Weekritme' : 'Week Rhythm'}
          </button>
          <button
            className={`calendar-toggle-btn ${viewMode === 'month' ? 'active' : ''}`}
            onClick={() => setViewMode('month')}
            id="view-toggle-month"
          >
            <CalendarDays size={14} style={{ display: 'inline', marginRight: 5, verticalAlign: -1 }} />
            {language === 'nl' ? 'Maandoverzicht' : 'Month Grid'}
          </button>
        </div>
      </div>

      {/* ========================================================
          MODE 0: DEDICATED DAY VIEW NAVIGATION BAR
          ======================================================== */}
      {viewMode === 'day' && (
        <div className="calendar-card" style={{ padding: '0.85rem 1.25rem' }}>
          <div className="calendar-nav-bar">
            <div className="calendar-month-title">
              <Clock size={18} color="var(--color-slate)" />
              <span>{formatDateHeading(selectedDateKey, language)}</span>
            </div>

            <div className="calendar-nav-controls">
              <button className="calendar-today-btn" onClick={handleJumpToTodayMonth}>
                {t('summary.today')}
              </button>
              <button className="calendar-icon-btn" onClick={handlePrevDay} aria-label={language === 'nl' ? 'Vorige dag' : 'Previous day'}>
                <ChevronLeft size={18} />
              </button>
              <button className="calendar-icon-btn" onClick={handleNextDay} aria-label={language === 'nl' ? 'Volgende dag' : 'Next day'}>
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODE 1: 7-DAY WEEK OVERVIEW (MULTI-DAY RHYTHM)
          ======================================================== */}
      {viewMode === 'week' && (
        <div className="week-overview-card">
          {/* Week Navigation Header */}
          <div className="calendar-nav-bar">
            <div className="calendar-month-title">
              <Clock size={18} color="var(--color-slate)" />
              <span>{weekRangeTitle}</span>
            </div>

            <div className="calendar-nav-controls">
              <button className="calendar-today-btn" onClick={handleJumpToCurrentWeek}>
                {language === 'nl' ? 'Deze week' : 'This Week'}
              </button>
              <button className="calendar-icon-btn" onClick={handlePrevWeek} aria-label={language === 'nl' ? 'Vorige week' : 'Previous week'}>
                <ChevronLeft size={18} />
              </button>
              <button className="calendar-icon-btn" onClick={handleNextWeek} aria-label={language === 'nl' ? 'Volgende week' : 'Next week'}>
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Week Aggregate Stats Strip */}
          <div className="week-summary-strip">
            <div className="week-summary-box">
              <span className="week-summary-label">{t('summary.totalSleep')}</span>
              <span className="week-summary-val" style={{ color: 'var(--color-slate)' }}>{weekTotals.totalSleepFormatted}</span>
            </div>
            <div className="week-summary-box">
              <span className="week-summary-label">{language === 'nl' ? 'Dagelijks gem.' : 'Daily Avg'}</span>
              <span className="week-summary-val">{weekTotals.avgSleepFormatted}</span>
            </div>
            <div className="week-summary-box">
              <span className="week-summary-label">{language === 'nl' ? 'Gem. nachtslaap' : 'Night Sleep Avg'}</span>
              <span className="week-summary-val">{weekTotals.avgNightFormatted}</span>
            </div>
            <div className="week-summary-box">
              <span className="week-summary-label">{language === 'nl' ? 'Voedingen gelogd' : 'Feeds Tracked'}</span>
              <span className="week-summary-val" style={{ color: 'var(--color-terracotta)' }}>{weekTotals.totalFeeds}</span>
            </div>
          </div>

          {/* Multi-Day 24-Hour Rhythm Stack */}
          <div className="week-rhythm-stack">
            {/* Top Hour Ruler */}
            <div className="week-rhythm-ruler">
              <div className="week-ruler-ticks">
                <span>00:00</span>
                <span>04:00</span>
                <span>08:00</span>
                <span>12:00</span>
                <span>16:00</span>
                <span>20:00</span>
                <span>24:00</span>
              </div>
            </div>

            {/* 7 Daily Rows */}
            {weekDaysData.map(day => {
              const isSelected = day.dateKey === selectedDateKey;
              const sleepHours = (day.totalSleepSliceMs / 3600000).toFixed(1);

              return (
                <div
                  key={day.dateKey}
                  className={`week-day-row ${isSelected ? 'is-selected' : ''} ${day.isToday ? 'is-today' : ''}`}
                  onClick={() => setSelectedDateKey(day.dateKey)}
                  title={`Click to view ${day.weekdayName} (${day.dateKey})`}
                >
                  {/* Left Label */}
                  <div className="week-day-info">
                    <div className="week-day-name">
                      <span>{day.weekdayName}</span>
                      <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>{day.dayNum}</span>
                    </div>
                    <span className="week-day-badge">
                      {sleepHours > 0 ? `${sleepHours}h` : '0h'}
                    </span>
                  </div>

                  {/* 24-Hour Track */}
                  <div className="week-day-track">
                    {/* Sleep Blocks (Handles cross-midnight continuity!) */}
                    {day.sleepSlices.map(s => {
                      let classes = 'week-sleep-block';
                      if (s.continuesNext) classes += ' continues-next';
                      if (s.continuesFromPrev) classes += ' continues-prev';

                      const tooltipText = s.continuesNext
                        ? `Overnight Sleep: starts ${s.fullTimeStr} (Continues into next day ▶)`
                        : s.continuesFromPrev
                        ? `Overnight Sleep: ends ${s.fullTimeStr} (◀ Continued from previous night)`
                        : `Sleep: ${s.fullTimeStr} (${formatDurationMs(s.totalDurMs)})`;

                      return (
                        <div
                          key={s.id}
                          className={classes}
                          style={{
                            left: `${s.leftPct}%`,
                            width: `${s.widthPct}%`,
                          }}
                          title={tooltipText}
                        />
                      );
                    })}

                    {/* Feed & Diaper Pins */}
                    {day.pins.map(pin => (
                      <div
                        key={pin.id}
                        className={`day-rhythm-event-pin pin-${pin.type}`}
                        style={{ left: `${pin.leftPct}%` }}
                        title={`${pin.evType} at ${pin.timeStr}${pin.note ? ` (${pin.note})` : ''}`}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Rhythm Legend */}
          <div className="day-rhythm-legend" style={{ justifyContent: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.65rem' }}>
            <div className="legend-item">
              <div className="legend-swatch" style={{ backgroundColor: 'var(--color-slate)', width: 14, height: 8 }} />
              <span>{language === 'nl' ? 'Slaapblokken' : 'Sleep Stretches'}</span>
            </div>
            <div className="legend-item">
              <span className="spanning-overnight-indicator">
                {language === 'nl' ? '◀ ── ▶ Loopt over middernacht' : '◀ ── ▶ Spans Across Midnight'}
              </span>
            </div>
            <div className="legend-item">
              <div className="legend-swatch" style={{ backgroundColor: 'var(--color-terracotta)', width: 4, height: 12 }} />
              <span>{language === 'nl' ? 'Voedingen' : 'Feeds'}</span>
            </div>
            <div className="legend-item">
              <div className="legend-swatch" style={{ backgroundColor: 'var(--color-caramel)', width: 4, height: 12 }} />
              <span>{language === 'nl' ? 'Pampers' : 'Diapers'}</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODE 2: MONTH CALENDAR GRID
          ======================================================== */}
      {viewMode === 'month' && (
        <div className="calendar-card">
          {/* Month Navigation Header */}
          <div className="calendar-nav-bar">
            <div className="calendar-month-title">
              <CalendarIcon size={18} color="var(--color-terracotta)" />
              <span>{monthName}</span>
            </div>

            <div className="calendar-nav-controls">
              <button className="calendar-today-btn" onClick={handleJumpToTodayMonth}>
                {t('summary.today')}
              </button>
              <button className="calendar-icon-btn" onClick={handlePrevMonth} aria-label={language === 'nl' ? 'Vorige maand' : 'Previous month'}>
                <ChevronLeft size={18} />
              </button>
              <button className="calendar-icon-btn" onClick={handleNextMonth} aria-label={language === 'nl' ? 'Volgende maand' : 'Next month'}>
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="calendar-grid">
            {weekdays.map(day => (
              <div key={day} className="calendar-weekday">
                {day}
              </div>
            ))}

            {monthCalendarDays.map((day, idx) => {
              const isSelected = day.dateKey === selectedDateKey;

              return (
                <div
                  key={idx}
                  className={`calendar-day-cell ${!day.isCurrentMonth ? 'outside-month' : ''} ${
                    day.isToday ? 'is-today' : ''
                  } ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => day.isCurrentMonth && setSelectedDateKey(day.dateKey)}
                >
                  <span className="calendar-day-number">{day.dayNum}</span>

                  {day.isCurrentMonth && (
                    <div className="calendar-dot-row">
                      {day.hasFeed && <div className="calendar-dot dot-feed" title={language === 'nl' ? 'Voedingen' : 'Feeds'} />}
                      {day.hasSleep && <div className="calendar-dot dot-sleep" title={language === 'nl' ? 'Slaap' : 'Sleep'} />}
                      {day.hasDiaper && <div className="calendar-dot dot-diaper" title={language === 'nl' ? 'Pampers' : 'Diaper'} />}
                      {day.hasOther && <div className="calendar-dot dot-other" title={language === 'nl' ? 'Metingen / Eerste keren' : 'Health/Growth/Milestone'} />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Month Legend */}
          <div className="day-rhythm-legend" style={{ justifyContent: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.65rem' }}>
            <div className="legend-item">
              <div className="legend-swatch" style={{ backgroundColor: 'var(--color-terracotta)' }} />
              <span>{language === 'nl' ? 'Voedingen' : 'Feeds'}</span>
            </div>
            <div className="legend-item">
              <div className="legend-swatch" style={{ backgroundColor: 'var(--color-slate)' }} />
              <span>{language === 'nl' ? 'Slaap' : 'Sleep'}</span>
            </div>
            <div className="legend-item">
              <div className="legend-swatch" style={{ backgroundColor: 'var(--color-caramel)' }} />
              <span>{language === 'nl' ? 'Pampers' : 'Diapers'}</span>
            </div>
            <div className="legend-item">
              <div className="legend-swatch" style={{ backgroundColor: 'var(--color-sage)' }} />
              <span>{language === 'nl' ? 'Metingen / Mijlpalen' : 'Growth / Firsts'}</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          24-HOUR DAY RHYTHM VISUALIZER
          Rendered on the Month page (and Day page)
          ======================================================== */}
      {(viewMode === 'month' || viewMode === 'day') && (
        <div className="day-rhythm-card" id="day-rhythm-schedule-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: 'rgba(84, 108, 126, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-slate)' }}>
                <Clock size={16} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                  {language === 'nl' ? 'Dagschema & Slaapritme' : 'Day Rhythm Schedule'}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                  {language === 'nl' ? `24-uurs visueel verloop voor ${formatDateHeading(selectedDateKey, language)}` : `24-hour visual timeline for ${formatDateHeading(selectedDateKey)}`}
                </div>
              </div>
            </div>

            {/* Quick badges for the day */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', flexWrap: 'wrap' }}>
              {dayStats.totalSleepMs > 0 && (
                <span style={{ padding: '0.2rem 0.55rem', borderRadius: '12px', background: 'rgba(84, 108, 126, 0.12)', color: 'var(--color-slate)', fontWeight: 600 }}>
                  🌙 {formatDurationMs(dayStats.totalSleepMs, language)}
                </span>
              )}
              {dayStats.feedCount > 0 && (
                <span style={{ padding: '0.2rem 0.55rem', borderRadius: '12px', background: 'rgba(206, 107, 76, 0.12)', color: 'var(--color-terracotta)', fontWeight: 600 }}>
                  🍼 {dayStats.feedCount} {language === 'nl' ? (dayStats.feedCount === 1 ? 'voeding' : 'voedingen') : (dayStats.feedCount === 1 ? 'feed' : 'feeds')}
                </span>
              )}
              {dayStats.diaperTotal > 0 && (
                <span style={{ padding: '0.2rem 0.55rem', borderRadius: '12px', background: 'rgba(196, 135, 68, 0.12)', color: 'var(--color-caramel)', fontWeight: 600 }}>
                  ✨ {dayStats.diaperTotal} {language === 'nl' ? (dayStats.diaperTotal === 1 ? 'pamper' : 'pampers') : (dayStats.diaperTotal === 1 ? 'diaper' : 'diapers')}
                </span>
              )}
            </div>
          </div>

          {/* 24-Hour Visual Schedule Ribbon */}
          <div className="day-rhythm-track-wrap">
            <div className="day-rhythm-track">
              {/* Empty state notice if no activities */}
              {selectedDayRhythm.sleepBlocks.length === 0 && selectedDayRhythm.eventPins.length === 0 && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '0.75rem', color: 'var(--text-tertiary)', pointerEvents: 'none' }}>
                  {language === 'nl' ? 'Geen activiteitenritme geregistreerd voor deze dag' : 'No activity rhythm recorded for this day'}
                </div>
              )}

              {/* Sleep blocks with cross-midnight continuity indicators */}
              {selectedDayRhythm.sleepBlocks.map(block => (
                <div
                  key={block.id}
                  className={`day-rhythm-sleep-block ${block.continuesToNext ? 'continues-next' : ''} ${block.continuesFromPrev ? 'continues-prev' : ''}`}
                  style={{
                    left: `${block.leftPct}%`,
                    width: `${block.widthPct}%`,
                  }}
                  title={`${block.isNight ? (language === 'nl' ? 'Nachtslaap' : 'Night Sleep') : (language === 'nl' ? 'Dutje' : 'Nap')}: ${block.fullTimeStr || block.timeStr} (${(block.sliceDurMs / 3600000).toFixed(1)}h)${
                    block.continuesToNext ? (language === 'nl' ? ' • Loopt door in de nacht' : ' • Continues overnight into next day') : ''
                  }${block.continuesFromPrev ? (language === 'nl' ? ' • Begon de vorige nacht' : ' • Continued from previous day') : ''}`}
                >
                  {block.widthPct > 7 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        fontSize: '0.62rem',
                        color: '#FAF7F2',
                        whiteSpace: 'nowrap',
                        fontWeight: 600,
                        pointerEvents: 'none',
                        textShadow: '0 1px 2px rgba(0,0,0,0.35)',
                      }}
                    >
                      {(block.sliceDurMs / 3600000).toFixed(1)}h
                    </span>
                  )}
                </div>
              ))}

              {/* Feed, Diaper, and Activity Pins */}
              {selectedDayRhythm.eventPins.map(pin => (
                <div
                  key={pin.id}
                  className={`day-rhythm-event-pin pin-${pin.type}`}
                  style={{ left: `${pin.leftPct}%` }}
                  title={`${pin.evType} at ${pin.timeStr}${pin.note ? ': ' + pin.note : ''}`}
                />
              ))}
            </div>

            {/* 24-Hour Time Ticks */}
            <div className="day-rhythm-ticks">
              <span>00:00</span>
              <span>03:00</span>
              <span>06:00</span>
              <span>09:00</span>
              <span>12:00</span>
              <span>15:00</span>
              <span>18:00</span>
              <span>21:00</span>
              <span>24:00</span>
            </div>
          </div>

          {/* Legend and Overnight Indicator */}
          <div className="day-rhythm-legend" style={{ justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem', marginTop: '0.2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
              <div className="legend-item">
                <div className="legend-swatch" style={{ backgroundColor: 'var(--color-slate)' }} />
                <span>{language === 'nl' ? 'Slaapblok' : 'Sleep Stretch'}</span>
              </div>
              <div className="legend-item">
                <div className="legend-swatch" style={{ backgroundColor: 'var(--color-terracotta)' }} />
                <span>{language === 'nl' ? 'Voeding' : 'Feeding Pin'}</span>
              </div>
              <div className="legend-item">
                <div className="legend-swatch" style={{ backgroundColor: 'var(--color-caramel)' }} />
                <span>{language === 'nl' ? 'Pamper' : 'Diaper Pin'}</span>
              </div>
            </div>

            {selectedDayRhythm.sleepBlocks.some(b => b.continuesFromPrev || b.continuesToNext) && (
              <span style={{ fontSize: '0.72rem', color: 'var(--color-slate)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Info size={12} />
                {language === 'nl' ? 'Onderbroken randen duiden op nachtslaap over middernacht' : 'Dashed borders indicate overnight sleep spanning across midnight'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          SELECTED DAY INSPECTOR & CHRONOLOGICAL ACTIVITY FEED
          ======================================================== */}
      {/* 1. Daily Summary Cards for Selected Date */}
      <div className="day-stats-grid">
        {/* Sleep Card */}
        <div className="trend-card" style={{ padding: '0.85rem 1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-slate)', fontSize: '0.78rem', fontWeight: 600 }}>
            <Moon size={15} />
            <span>{language === 'nl' ? `Slaap op ${formatDateHeading(selectedDateKey, language)}` : `Sleep on ${formatDateHeading(selectedDateKey)}`}</span>
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: '0.25rem', color: 'var(--text-primary)' }}>
            {dayStats.totalSleepMs > 0 ? formatDurationMs(dayStats.totalSleepMs, language) : '0m'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            {dayStats.napCount} {language === 'nl' ? (dayStats.napCount === 1 ? 'slaapblok' : 'slaapblokken') : (dayStats.napCount === 1 ? 'sleep stretch' : 'sleep stretches')}
          </div>
        </div>

        {/* Feeding Card */}
        <div className="trend-card" style={{ padding: '0.85rem 1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-terracotta)', fontSize: '0.78rem', fontWeight: 600 }}>
            <Utensils size={15} />
            <span>{t('categories.feeding')}</span>
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: '0.25rem', color: 'var(--text-primary)' }}>
            {dayStats.totalNursingMs > 0
              ? formatDurationMs(dayStats.totalNursingMs, language)
              : dayStats.totalBottleFloz > 0
              ? formatVolume(dayStats.totalBottleFloz, preferences.volumeUnit)
              : '0m'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            {dayStats.feedCount} {language === 'nl' ? (dayStats.feedCount === 1 ? 'voeding' : 'voedingen') : (dayStats.feedCount === 1 ? 'session' : 'sessions')}
          </div>
        </div>

        {/* Diapers Card */}
        <div className="trend-card" style={{ padding: '0.85rem 1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-caramel)', fontSize: '0.78rem', fontWeight: 600 }}>
            <Sparkles size={15} />
            <span>{t('categories.diaper')}</span>
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: '0.25rem', color: 'var(--text-primary)' }}>
            {dayStats.diaperTotal}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            {dayStats.wetDiapers} {language === 'nl' ? 'nat' : 'wet'} • {dayStats.dirtyDiapers} {language === 'nl' ? 'kaka' : 'dirty'}
          </div>
        </div>
      </div>

      {/* 2. Selected Day's Chronological Feed */}
      <section className="timeline-section" style={{ marginTop: '0.5rem' }}>
        <div className="timeline-header">
          <div className="section-label" style={{ margin: 0 }}>
            <span>{formatDateHeading(selectedDateKey, language)} ({selectedEvents.length} {language === 'nl' ? 'activiteiten' : 'activities'})</span>
          </div>

          <button
            className="btn-primary"
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
            onClick={() => {
              const [y, m, d] = selectedDateKey.split('-').map(Number);
              const customDate = new Date(y, m - 1, d, 12, 0).getTime();
              openModal('BREAST', { beginDt: customDate });
            }}
          >
            <Plus size={14} style={{ marginRight: 4 }} />
            {language === 'nl' ? 'Op deze datum loggen' : 'Log on this Date'}
          </button>
        </div>

        {selectedEvents.length === 0 ? (
          <div className="timeline-empty" style={{ padding: '2rem 1rem' }}>
            <div className="empty-icon-wrap" style={{ width: 44, height: 44 }}>
              <CalendarIcon size={20} />
            </div>
            <h3 style={{ fontSize: '0.95rem' }}>{language === 'nl' ? 'Geen activiteiten geregistreerd op deze datum' : 'No activities logged on this date'}</h3>
            <p style={{ fontSize: '0.8rem' }}>
              {language === 'nl'
                ? 'Kies een andere dag op het schema of tik op "Op deze datum loggen" om te beginnen.'
                : 'Select another day on the schedule or tap "Log on this Date" to add an entry.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {selectedEvents.map(ev => (
              <TimelineItem key={ev.id} event={ev} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
