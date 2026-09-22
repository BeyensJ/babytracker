/**
 * Generates realistic historical baby tracking data matching Nara Baby export structure
 * spanning the last 14 days for instant testing and demonstration.
 */

export function generateSampleNaraEvents(childKey = 'child_1') {
  const events = [];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // Let's generate data for the past 14 days
  for (let dayOffset = 13; dayOffset >= 0; dayOffset--) {
    const dayStart = new Date(now - dayOffset * dayMs);
    dayStart.setHours(0, 0, 0, 0);
    const baseMs = dayStart.getTime();

    // 1. Night Sleep ending in morning (around 6:30 AM - 7:00 AM)
    const nightSleepEnd = baseMs + (6 * 3600 + 45 * 60) * 1000;
    const nightSleepStart = baseMs - (3 * 3600 + 15 * 60) * 1000; // began night before
    if (dayOffset < 13) {
      events.push({
        id: `sample_sleep_night_${dayOffset}`,
        childKey,
        type: 'SLEEP',
        beginDt: nightSleepStart,
        endDt: nightSleepEnd,
        durationMs: nightSleepEnd - nightSleepStart,
        details: { sleepType: 'NIGHT' },
        note: 'Slept fairly well through the early morning',
      });
    }

    // 2. Morning Wakeup Diaper (7:05 AM)
    events.push({
      id: `sample_diaper_morning_${dayOffset}`,
      childKey,
      type: 'DIAPER',
      beginDt: baseMs + (7 * 3600 + 5 * 60) * 1000,
      endDt: null,
      durationMs: 0,
      details: { pee: true, poop: true, color: 'YELLOW', texture: 'SEEDY', rash: false, blowout: false },
      note: 'Very wet morning diaper',
    });

    // 3. Morning Breast Feed (7:15 AM)
    const feed1Dur = 18 * 60 * 1000;
    events.push({
      id: `sample_bf_morning_${dayOffset}`,
      childKey,
      type: 'BREAST',
      beginDt: baseMs + (7 * 3600 + 15 * 60) * 1000,
      endDt: baseMs + (7 * 3600 + 33 * 60) * 1000,
      durationMs: feed1Dur,
      details: {
        side: 'BOTH',
        leftDurationMs: 10 * 60 * 1000,
        rightDurationMs: 8 * 60 * 1000,
      },
      note: 'Good latch on left side',
    });

    // 4. Morning Tummy Time (8:20 AM)
    events.push({
      id: `sample_tummy_1_${dayOffset}`,
      childKey,
      type: 'ROUTINE',
      beginDt: baseMs + (8 * 3600 + 20 * 60) * 1000,
      endDt: baseMs + (8 * 3600 + 30 * 60) * 1000,
      durationMs: 10 * 60 * 1000,
      details: { routineName: 'TUMMYTIME' },
      note: 'Lifted head steadily with high contrast cards',
    });

    // 5. Morning Nap 1 (8:45 AM - 10:00 AM)
    const nap1Start = baseMs + (8 * 3600 + 45 * 60) * 1000;
    const nap1End = baseMs + (10 * 3600 + 5 * 60) * 1000;
    events.push({
      id: `sample_nap_1_${dayOffset}`,
      childKey,
      type: 'SLEEP',
      beginDt: nap1Start,
      endDt: nap1End,
      durationMs: nap1End - nap1Start,
      details: { sleepType: 'NAP' },
      note: 'Contact nap transferred to bassinet',
    });

    // 6. Mid-Morning Diaper (10:15 AM)
    events.push({
      id: `sample_diaper_mid_${dayOffset}`,
      childKey,
      type: 'DIAPER',
      beginDt: baseMs + (10 * 3600 + 15 * 60) * 1000,
      endDt: null,
      durationMs: 0,
      details: { pee: true, poop: false, rash: false, blowout: false },
      note: '',
    });

    // 7. Mid-Morning Bottle (10:30 AM)
    events.push({
      id: `sample_bottle_1_${dayOffset}`,
      childKey,
      type: 'BOTTLE',
      beginDt: baseMs + (10 * 3600 + 30 * 60) * 1000,
      endDt: null,
      durationMs: 15 * 60 * 1000,
      details: {
        volumeFloz: 4.0,
        milkType: 'BREAST_MILK',
        formulaName: '',
      },
      note: 'Finished entire bottle smoothly',
    });

    // 8. Afternoon Nap 2 (11:45 AM - 1:15 PM)
    const nap2Start = baseMs + (11 * 3600 + 45 * 60) * 1000;
    const nap2End = baseMs + (13 * 3600 + 15 * 60) * 1000;
    events.push({
      id: `sample_nap_2_${dayOffset}`,
      childKey,
      type: 'SLEEP',
      beginDt: nap2Start,
      endDt: nap2End,
      durationMs: nap2End - nap2Start,
      details: { sleepType: 'NAP' },
      note: 'Long, sound nap in nursery',
    });

    // 9. Afternoon Feed (1:30 PM)
    events.push({
      id: `sample_bf_afternoon_${dayOffset}`,
      childKey,
      type: 'BREAST',
      beginDt: baseMs + (13 * 3600 + 30 * 60) * 1000,
      endDt: baseMs + (13 * 3600 + 48 * 60) * 1000,
      durationMs: 18 * 60 * 1000,
      details: {
        side: 'RIGHT',
        leftDurationMs: 4 * 60 * 1000,
        rightDurationMs: 14 * 60 * 1000,
      },
      note: 'Nursed hungrily right after waking',
    });

    // 10. Afternoon Diaper (1:55 PM)
    events.push({
      id: `sample_diaper_aft_${dayOffset}`,
      childKey,
      type: 'DIAPER',
      beginDt: baseMs + (13 * 3600 + 55 * 60) * 1000,
      endDt: null,
      durationMs: 0,
      details: {
        pee: true,
        poop: dayOffset % 2 === 0,
        color: 'BROWN',
        texture: 'MUSH',
        rash: false,
        blowout: dayOffset === 4,
      },
      note: dayOffset === 4 ? 'Mild blowout, needed full outfit change!' : '',
    });

    // 11. Late Afternoon Catnap (3:45 PM - 4:25 PM)
    const nap3Start = baseMs + (15 * 3600 + 45 * 60) * 1000;
    const nap3End = baseMs + (16 * 3600 + 25 * 60) * 1000;
    events.push({
      id: `sample_nap_3_${dayOffset}`,
      childKey,
      type: 'SLEEP',
      beginDt: nap3Start,
      endDt: nap3End,
      durationMs: nap3End - nap3Start,
      details: { sleepType: 'NAP' },
      note: 'Quick bridge nap in stroller',
    });

    // 12. Evening Bottle (4:45 PM)
    events.push({
      id: `sample_bottle_eve_${dayOffset}`,
      childKey,
      type: 'BOTTLE',
      beginDt: baseMs + (16 * 3600 + 45 * 60) * 1000,
      endDt: null,
      durationMs: 12 * 60 * 1000,
      details: {
        volumeFloz: 4.5,
        milkType: dayOffset % 3 === 0 ? 'FORMULA' : 'BREAST_MILK',
        formulaName: dayOffset % 3 === 0 ? 'Kendamil Organic' : '',
      },
      note: '',
    });

    // 13. Bedtime Routine: Bath or Reading (6:30 PM)
    if (dayOffset % 2 === 0) {
      events.push({
        id: `sample_routine_bath_${dayOffset}`,
        childKey,
        type: 'ROUTINE',
        beginDt: baseMs + (18 * 3600 + 30 * 60) * 1000,
        endDt: null,
        durationMs: 15 * 60 * 1000,
        details: { routineName: 'BATH' },
        note: 'Warm calming chamomile bath',
      });
    }

    // 14. Bedtime Nursing (7:00 PM)
    events.push({
      id: `sample_bf_bedtime_${dayOffset}`,
      childKey,
      type: 'BREAST',
      beginDt: baseMs + (19 * 3600 + 0 * 60) * 1000,
      endDt: baseMs + (19 * 3600 + 22 * 60) * 1000,
      durationMs: 22 * 60 * 1000,
      details: {
        side: 'BOTH',
        leftDurationMs: 12 * 60 * 1000,
        rightDurationMs: 10 * 60 * 1000,
      },
      note: 'Dozed off while nursing',
    });

    // 15. Night Sleep Starts (7:30 PM)
    if (dayOffset > 0) {
      const nightSleepStart = baseMs + (19 * 3600 + 30 * 60) * 1000;
      const nextMorningWake = nightSleepStart + (10 * 3600 + 15 * 60) * 1000;
      events.push({
        id: `sample_night_start_${dayOffset}`,
        childKey,
        type: 'SLEEP',
        beginDt: nightSleepStart,
        endDt: nextMorningWake,
        durationMs: nextMorningWake - nightSleepStart,
        details: { sleepType: 'NIGHT' },
        note: 'White noise on, asleep in 10 minutes',
      });
    }
  }

  // Add occasional Growth measurements
  events.push({
    id: 'sample_growth_1',
    childKey,
    type: 'GROWTH',
    beginDt: now - 12 * dayMs,
    endDt: null,
    durationMs: 0,
    details: { weightLb: 11.2, heightIn: 22.4, headIn: 15.1 },
    note: '1 Month Pediatrician Visit',
  });

  events.push({
    id: 'sample_growth_2',
    childKey,
    type: 'GROWTH',
    beginDt: now - 2 * dayMs,
    endDt: null,
    durationMs: 0,
    details: { weightLb: 12.8, heightIn: 23.6, headIn: 15.8 },
    note: '2 Month Checkup - 65th percentile weight!',
  });

  // Add Health: Vitamin D & Vaccine
  events.push({
    id: 'sample_health_vitd',
    childKey,
    type: 'HEALTH',
    beginDt: now - 1 * dayMs + 9 * 3600 * 1000,
    endDt: null,
    durationMs: 0,
    details: { medicineName: 'Vitamin D Drops', temperatureF: null },
    note: '1 drop given with morning bottle',
  });

  // Add Milestone
  events.push({
    id: 'sample_milestone_1',
    childKey,
    type: 'MILESTONE',
    beginDt: now - 5 * dayMs,
    endDt: null,
    durationMs: 0,
    details: { milestoneName: 'First Real Social Smile' },
    note: 'Big smiling response while listening to dad talk on the changing table! 💕',
  });

  // Sort newest to oldest
  return events.sort((a, b) => b.beginDt - a.beginDt);
}
