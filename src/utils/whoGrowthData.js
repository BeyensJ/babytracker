/**
 * Official World Health Organization (WHO) Child Growth Standards
 * Weight-for-Age and Length-for-Age (0 to 24 Months)
 * Reference: WHO Multicentre Growth Reference Study
 */

// Weight-for-Age (kg) - Girls (0 to 24 completed months)
export const WHO_WEIGHT_GIRLS = [
  { month: 0, p3: 2.4, p15: 2.8, p50: 3.2, p85: 3.7, p97: 4.2 },
  { month: 1, p3: 3.2, p15: 3.6, p50: 4.2, p85: 4.8, p97: 5.4 },
  { month: 2, p3: 4.0, p15: 4.5, p50: 5.1, p85: 5.9, p97: 6.5 },
  { month: 3, p3: 4.6, p15: 5.1, p50: 5.8, p85: 6.7, p97: 7.4 },
  { month: 4, p3: 5.1, p15: 5.6, p50: 6.4, p85: 7.3, p97: 8.1 },
  { month: 5, p3: 5.5, p15: 6.1, p50: 6.9, p85: 7.8, p97: 8.7 },
  { month: 6, p3: 5.8, p15: 6.4, p50: 7.3, p85: 8.3, p97: 9.2 },
  { month: 7, p3: 6.1, p15: 6.7, p50: 7.6, p85: 8.7, p97: 9.6 },
  { month: 8, p3: 6.3, p15: 7.0, p50: 7.9, p85: 9.0, p97: 10.0 },
  { month: 9, p3: 6.6, p15: 7.3, p50: 8.2, p85: 9.3, p97: 10.4 },
  { month: 10, p3: 6.8, p15: 7.5, p50: 8.5, p85: 9.6, p97: 10.7 },
  { month: 11, p3: 7.0, p15: 7.7, p50: 8.7, p85: 9.9, p97: 11.0 },
  { month: 12, p3: 7.1, p15: 7.9, p50: 8.9, p85: 10.2, p97: 11.3 },
  { month: 13, p3: 7.3, p15: 8.1, p50: 9.2, p85: 10.4, p97: 11.6 },
  { month: 14, p3: 7.5, p15: 8.3, p50: 9.4, p85: 10.7, p97: 11.9 },
  { month: 15, p3: 7.7, p15: 8.5, p50: 9.6, p85: 10.9, p97: 12.2 },
  { month: 16, p3: 7.8, p15: 8.7, p50: 9.8, p85: 11.1, p97: 12.5 },
  { month: 17, p3: 8.0, p15: 8.9, p50: 10.0, p85: 11.4, p97: 12.7 },
  { month: 18, p3: 8.2, p15: 9.0, p50: 10.2, p85: 11.6, p97: 13.0 },
  { month: 19, p3: 8.3, p15: 9.2, p50: 10.4, p85: 11.8, p97: 13.3 },
  { month: 20, p3: 8.5, p15: 9.4, p50: 10.6, p85: 12.1, p97: 13.5 },
  { month: 21, p3: 8.7, p15: 9.6, p50: 10.9, p85: 12.4, p97: 13.8 },
  { month: 22, p3: 8.8, p15: 9.8, p50: 11.1, p85: 12.6, p97: 14.1 },
  { month: 23, p3: 9.0, p15: 9.9, p50: 11.3, p85: 12.8, p97: 14.3 },
  { month: 24, p3: 9.2, p15: 10.1, p50: 11.5, p85: 13.1, p97: 14.6 },
];

// Weight-for-Age (kg) - Boys (0 to 24 completed months)
export const WHO_WEIGHT_BOYS = [
  { month: 0, p3: 2.5, p15: 2.9, p50: 3.3, p85: 3.9, p97: 4.4 },
  { month: 1, p3: 3.4, p15: 3.9, p50: 4.5, p85: 5.1, p97: 5.8 },
  { month: 2, p3: 4.3, p15: 4.9, p50: 5.6, p85: 6.3, p97: 7.1 },
  { month: 3, p3: 5.0, p15: 5.7, p50: 6.4, p85: 7.2, p97: 8.0 },
  { month: 4, p3: 5.6, p15: 6.2, p50: 7.0, p85: 7.9, p97: 8.7 },
  { month: 5, p3: 6.0, p15: 6.7, p50: 7.5, p85: 8.4, p97: 9.3 },
  { month: 6, p3: 6.4, p15: 7.1, p50: 7.9, p85: 8.9, p97: 9.8 },
  { month: 7, p3: 6.7, p15: 7.4, p50: 8.3, p85: 9.3, p97: 10.3 },
  { month: 8, p3: 6.9, p15: 7.7, p50: 8.6, p85: 9.6, p97: 10.7 },
  { month: 9, p3: 7.1, p15: 8.0, p50: 8.9, p85: 10.0, p97: 11.0 },
  { month: 10, p3: 7.4, p15: 8.2, p50: 9.2, p85: 10.2, p97: 11.4 },
  { month: 11, p3: 7.6, p15: 8.4, p50: 9.4, p85: 10.5, p97: 11.7 },
  { month: 12, p3: 7.7, p15: 8.6, p50: 9.6, p85: 10.8, p97: 12.0 },
  { month: 13, p3: 7.9, p15: 8.8, p50: 9.9, p85: 11.0, p97: 12.3 },
  { month: 14, p3: 8.1, p15: 9.0, p50: 10.1, p85: 11.3, p97: 12.6 },
  { month: 15, p3: 8.3, p15: 9.2, p50: 10.3, p85: 11.5, p97: 12.8 },
  { month: 16, p3: 8.4, p15: 9.4, p50: 10.5, p85: 11.7, p97: 13.1 },
  { month: 17, p3: 8.6, p15: 9.6, p50: 10.7, p85: 12.0, p97: 13.4 },
  { month: 18, p3: 8.8, p15: 9.8, p50: 10.9, p85: 12.2, p97: 13.7 },
  { month: 19, p3: 8.9, p15: 10.0, p50: 11.1, p85: 12.5, p97: 13.9 },
  { month: 20, p3: 9.1, p15: 10.1, p50: 11.3, p85: 12.7, p97: 14.2 },
  { month: 21, p3: 9.2, p15: 10.3, p50: 11.5, p85: 12.9, p97: 14.5 },
  { month: 22, p3: 9.4, p15: 10.5, p50: 11.8, p85: 13.2, p97: 14.7 },
  { month: 23, p3: 9.5, p15: 10.7, p50: 12.0, p85: 13.4, p97: 15.0 },
  { month: 24, p3: 9.7, p15: 10.8, p50: 12.2, p85: 13.6, p97: 15.3 },
];

// Length-for-Age (cm, recumbent) - Girls (0 to 24 completed months)
export const WHO_LENGTH_GIRLS = [
  { month: 0, p3: 45.4, p15: 47.3, p50: 49.1, p85: 51.0, p97: 52.9 },
  { month: 1, p3: 49.8, p15: 51.7, p50: 53.7, p85: 55.6, p97: 57.6 },
  { month: 2, p3: 53.0, p15: 55.0, p50: 57.1, p85: 59.1, p97: 61.1 },
  { month: 3, p3: 55.6, p15: 57.7, p50: 59.8, p85: 61.9, p97: 64.0 },
  { month: 4, p3: 57.8, p15: 60.0, p50: 62.1, p85: 64.3, p97: 66.4 },
  { month: 5, p3: 59.6, p15: 61.8, p50: 64.0, p85: 66.2, p97: 68.5 },
  { month: 6, p3: 61.2, p15: 63.5, p50: 65.7, p85: 68.0, p97: 70.3 },
  { month: 7, p3: 62.7, p15: 65.0, p50: 67.3, p85: 69.6, p97: 71.9 },
  { month: 8, p3: 64.0, p15: 66.4, p50: 68.7, p85: 71.1, p97: 73.5 },
  { month: 9, p3: 65.3, p15: 67.7, p50: 70.1, p85: 72.6, p97: 75.0 },
  { month: 10, p3: 66.5, p15: 69.0, p50: 71.5, p85: 73.9, p97: 76.4 },
  { month: 11, p3: 67.7, p15: 70.3, p50: 72.8, p85: 75.3, p97: 77.8 },
  { month: 12, p3: 68.9, p15: 71.4, p50: 74.0, p85: 76.6, p97: 79.2 },
  { month: 13, p3: 70.0, p15: 72.6, p50: 75.2, p85: 77.8, p97: 80.5 },
  { month: 14, p3: 71.0, p15: 73.7, p50: 76.4, p85: 79.1, p97: 81.8 },
  { month: 15, p3: 72.0, p15: 74.8, p50: 77.5, p85: 80.2, p97: 83.1 },
  { month: 16, p3: 73.0, p15: 75.8, p50: 78.6, p85: 81.4, p97: 84.3 },
  { month: 17, p3: 73.9, p15: 76.8, p50: 79.7, p85: 82.5, p97: 85.5 },
  { month: 18, p3: 74.8, p15: 77.7, p50: 80.7, p85: 83.6, p97: 86.7 },
  { month: 19, p3: 75.7, p15: 78.6, p50: 81.7, p85: 84.7, p97: 87.8 },
  { month: 20, p3: 76.6, p15: 79.6, p50: 82.7, p85: 85.7, p97: 88.9 },
  { month: 21, p3: 77.4, p15: 80.5, p50: 83.6, p85: 86.7, p97: 89.9 },
  { month: 22, p3: 78.3, p15: 81.4, p50: 84.6, p85: 87.7, p97: 91.0 },
  { month: 23, p3: 79.1, p15: 82.3, p50: 85.5, p85: 88.7, p97: 92.0 },
  { month: 24, p3: 79.9, p15: 83.1, p50: 86.4, p85: 89.6, p97: 93.0 },
];

// Length-for-Age (cm, recumbent) - Boys (0 to 24 completed months)
export const WHO_LENGTH_BOYS = [
  { month: 0, p3: 46.1, p15: 48.0, p50: 49.9, p85: 51.8, p97: 53.7 },
  { month: 1, p3: 50.8, p15: 52.8, p50: 54.7, p85: 56.7, p97: 58.6 },
  { month: 2, p3: 54.4, p15: 56.4, p50: 58.4, p85: 60.4, p97: 62.4 },
  { month: 3, p3: 57.3, p15: 59.4, p50: 61.4, p85: 63.5, p97: 65.5 },
  { month: 4, p3: 59.7, p15: 61.8, p50: 63.9, p85: 66.0, p97: 68.0 },
  { month: 5, p3: 61.7, p15: 63.8, p50: 65.9, p85: 68.0, p97: 70.1 },
  { month: 6, p3: 63.3, p15: 65.5, p50: 67.6, p85: 69.8, p97: 71.9 },
  { month: 7, p3: 64.8, p15: 67.0, p50: 69.2, p85: 71.3, p97: 73.5 },
  { month: 8, p3: 66.2, p15: 68.4, p50: 70.6, p85: 72.8, p97: 75.0 },
  { month: 9, p3: 67.5, p15: 69.7, p50: 72.0, p85: 74.2, p97: 76.5 },
  { month: 10, p3: 68.7, p15: 71.0, p50: 73.3, p85: 75.6, p97: 77.9 },
  { month: 11, p3: 69.9, p15: 72.2, p50: 74.5, p85: 76.9, p97: 79.2 },
  { month: 12, p3: 71.0, p15: 73.4, p50: 75.7, p85: 78.1, p97: 80.5 },
  { month: 13, p3: 72.1, p15: 74.5, p50: 76.9, p85: 79.3, p97: 81.8 },
  { month: 14, p3: 73.1, p15: 75.6, p50: 78.0, p85: 80.5, p97: 83.0 },
  { month: 15, p3: 74.1, p15: 76.6, p50: 79.1, p85: 81.7, p97: 84.2 },
  { month: 16, p3: 75.0, p15: 77.6, p50: 80.2, p85: 82.8, p97: 85.4 },
  { month: 17, p3: 76.0, p15: 78.6, p50: 81.2, p85: 83.9, p97: 86.5 },
  { month: 18, p3: 76.9, p15: 79.6, p50: 82.3, p85: 85.0, p97: 87.7 },
  { month: 19, p3: 77.7, p15: 80.5, p50: 83.2, p85: 86.0, p97: 88.8 },
  { month: 20, p3: 78.6, p15: 81.4, p50: 84.2, p85: 87.0, p97: 89.8 },
  { month: 21, p3: 79.4, p15: 82.3, p50: 85.1, p85: 88.0, p97: 90.9 },
  { month: 22, p3: 80.2, p15: 83.1, p50: 86.0, p85: 89.0, p97: 91.9 },
  { month: 23, p3: 81.0, p15: 83.9, p50: 86.9, p85: 89.9, p97: 92.9 },
  { month: 24, p3: 81.7, p15: 84.8, p50: 87.8, p85: 90.9, p97: 93.9 },
];

/**
 * Returns the appropriate WHO reference table
 */
export function getWHOTable(metricType = 'weight', sex = 'FEMALE') {
  const isFemale = (sex || 'FEMALE').toUpperCase() !== 'MALE';
  if (metricType === 'length' || metricType === 'height') {
    return isFemale ? WHO_LENGTH_GIRLS : WHO_LENGTH_BOYS;
  }
  return isFemale ? WHO_WEIGHT_GIRLS : WHO_WEIGHT_BOYS;
}

/**
 * Linearly interpolates a WHO percentile value for a continuous age in months
 */
export function interpolateWHOValue(ageMonths, percentileKey, metricType = 'weight', sex = 'FEMALE') {
  const table = getWHOTable(metricType, sex);
  const clampedAge = Math.max(0, Math.min(24, ageMonths));
  const lowerIndex = Math.floor(clampedAge);
  const upperIndex = Math.min(table.length - 1, Math.ceil(clampedAge));

  if (lowerIndex === upperIndex) {
    return table[lowerIndex][percentileKey];
  }

  const fraction = clampedAge - lowerIndex;
  const lowerVal = table[lowerIndex][percentileKey];
  const upperVal = table[upperIndex][percentileKey];
  return lowerVal + (upperVal - lowerVal) * fraction;
}

/**
 * Estimates the percentile (0-100) of a given value at a given age in months.
 * Uses piecewise linear interpolation between P3, P15, P50, P85, P97.
 */
export function estimateWHOPercentile(value, ageMonths, metricType = 'weight', sex = 'FEMALE') {
  if (value == null || isNaN(value) || value <= 0) return null;

  const p3 = interpolateWHOValue(ageMonths, 'p3', metricType, sex);
  const p15 = interpolateWHOValue(ageMonths, 'p15', metricType, sex);
  const p50 = interpolateWHOValue(ageMonths, 'p50', metricType, sex);
  const p85 = interpolateWHOValue(ageMonths, 'p85', metricType, sex);
  const p97 = interpolateWHOValue(ageMonths, 'p97', metricType, sex);

  if (value <= p3) {
    // Below 3rd percentile
    const pct = Math.max(0.5, 3 * (value / p3));
    return Math.round(pct * 10) / 10;
  }
  if (value <= p15) {
    // Between P3 and P15
    const pct = 3 + 12 * ((value - p3) / (p15 - p3));
    return Math.round(pct);
  }
  if (value <= p50) {
    // Between P15 and P50
    const pct = 15 + 35 * ((value - p15) / (p50 - p15));
    return Math.round(pct);
  }
  if (value <= p85) {
    // Between P50 and P85
    const pct = 50 + 35 * ((value - p50) / (p85 - p50));
    return Math.round(pct);
  }
  if (value <= p97) {
    // Between P85 and P97
    const pct = 85 + 12 * ((value - p85) / (p97 - p85));
    return Math.round(pct);
  }

  // Above 97th percentile
  const over = value - p97;
  const spread = p97 - p85;
  const pct = Math.min(99.5, 97 + 2.5 * (over / spread));
  return Math.round(pct * 10) / 10;
}

/**
 * Calculates exact age in decimal months between birthdate and measurement timestamp
 */
export function calculateAgeMonths(birthdateStr, eventDateMs) {
  if (!birthdateStr) return 0;
  const bdate = new Date(birthdateStr).getTime();
  const diffMs = Math.max(0, eventDateMs - bdate);
  const days = diffMs / (24 * 3600 * 1000);
  return days / 30.4375; // average month length
}

/**
 * Formats exact age in human readable format (e.g. "2m 14d" or "10 days")
 */
export function formatAgeString(birthdateStr, eventDateMs) {
  if (!birthdateStr) return '';
  const bdate = new Date(birthdateStr).getTime();
  const diffMs = Math.max(0, eventDateMs - bdate);
  const totalDays = Math.floor(diffMs / (24 * 3600 * 1000));

  if (totalDays === 0) return 'Birth';
  if (totalDays < 30) return `${totalDays}d`;

  const months = Math.floor(totalDays / 30.4375);
  const remainingDays = Math.floor(totalDays - months * 30.4375);

  if (remainingDays === 0) return `${months}m`;
  return `${months}m ${remainingDays}d`;
}

/**
 * Slices WHO curves for SVG chart rendering up to maxMonths (e.g. 6, 12, or 24)
 * Returns arrays of [month, value] for each percentile curve.
 */
export function getWHOCurves(metricType = 'weight', sex = 'FEMALE', maxMonths = 24, isMetric = true) {
  const table = getWHOTable(metricType, sex);
  const filtered = table.filter(row => row.month <= maxMonths);

  // Conversion factor if imperial
  // kg to lb: 2.20462
  // cm to in: 0.393701
  const factor = isMetric ? 1 : (metricType === 'weight' ? 2.20462 : 0.393701);

  return {
    p3: filtered.map(r => ({ x: r.month, y: Math.round(r.p3 * factor * 100) / 100 })),
    p15: filtered.map(r => ({ x: r.month, y: Math.round(r.p15 * factor * 100) / 100 })),
    p50: filtered.map(r => ({ x: r.month, y: Math.round(r.p50 * factor * 100) / 100 })),
    p85: filtered.map(r => ({ x: r.month, y: Math.round(r.p85 * factor * 100) / 100 })),
    p97: filtered.map(r => ({ x: r.month, y: Math.round(r.p97 * factor * 100) / 100 })),
  };
}

/**
 * Extracts and prepares all growth checkpoints for a child from events array
 */
export function extractChildGrowthData(events, childId, birthdateStr, sex = 'FEMALE', isMetric = true) {
  const childEvents = events.filter(e => {
    if (e.type !== 'GROWTH') return false;
    if (childId && e.childKey && e.childKey !== childId) return false;
    return true;
  });

  // Sort ascending chronologically
  const sorted = [...childEvents].sort((a, b) => a.beginDt - b.beginDt);

  const weightPoints = [];
  const lengthPoints = [];

  sorted.forEach(ev => {
    const det = ev.details || {};
    const ageMonths = calculateAgeMonths(birthdateStr, ev.beginDt);
    const ageLabel = formatAgeString(birthdateStr, ev.beginDt);

    // Weight
    let weightVal = det.weightKg;
    if (weightVal == null && det.weightLb) {
      weightVal = det.weightLb * 0.453592;
    }
    if (weightVal != null && weightVal > 0) {
      const percentile = estimateWHOPercentile(weightVal, ageMonths, 'weight', sex);
      const displayVal = isMetric ? weightVal : weightVal * 2.20462;
      weightPoints.push({
        id: ev.id,
        date: ev.beginDt,
        ageMonths,
        ageLabel,
        rawKg: weightVal,
        value: Math.round(displayVal * 100) / 100,
        unit: isMetric ? 'kg' : 'lb',
        percentile,
        caregiver: det.caregiver,
        note: ev.note,
      });
    }

    // Length / Height
    let lengthVal = det.heightCm;
    if (lengthVal == null && det.heightIn) {
      lengthVal = det.heightIn * 2.54;
    }
    if (lengthVal != null && lengthVal > 0) {
      const percentile = estimateWHOPercentile(lengthVal, ageMonths, 'length', sex);
      const displayVal = isMetric ? lengthVal : lengthVal * 0.393701;
      lengthPoints.push({
        id: ev.id,
        date: ev.beginDt,
        ageMonths,
        ageLabel,
        rawCm: lengthVal,
        value: Math.round(displayVal * 10) / 10,
        unit: isMetric ? 'cm' : 'in',
        percentile,
        caregiver: det.caregiver,
        note: ev.note,
      });
    }
  });

  return { weightPoints, lengthPoints };
}

/**
 * Computes high-level summary cards (latest weight, latest length, gain since birth)
 */
export function getGrowthSummary(growthData, isMetric = true) {
  const { weightPoints, lengthPoints } = growthData;

  const latestWeight = weightPoints.length > 0 ? weightPoints[weightPoints.length - 1] : null;
  const initialWeight = weightPoints.length > 0 ? weightPoints[0] : null;

  const latestLength = lengthPoints.length > 0 ? lengthPoints[lengthPoints.length - 1] : null;
  const initialLength = lengthPoints.length > 0 ? lengthPoints[0] : null;

  let totalWeightGain = null;
  if (latestWeight && initialWeight && weightPoints.length > 1) {
    const gain = latestWeight.value - initialWeight.value;
    totalWeightGain = {
      value: Math.round(gain * 100) / 100,
      unit: latestWeight.unit,
      isPositive: gain >= 0,
    };
  }

  let totalLengthGain = null;
  if (latestLength && initialLength && lengthPoints.length > 1) {
    const gain = latestLength.value - initialLength.value;
    totalLengthGain = {
      value: Math.round(gain * 10) / 10,
      unit: latestLength.unit,
      isPositive: gain >= 0,
    };
  }

  return {
    latestWeight,
    initialWeight,
    totalWeightGain,
    latestLength,
    initialLength,
    totalLengthGain,
  };
}
