/**
 * Computes advanced analytics and trends over 1d, 7d, 14d, and 30d windows.
 */

export function calculateTrends(events, days = 7, childKey = null) {
  const isLifetime = days === 'all' || days === 'lifetime';
  const nowMs = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // Filter events by child first
  const childEvents = events.filter(ev => {
    if (childKey && ev.childKey && ev.childKey !== childKey) return false;
    return true;
  });

  let numDays = 7;
  let windowStartMs = nowMs - 7 * dayMs;

  if (isLifetime) {
    if (childEvents.length > 0) {
      const earliestMs = Math.min(...childEvents.map(e => e.beginDt));
      numDays = Math.max(1, Math.ceil((nowMs - earliestMs) / dayMs));
      windowStartMs = earliestMs;
    }
  } else {
    numDays = typeof days === 'number' ? days : (parseInt(String(days).replace(/[^0-9]/g, ''), 10) || 7);
    windowStartMs = nowMs - numDays * dayMs;
  }

  // Filter by timeframe
  const filtered = childEvents.filter(ev => ev.beginDt >= windowStartMs);

  // Sort chronologically ascending to calculate intervals and gaps
  const sorted = [...filtered].sort((a, b) => a.beginDt - b.beginDt);

  const stats = {
    timeframeDays: numDays,
    isLifetime,
    eventCount: filtered.length,
    feed: {
      totalCount: 0,
      breastSessions: 0,
      totalBreastMs: 0,
      leftBreastMs: 0,
      rightBreastMs: 0,
      avgBreastSessionMs: 0,
      bottleCount: 0,
      totalBottleFloz: 0,
      avgBottleFloz: 0,
      formulaFloz: 0,
      breastMilkFloz: 0,
      solidsCount: 0,
      intervals: [],
      avgIntervalMs: 0,
    },
    sleep: {
      totalSleepMs: 0,
      daySleepMs: 0,
      nightSleepMs: 0,
      napCount: 0,
      avgNapMs: 0,
      longestSleepMs: 0,
      wakeWindows: [],
      avgWakeWindowMs: 0,
    },
    diaper: {
      total: 0,
      wet: 0,
      dirty: 0,
      blowouts: 0,
      avgPerDay: 0,
    },
    tummy: {
      sessions: 0,
      totalMs: 0,
    },
    growth: [],
    // Daily buckets for chart rendering
    dailySeries: [],
  };

  // Helper to check if hour is daytime (6:00 AM to 6:00 PM)
  const isDaytime = (ts) => {
    const hour = new Date(ts).getHours();
    return hour >= 6 && hour < 18;
  };

  let lastFeedStartMs = null;
  let lastSleepEndMs = null;

  sorted.forEach(ev => {
    const begin = ev.beginDt;
    const end = ev.endDt || begin + (ev.durationMs || 0);
    const dur = Math.max(0, end - begin);
    const daytime = isDaytime(begin);
    const det = ev.details || {};

    if (ev.type === 'BREAST' || ev.type === 'BOTTLE' || ev.type === 'SOLIDS' || ev.type === 'COMBO') {
      stats.feed.totalCount++;

      // Feeding interval from start of last feed to start of this feed
      if (lastFeedStartMs !== null) {
        const gap = begin - lastFeedStartMs;
        if (gap > 30 * 60 * 1000 && gap < 12 * 3600 * 1000) {
          stats.feed.intervals.push(gap);
        }
      }
      lastFeedStartMs = begin;

      if (ev.type === 'BREAST' || ev.type === 'COMBO') {
        stats.feed.breastSessions++;
        const bfDur = (det.leftDurationMs || 0) + (det.rightDurationMs || 0) || ev.durationMs || 0;
        stats.feed.totalBreastMs += bfDur;
        stats.feed.leftBreastMs += det.leftDurationMs || (bfDur / 2);
        stats.feed.rightBreastMs += det.rightDurationMs || (bfDur / 2);
      }

      if (ev.type === 'BOTTLE' || ev.type === 'COMBO') {
        const vol = det.volumeFloz || 0;
        if (vol > 0) {
          stats.feed.bottleCount++;
          stats.feed.totalBottleFloz += vol;
          if (det.milkType === 'FORMULA') {
            stats.feed.formulaFloz += vol;
          } else {
            stats.feed.breastMilkFloz += vol;
          }
        }
      }

      if (ev.type === 'SOLIDS') {
        stats.feed.solidsCount++;
      }
    } else if (ev.type === 'SLEEP') {
      stats.sleep.totalSleepMs += dur;
      stats.sleep.longestSleepMs = Math.max(stats.sleep.longestSleepMs, dur);

      const isNap = det.sleepType === 'NAP' || daytime;
      if (isNap) {
        stats.sleep.napCount++;
        stats.sleep.daySleepMs += dur;
      } else {
        stats.sleep.nightSleepMs += dur;
      }

      // Wake Window (gap from last sleep END to this sleep BEGIN)
      if (lastSleepEndMs !== null) {
        const wakeGap = begin - lastSleepEndMs;
        if (wakeGap > 15 * 60 * 1000 && wakeGap < 10 * 3600 * 1000) {
          stats.sleep.wakeWindows.push(wakeGap);
        }
      }
      lastSleepEndMs = end;
    } else if (ev.type === 'DIAPER') {
      stats.diaper.total++;
      if (det.pee) stats.diaper.wet++;
      if (det.poop) stats.diaper.dirty++;
      if (det.blowout) stats.diaper.blowouts++;
    } else if (ev.type === 'ROUTINE') {
      if ((det.routineName || '').toUpperCase().includes('TUMMY')) {
        stats.tummy.sessions++;
        stats.tummy.totalMs += dur || 10 * 60 * 1000;
      }
    } else if (ev.type === 'GROWTH') {
      if (det.weightLb || det.heightIn || det.headIn || det.weightKg || det.heightCm || det.headCm) {
        stats.growth.push({
          date: ev.beginDt,
          weightLb: det.weightLb,
          weightKg: det.weightKg,
          heightIn: det.heightIn,
          heightCm: det.heightCm,
          headIn: det.headIn,
          headCm: det.headCm,
        });
      }
    }
  });

  // Averages
  if (stats.feed.breastSessions > 0) {
    stats.feed.avgBreastSessionMs = Math.round(stats.feed.totalBreastMs / stats.feed.breastSessions);
  }
  if (stats.feed.bottleCount > 0) {
    stats.feed.avgBottleFloz = Math.round((stats.feed.totalBottleFloz / stats.feed.bottleCount) * 10) / 10;
  }
  if (stats.feed.intervals.length > 0) {
    const sum = stats.feed.intervals.reduce((a, b) => a + b, 0);
    stats.feed.avgIntervalMs = Math.round(sum / stats.feed.intervals.length);
  }

  if (stats.sleep.napCount > 0) {
    stats.sleep.avgNapMs = Math.round(stats.sleep.daySleepMs / stats.sleep.napCount);
  }
  if (stats.sleep.wakeWindows.length > 0) {
    const sum = stats.sleep.wakeWindows.reduce((a, b) => a + b, 0);
    stats.sleep.avgWakeWindowMs = Math.round(sum / stats.sleep.wakeWindows.length);
  }

  stats.diaper.avgPerDay = Math.round((stats.diaper.total / Math.max(1, numDays)) * 10) / 10;

  // Build chart series: weekly aggregation if lifetime > 21 days, otherwise daily
  if (isLifetime && numDays > 21) {
    const numWeeks = Math.ceil(numDays / 7);
    const weeklyBuckets = [];

    for (let w = 0; w < numWeeks; w++) {
      const wStart = windowStartMs + w * 7 * dayMs;
      const wEnd = Math.min(nowMs, wStart + 7 * dayMs);
      const daysInBucket = Math.max(1, Math.round((wEnd - wStart) / dayMs));
      const startDate = new Date(wStart);
      const startLabel = `${startDate.getMonth() + 1}/${startDate.getDate()}`;

      weeklyBuckets.push({
        bucketKey: `w_${w}`,
        wStart,
        wEnd,
        daysCount: daysInBucket,
        label: `W${w + 1}`,
        subLabel: startLabel,
        totalSleepHours: 0,
        totalBottleFloz: 0,
        totalNursingMinutes: 0,
        totalDiapers: 0,
        sleepHours: 0,
        bottleFloz: 0,
        nursingMinutes: 0,
        diapers: 0,
      });
    }

    sorted.forEach(ev => {
      const t = ev.beginDt;
      const bucket = weeklyBuckets.find(b => t >= b.wStart && t < b.wEnd);
      if (!bucket) return;

      if (ev.type === 'SLEEP') {
        bucket.totalSleepHours += (ev.durationMs || 0) / 3600000;
      } else if (ev.type === 'BOTTLE' || ev.type === 'COMBO') {
        bucket.totalBottleFloz += ev.details?.volumeFloz || 0;
      } else if (ev.type === 'BREAST') {
        const mins = ((ev.details?.leftDurationMs || 0) + (ev.details?.rightDurationMs || 0) || ev.durationMs || 0) / 60000;
        bucket.totalNursingMinutes += mins;
      } else if (ev.type === 'DIAPER') {
        bucket.totalDiapers++;
      }
    });

    // Compute daily averages for each week
    weeklyBuckets.forEach(b => {
      const dCount = Math.max(1, b.daysCount);
      b.sleepHours = Math.round((b.totalSleepHours / dCount) * 10) / 10;
      b.bottleFloz = Math.round((b.totalBottleFloz / dCount) * 10) / 10;
      b.nursingMinutes = Math.round(b.totalNursingMinutes / dCount);
      b.diapers = Math.round((b.totalDiapers / dCount) * 10) / 10;
    });

    stats.dailySeries = weeklyBuckets;
    stats.seriesAggregation = 'weekly';
  } else {
    const dayBuckets = {};
    const effectiveDays = Math.min(numDays, 30);

    for (let i = effectiveDays - 1; i >= 0; i--) {
      const d = new Date(nowMs - i * dayMs);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const label = effectiveDays <= 7
        ? d.toLocaleDateString([], { weekday: 'narrow', month: 'numeric', day: 'numeric' })
        : `${d.getMonth() + 1}/${d.getDate()}`;

      dayBuckets[key] = {
        dateKey: key,
        label,
        sleepHours: 0,
        bottleFloz: 0,
        nursingMinutes: 0,
        diapers: 0,
      };
    }

    sorted.forEach(ev => {
      const d = new Date(ev.beginDt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!dayBuckets[key]) return;

      if (ev.type === 'SLEEP') {
        const hours = (ev.durationMs || 0) / 3600000;
        dayBuckets[key].sleepHours = Math.round((dayBuckets[key].sleepHours + hours) * 10) / 10;
      } else if (ev.type === 'BOTTLE' || ev.type === 'COMBO') {
        dayBuckets[key].bottleFloz = Math.round((dayBuckets[key].bottleFloz + (ev.details?.volumeFloz || 0)) * 10) / 10;
      } else if (ev.type === 'BREAST') {
        const mins = ((ev.details?.leftDurationMs || 0) + (ev.details?.rightDurationMs || 0) || ev.durationMs || 0) / 60000;
        dayBuckets[key].nursingMinutes += Math.round(mins);
      } else if (ev.type === 'DIAPER') {
        dayBuckets[key].diapers++;
      }
    });

    stats.dailySeries = Object.values(dayBuckets);
    stats.seriesAggregation = 'daily';
  }

  return stats;
}
