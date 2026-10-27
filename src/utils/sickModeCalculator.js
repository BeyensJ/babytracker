/**
 * Sick Mode Calculations & Pediatric Decision Support Utilities
 * 
 * Provides safe dose timing, fever curve points, hydration monitoring,
 * and consultation summaries for ill children.
 */

export const FEVER_THRESHOLDS_C = {
  NORMAL_MAX: 37.5,
  ELEVATED_MAX: 38.4,
  HIGH_FEVER_MIN: 38.5,
};

export const FEVER_THRESHOLDS_F = {
  NORMAL_MAX: 99.5,
  ELEVATED_MAX: 101.1,
  HIGH_FEVER_MIN: 101.3,
};

// Interval rules in milliseconds
export const MED_RULES = {
  PARACETAMOL: {
    MIN_INTERVAL_MS: 4 * 60 * 60 * 1000,      // 4 hours minimum between doses
    RECOMMENDED_INTERVAL_MS: 6 * 60 * 60 * 1000, // 6 hours pediatric standard
    MAX_DOSES_24H: 4,
    KEYWORDS: ['perdolan', 'paracetamol', 'tylenol', 'dafalgan', 'calpol', 'panadol', 'acetaminophen'],
  },
  IBUPROFEN: {
    MIN_INTERVAL_MS: 6 * 60 * 60 * 1000,      // 6 hours minimum between doses
    RECOMMENDED_INTERVAL_MS: 8 * 60 * 60 * 1000, // 6-8 hours pediatric standard
    MAX_DOSES_24H: 3,
    KEYWORDS: ['nurofen', 'ibuprofen', 'motrin', 'advil', 'junifen'],
  },
};

/**
 * Classify a medicine name into PARACETAMOL, IBUPROFEN, or OTHER
 */
export function classifyMedication(name = '') {
  const lower = String(name).toLowerCase().trim();
  if (!lower) return 'OTHER';

  if (MED_RULES.PARACETAMOL.KEYWORDS.some((kw) => lower.includes(kw))) {
    return 'PARACETAMOL';
  }
  if (MED_RULES.IBUPROFEN.KEYWORDS.some((kw) => lower.includes(kw))) {
    return 'IBUPROFEN';
  }
  return 'OTHER';
}

/**
 * Determine temperature status level
 */
export function getTemperatureStatus(tempC, tempF, unit = 'C') {
  const val = unit === 'C' ? tempC : tempF;
  if (val === null || val === undefined || isNaN(val)) return 'UNKNOWN';

  if (unit === 'C') {
    if (val < FEVER_THRESHOLDS_C.NORMAL_MAX) return 'NORMAL';
    if (val <= FEVER_THRESHOLDS_C.ELEVATED_MAX) return 'ELEVATED';
    return 'HIGH_FEVER';
  } else {
    if (val < FEVER_THRESHOLDS_F.NORMAL_MAX) return 'NORMAL';
    if (val <= FEVER_THRESHOLDS_F.ELEVATED_MAX) return 'ELEVATED';
    return 'HIGH_FEVER';
  }
}

/**
 * Main calculator for Sick Mode dashboard and exports
 */
export function calculateSickModeData(events = [], child = null, preferences = {}, now = Date.now()) {
  if (!child) {
    return {
      isActive: false,
      illnessDurationMs: 0,
      latestTemp: null,
      tempReadings: [],
      peakTemp: null,
      tempTrend: 'stable',
      paracetamol: null,
      ibuprofen: null,
      recentMeds: [],
      hydration24h: { totalFluidsMl: 0, totalFluidsOz: 0, nursingDurationMinutes: 0, wetDiapers: 0, status: 'good' },
      chartPoints: [],
    };
  }

  const sickMode = child.sickMode || {};
  const isActive = Boolean(sickMode.active);
  const startedAt = sickMode.startedAt || (now - 24 * 60 * 60 * 1000);
  const illnessDurationMs = Math.max(0, now - startedAt);

  const isMetric = preferences.tempUnit === 'C';
  const childEvents = events.filter((e) => !e.childKey || e.childKey === child.id);

  // Look back over the course of the illness, or at least the past 72 hours
  const lookbackCutoff = Math.min(startedAt - (2 * 60 * 60 * 1000), now - 72 * 60 * 60 * 1000);

  // 1. Temperature Readings
  const tempEvents = childEvents
    .filter((e) => e.type === 'HEALTH' && (e.details?.temperatureC || e.details?.temperatureF))
    .filter((e) => e.beginDt >= lookbackCutoff)
    .sort((a, b) => a.beginDt - b.beginDt);

  const tempReadings = tempEvents.map((e) => {
    let c = e.details.temperatureC;
    let f = e.details.temperatureF;
    if (c && !f) f = Math.round(((c * 9) / 5 + 32) * 10) / 10;
    if (f && !c) c = Math.round((((f - 32) * 5) / 9) * 10) / 10;

    const status = getTemperatureStatus(c, f, isMetric ? 'C' : 'F');
    return {
      id: e.id,
      timestamp: e.beginDt,
      tempC: c,
      tempF: f,
      status,
      note: e.note || '',
      loggedBy: e.loggedByCaregiverName || '',
    };
  });

  const latestTemp = tempReadings.length > 0 ? tempReadings[tempReadings.length - 1] : null;
  const previousTemp = tempReadings.length > 1 ? tempReadings[tempReadings.length - 2] : null;

  let tempTrend = 'stable';
  if (latestTemp && previousTemp) {
    const diff = (latestTemp.tempC || 0) - (previousTemp.tempC || 0);
    if (diff >= 0.3) tempTrend = 'rising';
    else if (diff <= -0.3) tempTrend = 'falling';
  }

  let peakTemp = null;
  if (tempReadings.length > 0) {
    peakTemp = tempReadings.reduce((max, curr) => {
      const currVal = curr.tempC || 0;
      const maxVal = max.tempC || 0;
      return currVal > maxVal ? curr : max;
    }, tempReadings[0]);
  }

  // 2. Medication Events (Last 72 hours)
  const medEvents = childEvents
    .filter((e) => e.type === 'HEALTH' && e.details?.medicineName)
    .filter((e) => e.beginDt >= lookbackCutoff)
    .sort((a, b) => a.beginDt - b.beginDt);

  const past24hCutoff = now - 24 * 60 * 60 * 1000;
  const recentMeds = medEvents.map((e) => {
    const medClass = classifyMedication(e.details.medicineName);
    return {
      id: e.id,
      timestamp: e.beginDt,
      name: e.details.medicineName,
      dosage: e.details.dosage || '',
      note: e.note || '',
      medClass,
      loggedBy: e.loggedByCaregiverName || '',
    };
  });

  // Calculate safe intervals for Paracetamol
  const paracetamolDoses = recentMeds.filter((m) => m.medClass === 'PARACETAMOL');
  const lastParacetamol = paracetamolDoses.length > 0 ? paracetamolDoses[paracetamolDoses.length - 1] : null;
  const paracetamol24hCount = paracetamolDoses.filter((m) => m.timestamp >= past24hCutoff).length;

  let paracetamolState = null;
  if (lastParacetamol) {
    const elapsedMs = Math.max(0, now - lastParacetamol.timestamp);
    const minSafeIntervalMs = MED_RULES.PARACETAMOL.MIN_INTERVAL_MS;
    const recommendedIntervalMs = MED_RULES.PARACETAMOL.RECOMMENDED_INTERVAL_MS;
    const canGiveNow = elapsedMs >= minSafeIntervalMs;
    const isRecommended = elapsedMs >= recommendedIntervalMs;
    const remainingMinMs = Math.max(0, minSafeIntervalMs - elapsedMs);
    const remainingRecMs = Math.max(0, recommendedIntervalMs - elapsedMs);

    paracetamolState = {
      lastDose: lastParacetamol,
      elapsedMs,
      canGiveNow,
      isRecommended,
      remainingMinMs,
      remainingRecMs,
      nextSafeTimestamp: lastParacetamol.timestamp + minSafeIntervalMs,
      nextRecommendedTimestamp: lastParacetamol.timestamp + recommendedIntervalMs,
      doses24h: paracetamol24hCount,
      maxDoses24h: MED_RULES.PARACETAMOL.MAX_DOSES_24H,
    };
  } else {
    paracetamolState = {
      lastDose: null,
      elapsedMs: null,
      canGiveNow: true,
      isRecommended: true,
      remainingMinMs: 0,
      remainingRecMs: 0,
      nextSafeTimestamp: null,
      nextRecommendedTimestamp: null,
      doses24h: 0,
      maxDoses24h: MED_RULES.PARACETAMOL.MAX_DOSES_24H,
    };
  }

  // Calculate safe intervals for Ibuprofen
  const ibuprofenDoses = recentMeds.filter((m) => m.medClass === 'IBUPROFEN');
  const lastIbuprofen = ibuprofenDoses.length > 0 ? ibuprofenDoses[ibuprofenDoses.length - 1] : null;
  const ibuprofen24hCount = ibuprofenDoses.filter((m) => m.timestamp >= past24hCutoff).length;

  let ibuprofenState = null;
  if (lastIbuprofen) {
    const elapsedMs = Math.max(0, now - lastIbuprofen.timestamp);
    const minSafeIntervalMs = MED_RULES.IBUPROFEN.MIN_INTERVAL_MS;
    const recommendedIntervalMs = MED_RULES.IBUPROFEN.RECOMMENDED_INTERVAL_MS;
    const canGiveNow = elapsedMs >= minSafeIntervalMs;
    const isRecommended = elapsedMs >= recommendedIntervalMs;
    const remainingMinMs = Math.max(0, minSafeIntervalMs - elapsedMs);
    const remainingRecMs = Math.max(0, recommendedIntervalMs - elapsedMs);

    ibuprofenState = {
      lastDose: lastIbuprofen,
      elapsedMs,
      canGiveNow,
      isRecommended,
      remainingMinMs,
      remainingRecMs,
      nextSafeTimestamp: lastIbuprofen.timestamp + minSafeIntervalMs,
      nextRecommendedTimestamp: lastIbuprofen.timestamp + recommendedIntervalMs,
      doses24h: ibuprofen24hCount,
      maxDoses24h: MED_RULES.IBUPROFEN.MAX_DOSES_24H,
    };
  } else {
    ibuprofenState = {
      lastDose: null,
      elapsedMs: null,
      canGiveNow: true,
      isRecommended: true,
      remainingMinMs: 0,
      remainingRecMs: 0,
      nextSafeTimestamp: null,
      nextRecommendedTimestamp: null,
      doses24h: 0,
      maxDoses24h: MED_RULES.IBUPROFEN.MAX_DOSES_24H,
    };
  }

  // 3. Hydration & Diaper Health (Past 24 Hours)
  let totalFluidsMl = 0;
  let nursingDurationMinutes = 0;
  let wetDiapers = 0;
  let dirtyDiapers = 0;

  const events24h = childEvents.filter((e) => e.beginDt >= past24hCutoff);
  events24h.forEach((e) => {
    if (e.type === 'BOTTLE') {
      const vol = Number(e.details?.consumedAmount || e.details?.amount || 0);
      const unit = e.details?.unit || preferences.volumeUnit || 'ml';
      if (unit === 'oz') {
        totalFluidsMl += vol * 29.5735;
      } else {
        totalFluidsMl += vol;
      }
    } else if (e.type === 'BREAST') {
      const dur = e.durationMs || (e.endDt ? e.endDt - e.beginDt : 0);
      nursingDurationMinutes += Math.round(dur / 60000);
    } else if (e.type === 'DIAPER') {
      const sub = e.details?.subType || '';
      if (sub === 'wet' || sub === 'both' || sub === 'dirty_wet') {
        wetDiapers += 1;
      }
      if (sub === 'dirty' || sub === 'both' || sub === 'dirty_wet') {
        dirtyDiapers += 1;
      }
    }
  });

  const totalFluidsOz = Math.round((totalFluidsMl / 29.5735) * 10) / 10;
  totalFluidsMl = Math.round(totalFluidsMl);

  let hydrationStatus = 'good';
  if (wetDiapers < 2) {
    hydrationStatus = 'warning'; // Danger of dehydration
  } else if (wetDiapers < 4) {
    hydrationStatus = 'moderate'; // Monitor closely
  }

  // 4. Unified Timeline Points for Fever Curve Chart
  // Combine temp readings and med doses chronologically
  const chartPoints = [
    ...tempReadings.map((t) => ({
      type: 'TEMP',
      timestamp: t.timestamp,
      tempC: t.tempC,
      tempF: t.tempF,
      status: t.status,
      id: t.id,
      note: t.note,
    })),
    ...recentMeds.map((m) => ({
      type: 'MED',
      timestamp: m.timestamp,
      name: m.name,
      dosage: m.dosage,
      medClass: m.medClass,
      id: m.id,
    })),
  ].sort((a, b) => a.timestamp - b.timestamp);

  return {
    isActive,
    startedAt,
    illnessDurationMs,
    symptoms: sickMode.symptoms || [],
    customDiagnosis: sickMode.customDiagnosis || '',
    notes: sickMode.notes || '',
    latestTemp,
    previousTemp,
    peakTemp,
    tempTrend,
    tempReadings,
    paracetamol: paracetamolState,
    ibuprofen: ibuprofenState,
    recentMeds,
    hydration24h: {
      totalFluidsMl,
      totalFluidsOz,
      nursingDurationMinutes,
      wetDiapers,
      dirtyDiapers,
      status: hydrationStatus,
    },
    chartPoints,
  };
}

/**
 * Generate a formatted consultation text summary suitable for WhatsApp, email, or doctor visit
 */
export function generateDoctorSummaryText({ child, sickData, preferences, language = 'nl' }) {
  const isDutch = language === 'nl';
  const isMetric = preferences.tempUnit === 'C';
  const childName = child?.name || 'Baby';
  const now = new Date();

  const lines = [];
  lines.push(`📋 ${isDutch ? 'MEDISCH CONSULTATIE-OVERZICHT' : 'MEDICAL CONSULTATION SUMMARY'}`);
  lines.push(`👶 ${isDutch ? 'Patiënt' : 'Patient'}: ${childName} (${child?.birthdate ? `${child.birthdate}` : ''})`);
  lines.push(`📅 ${isDutch ? 'Aangemaakt op' : 'Generated on'}: ${now.toLocaleDateString(isDutch ? 'nl-BE' : 'en-US')} ${now.toLocaleTimeString(isDutch ? 'nl-BE' : 'en-US', { hour: '2-digit', minute: '2-digit' })}`);
  lines.push('──────────────────────────────');

  // Illness header
  const diagnosis = sickData.customDiagnosis || (sickData.symptoms?.length > 0 ? sickData.symptoms.join(', ') : (isDutch ? 'Koorts / ziekte' : 'Fever / illness'));
  const durationHours = Math.round(sickData.illnessDurationMs / (60 * 60 * 1000));
  lines.push(`🤒 ${isDutch ? 'Diagnose / Klachten' : 'Diagnosis / Symptoms'}: ${diagnosis}`);
  lines.push(`⏱️ ${isDutch ? 'Duur ziekte' : 'Illness duration'}: ${durationHours} ${isDutch ? 'uur' : 'hours'}`);
  if (sickData.notes) {
    lines.push(`📝 ${isDutch ? 'Observaties' : 'Notes'}: ${sickData.notes}`);
  }
  lines.push('');

  // Vital Signs
  lines.push(`🌡️ ${isDutch ? 'TEMPERATUUR' : 'TEMPERATURE'}:`);
  if (sickData.latestTemp) {
    const val = isMetric ? `${sickData.latestTemp.tempC}°C` : `${sickData.latestTemp.tempF}°F`;
    lines.push(`  • ${isDutch ? 'Laatste meting' : 'Latest'}: ${val} (${new Date(sickData.latestTemp.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`);
  }
  if (sickData.peakTemp) {
    const peakVal = isMetric ? `${sickData.peakTemp.tempC}°C` : `${sickData.peakTemp.tempF}°F`;
    lines.push(`  • ${isDutch ? 'Hoogste koorts' : 'Peak fever'}: ${peakVal} (${new Date(sickData.peakTemp.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`);
  }
  lines.push('');

  // Hydration & Diapers
  lines.push(`💧 ${isDutch ? 'HYDRATATIE & PLASLUIERS (LAATSTE 24U)' : 'HYDRATION & WET DIAPERS (LAST 24H)'}:`);
  lines.push(`  • ${isDutch ? 'Vocht ingenomen' : 'Fluids intake'}: ${sickData.hydration24h.totalFluidsMl} ml (${sickData.hydration24h.totalFluidsOz} oz)${sickData.hydration24h.nursingDurationMinutes > 0 ? ` + ${sickData.hydration24h.nursingDurationMinutes}m ${isDutch ? 'borstvoeding' : 'nursing'}` : ''}`);
  lines.push(`  • ${isDutch ? 'Plasluiers' : 'Wet diapers'}: ${sickData.hydration24h.wetDiapers} ${isDutch ? 'luiers' : 'diapers'} (${sickData.hydration24h.status === 'good' ? (isDutch ? 'Goede hydratatie' : 'Good hydration') : (isDutch ? 'Opgelet: lage hydratatie' : 'Warning: Low hydration')})`);
  lines.push('');

  // Medication table
  lines.push(`💊 ${isDutch ? 'MEDICATIE TOEGEDIEND' : 'MEDICATIONS ADMINISTERED'}:`);
  if (sickData.recentMeds.length === 0) {
    lines.push(`  • ${isDutch ? 'Geen medicatie geregistreerd in de voorbije 72u' : 'No medications recorded in past 72h'}`);
  } else {
    sickData.recentMeds.forEach((m) => {
      const timeStr = new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = new Date(m.timestamp).toLocaleDateString([], { day: '2-digit', month: '2-digit' });
      lines.push(`  • ${dateStr} ${timeStr}: ${m.name} ${m.dosage ? `(${m.dosage})` : ''}${m.loggedBy ? ` - ${m.loggedBy}` : ''}`);
    });
  }
  lines.push('');

  // Temperature readings list
  lines.push(`📈 ${isDutch ? 'KOORTSVERLOOP (RECENTE METINGEN)' : 'FEVER LOG (RECENT READINGS)'}:`);
  if (sickData.tempReadings.length === 0) {
    lines.push(`  • ${isDutch ? 'Geen temperatuurmetingen geregistreerd' : 'No temperature readings recorded'}`);
  } else {
    sickData.tempReadings.slice(-8).forEach((t) => {
      const timeStr = new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = new Date(t.timestamp).toLocaleDateString([], { day: '2-digit', month: '2-digit' });
      const val = isMetric ? `${t.tempC}°C` : `${t.tempF}°F`;
      lines.push(`  • ${dateStr} ${timeStr}: ${val}${t.note ? ` (${t.note})` : ''}`);
    });
  }

  return lines.join('\n');
}
