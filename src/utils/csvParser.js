/**
 * Nara Baby CSV & JSON Data Parser
 * Intelligent multi-format importer supporting dynamic Nara Baby schemas,
 * bracketed columns (e.g. "[Sleep] Duration (Seconds)"), epoch timestamps,
 * caregiver tracking, and automatic profile extraction.
 */

/**
 * Parses raw CSV text into array of object rows respecting quotes and commas
 */
export function parseCSVToRows(csvText) {
  if (!csvText || typeof csvText !== 'string') return [];

  // Remove Byte Order Mark (BOM) if present
  let cleanText = csvText.replace(/^\uFEFF/, '').trim();
  if (!cleanText) return [];

  const rows = [];
  let currentRow = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n in \r\n
      }
      currentRow.push(currentField.trim());
      if (currentRow.some(col => col.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  // Push last field & row if pending
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(col => col.length > 0)) {
      rows.push(currentRow);
    }
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map(h => h.trim());
  const dataObjects = [];

  for (let r = 1; r < rows.length; r++) {
    const rowValues = rows[r];
    const obj = {};
    headers.forEach((header, idx) => {
      obj[header] = rowValues[idx] !== undefined ? rowValues[idx] : '';
    });
    dataObjects.push(obj);
  }

  return dataObjects;
}

/**
 * Normalizes any timestamp, date string, or ISO string to epoch milliseconds
 */
export function parseToTimestampMs(rawDate, rawTime) {
  if (!rawDate) return Date.now();

  // If already a numeric ms or seconds timestamp
  if (typeof rawDate === 'number') {
    return rawDate > 1e11 ? rawDate : rawDate * 1000;
  }
  const numericVal = Number(rawDate);
  if (!isNaN(numericVal) && String(rawDate).trim().length >= 9) {
    return numericVal > 1e11 ? numericVal : numericVal * 1000;
  }

  let dateStr = String(rawDate).trim();
  if (rawTime && String(rawTime).trim()) {
    dateStr = `${dateStr} ${String(rawTime).trim()}`;
  }

  // Try standard Date parse
  let parsed = Date.parse(dateStr);
  if (!isNaN(parsed)) return parsed;

  // Try replacing slash with dash
  parsed = Date.parse(dateStr.replace(/\//g, '-'));
  if (!isNaN(parsed)) return parsed;

  // Try handling DD/MM/YYYY or MM/DD/YYYY
  const parts = dateStr.match(/^(\d{1,4})[./-](\d{1,2})[./-](\d{1,4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(?:\s*(AM|PM))?)?/i);
  if (parts) {
    let [_, p1, p2, p3, hour, min, sec, ampm] = parts;
    let year = Number(p3.length === 4 ? p3 : p1);
    let month = Number(p3.length === 4 ? p1 : p2) - 1;
    let day = Number(p3.length === 4 ? p2 : p3);

    let h = hour ? Number(hour) : 0;
    const m = min ? Number(min) : 0;
    const s = sec ? Number(sec) : 0;

    if (ampm) {
      if (ampm.toUpperCase() === 'PM' && h < 12) h += 12;
      if (ampm.toUpperCase() === 'AM' && h === 12) h = 0;
    }

    const d = new Date(year, month, day, h, m, s);
    if (!isNaN(d.getTime())) return d.getTime();
  }

  return Date.now();
}

/**
 * Normalizes duration string or number into milliseconds
 */
export function parseDurationMs(durationVal, isSeconds = false) {
  if (!durationVal) return 0;
  if (typeof durationVal === 'number') {
    if (isSeconds) return Math.round(durationVal * 1000);
    return durationVal > 100000 ? durationVal : Math.round(durationVal * 60000);
  }

  const str = String(durationVal).toLowerCase().trim();
  if (!str) return 0;

  // If explicit seconds column
  if (isSeconds) {
    const secNum = parseFloat(str);
    if (!isNaN(secNum)) return Math.round(secNum * 1000);
  }

  // Check if "XXh YYm" or "XX hours YY mins"
  let totalMs = 0;
  const hourMatch = str.match(/(\d+)\s*(?:h|hr|hour|hours)/);
  if (hourMatch) totalMs += parseInt(hourMatch[1], 10) * 3600000;

  const minMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:m|min|minute|minutes)/);
  if (minMatch) totalMs += Math.round(parseFloat(minMatch[1]) * 60000);

  const secMatch = str.match(/(\d+)\s*(?:s|sec|second|seconds)/);
  if (secMatch) totalMs += parseInt(secMatch[1], 10) * 1000;

  if (totalMs > 0) return totalMs;

  // If format "HH:MM:SS" or "MM:SS"
  if (str.includes(':')) {
    const parts = str.split(':').map(Number);
    if (parts.length === 3) {
      return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
    } else if (parts.length === 2) {
      return (parts[0] * 60 + parts[1]) * 1000;
    }
  }

  // Plain number
  const num = parseFloat(str);
  if (!isNaN(num)) {
    // If it's a huge number (> 100000), it's ms
    if (num > 100000) return Math.round(num);
    // Otherwise assume minutes by default
    return Math.round(num * 60000);
  }

  return 0;
}

/**
 * Normalizes volume numbers to fluid ounces (FLOZ)
 */
function parseVolumeFloz(val, unit = '') {
  if (val === null || val === undefined || val === '') return 0;
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return 0;

  const u = String(unit).toLowerCase();
  if (u.includes('ml')) {
    return Math.round((num / 29.5735) * 10) / 10;
  }
  return Math.round(num * 10) / 10;
}

/**
 * Finds matching key from object regardless of case, punctuation, or brackets
 */
function getField(obj, ...candidates) {
  const keys = Object.keys(obj);
  for (const candidate of candidates) {
    // Exact match first
    if (obj[candidate] !== undefined && obj[candidate] !== '') {
      return obj[candidate];
    }
    // Normalized match
    const normCand = candidate.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const k of keys) {
      const normK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normK === normCand && obj[k] !== undefined && obj[k] !== '') {
        return obj[k];
      }
    }
  }
  return undefined;
}

/**
 * Classifies row into standard activity category
 */
function classifyActivityType(row) {
  const rawType = String(
    getField(row, 'Type', 'trackTypeKey', 'trackGroupKey', 'Activity', 'Category', 'EventType') || ''
  ).toUpperCase();

  const rawSubType = String(
    getField(row, 'SubType', 'feedType', 'Detail', 'diaperType', 'routineName', '[Diaper] Type') || ''
  ).toUpperCase();

  if (rawType.includes('BREAST') || rawType === 'BREASTFEED' || rawType === 'FEED.BREAST' || rawSubType.includes('BREAST')) return 'BREAST';
  if (rawType.includes('BOTTLE') || rawType === 'FEED.BOTTLE' || rawSubType.includes('BOTTLE')) return 'BOTTLE';
  if (rawType.includes('SOLID') || rawType === 'FEED.SOLID' || rawSubType.includes('SOLID')) return 'SOLIDS';
  if (rawType.includes('COMBO') || rawType === 'FEED.COMBO') return 'COMBO';
  if (rawType.includes('FEED') || rawType.includes('NURSE')) {
    if (rawSubType.includes('BOTTLE') || getField(row, 'Volume', 'Amount', 'bottleVolume', '[Bottle] Amount')) return 'BOTTLE';
    return 'BREAST';
  }
  if (rawType.includes('SLEEP') || rawType.includes('NAP')) return 'SLEEP';
  if (rawType.includes('DIAPER') || rawType.includes('NAPPY') || rawType.includes('POOP') || rawType.includes('PEE')) return 'DIAPER';
  if (rawType.includes('PUMP')) return 'PUMP';
  if (rawType.includes('GROW') || rawType.includes('WEIGHT') || rawType.includes('HEIGHT') || rawType.includes('MEASURE')) return 'GROWTH';
  if (rawType.includes('BABY FIRST') || rawType.includes('FIRST') || rawType.includes('MILESTONE')) return 'MILESTONE';
  if (rawType.includes('MED') || rawType.includes('HEALTH') || rawType.includes('TEMP') || rawType.includes('VACCINE')) return 'HEALTH';
  if (rawType.includes('ROUTINE') || rawType.includes('TUMMY') || rawType.includes('BATH')) return 'ROUTINE';
  if (rawType.includes('NOTE') || rawType.includes('JOURNAL') || rawType.includes('PARENT_NOTE')) return 'NOTE';
  if (rawType === 'PROFILE') return 'PROFILE';

  return 'OTHER';
}

/**
 * Parses parsed CSV rows into standardized Nara AppEvent items
 * Also extracts child profile info and preferred unit system.
 */
export function convertNaraRowsToEvents(rows, defaultChildId = 'child_1') {
  const events = [];
  let detectedProfile = null;
  const detectedUnits = {
    weightUnit: null,
    lengthUnit: null,
    tempUnit: null,
  };

  rows.forEach((row, index) => {
    try {
      const type = classifyActivityType(row);

      // Extract Profile row
      if (type === 'PROFILE') {
        const name = getField(row, 'Profile Name', 'name', 'Child Name');
        const birthdate = getField(row, '[Profile] Birth Date', 'Birth Date', 'birthdate');
        const sex = getField(row, '[Profile] Sex', 'Sex');
        const profileKey = getField(row, '_profileKey', 'profileKey');
        detectedProfile = {
          name: name || 'Baby',
          birthdate: birthdate || '',
          sex: sex || '',
          key: profileKey || defaultChildId,
        };
        return; // don't add Profile as a timeline event
      }

      const childName = getField(row, 'Profile Name', 'Child', 'ChildName', 'ChildKey', 'childKey');
      const childKey = childName || defaultChildId;

      if (!detectedProfile && childName) {
        const bDate = getField(row, '[Profile] Birth Date', 'Birth Date');
        if (bDate || childName) {
          detectedProfile = {
            name: childName,
            birthdate: bDate || '',
            key: childKey,
          };
        }
      }

      // Caregiver
      const caregiver = getField(row, 'Created By Caregiver', 'CreatedBy', 'Caregiver', 'Last Updated By Caregiver') || '';

      // Start & End Timestamps (Check Epoch first)
      const epochBegin = getField(row, 'Start Date/time (Epoch)', 'beginDt', 'Start (Epoch)', 'Timestamp');
      const rawBegin = getField(row, 'Start Date/time', 'Date', 'Start Time', 'StartTime', 'DateTime', 'Start');
      const rawTime = getField(row, 'Time', 'Begin Time');
      const beginDt = epochBegin ? parseToTimestampMs(epochBegin) : parseToTimestampMs(rawBegin, rawTime);

      // Check End Date (Epoch first, then string)
      const epochEnd = getField(row, '[Sleep] End Date/time (Epoch)', 'endDt', 'End Date/time (Epoch)', 'End (Epoch)');
      const rawEnd = getField(row, '[Sleep] End Date/time', 'End Date/time', 'End Date', 'End Time', 'EndTime', 'End');
      let endDt = epochEnd ? parseToTimestampMs(epochEnd) : (rawEnd ? parseToTimestampMs(rawEnd) : null);

      // Duration: check bracketed seconds first!
      let durationMs = 0;
      const sleepSec = getField(row, '[Sleep] Duration (Seconds)', 'Duration (Seconds)');
      if (sleepSec) {
        durationMs = parseDurationMs(sleepSec, true);
      } else {
        const rawDur = getField(row, 'Duration', 'duration', 'Duration (min)', 'Duration (ms)', 'durationMs');
        durationMs = parseDurationMs(rawDur, false);
      }

      if (!durationMs && endDt && endDt > beginDt) {
        durationMs = endDt - beginDt;
      }
      if (durationMs && !endDt) {
        endDt = beginDt + durationMs;
      }

      const note = String(getField(row, 'Note', 'Notes', 'Comment', 'note', 'description') || '').trim();

      // Details payload per type
      const details = {};
      if (caregiver) details.caregiver = caregiver;

      if (type === 'BREAST') {
        const beginSide = getField(row, '[Breastfeed] Begin Side', 'breastBeginSide', 'Side', 'Side Nursed');
        const endSide = getField(row, '[Breastfeed] End Side', 'breastEndSide');

        // Check explicit seconds columns from Nara export
        const leftSec = getField(row, '[Breastfeed] Left Duration (Seconds)', 'breastLeftDuration (Seconds)');
        const rightSec = getField(row, '[Breastfeed] Right Duration (Seconds)', 'breastRightDuration (Seconds)');

        const leftMs = leftSec ? parseDurationMs(leftSec, true) : parseDurationMs(getField(row, 'Left Duration', 'breastLeftDuration', 'Left (min)'), false);
        const rightMs = rightSec ? parseDurationMs(rightSec, true) : parseDurationMs(getField(row, 'Right Duration', 'breastRightDuration', 'Right (min)'), false);

        details.leftDurationMs = leftMs || 0;
        details.rightDurationMs = rightMs || 0;

        if (details.leftDurationMs > 0 && details.rightDurationMs > 0) {
          details.side = 'BOTH';
        } else if (details.leftDurationMs > 0) {
          details.side = 'LEFT';
        } else if (details.rightDurationMs > 0) {
          details.side = 'RIGHT';
        } else {
          const rawSide = String(beginSide || endSide || 'LEFT').replace(/\.nonTimer/i, '').trim().toUpperCase();
          details.side = rawSide || 'LEFT';
        }

        const totalBfMs = details.leftDurationMs + details.rightDurationMs;
        if (totalBfMs > 0) {
          durationMs = totalBfMs;
          if (!endDt) endDt = beginDt + durationMs;
        }
      } else if (type === 'BOTTLE') {
        const amt = getField(row, '[Bottle] Amount', 'Amount', 'Volume', 'bottleVolume', 'bottleVolumeNum', 'Ounces', 'Oz', 'mL');
        const unit = getField(row, '[Bottle] Unit', 'Unit', 'bottleVolumeUnit') || 'oz';
        details.volumeFloz = parseVolumeFloz(amt, unit);

        const isFormula = String(getField(row, '[Bottle] Milk Type', 'Milk Type', 'Formula', 'bottleTypeFormula') || '').toLowerCase().includes('formula');
        details.milkType = isFormula ? 'FORMULA' : 'BREAST_MILK';
        details.formulaName = getField(row, '[Bottle] Formula Name', 'Formula Name', 'formulaName', 'Brand') || '';
      } else if (type === 'SLEEP') {
        details.sleepType = String(getField(row, 'Sleep Type', 'Type of Sleep') || '').toLowerCase().includes('night') ? 'NIGHT' : 'NAP';
      } else if (type === 'DIAPER') {
        const rawDiaperType = String(getField(row, '[Diaper] Type', 'Diaper Type', 'diaperType', 'Contents', 'SubType') || '').toLowerCase();
        
        // Exact handling for Nara export types: 'Dirty Wet', 'Dirty', 'Wet', 'Dry'
        const hasPee = rawDiaperType.includes('wet') || rawDiaperType.includes('pee') || Boolean(getField(row, 'diaperTypePee'));
        const hasPoop = rawDiaperType.includes('dirty') || rawDiaperType.includes('poop') || Boolean(getField(row, 'diaperTypePoop'));
        const isDry = rawDiaperType.includes('dry') || Boolean(getField(row, 'diaperTypeDry'));

        details.pee = hasPee || (!hasPoop && !isDry);
        details.poop = hasPoop;
        details.dry = isDry;
        details.color = getField(row, '[Diaper] Dirty Color', 'Poop Color', 'Color', 'diaperPoopColor', 'diaperDirtyColor') || '';
        details.texture = getField(row, '[Diaper] Dirty Texture', 'Poop Texture', 'Texture', 'diaperPoopTexture', 'diaperDirtyTexture') || '';
        details.blowout = Boolean(getField(row, 'Blowout', 'diaperPoopBlowout') || rawDiaperType.includes('blowout'));
        details.rash = Boolean(getField(row, 'Rash', 'diaperTypeRash') || rawDiaperType.includes('rash'));
        details.detail = getField(row, '[Diaper] Detail', 'Detail') || '';
      } else if (type === 'PUMP') {
        const leftVol = getField(row, '[Pump] Left Volume', 'Left Volume', 'breastLeftVolume', 'Left Oz');
        const rightVol = getField(row, '[Pump] Right Volume', 'Right Volume', 'breastRightVolume', 'Right Oz');
        details.leftFloz = parseVolumeFloz(leftVol);
        details.rightFloz = parseVolumeFloz(rightVol);
        const total = getField(row, '[Pump] Total Volume', 'Total Volume', 'Amount', 'Volume');
        details.totalFloz = details.leftFloz + details.rightFloz || parseVolumeFloz(total);
      } else if (type === 'GROWTH') {
        const rawWeight = getField(row, '[Growth] Weight', 'Weight', 'weightLb', 'weightNum');
        const weightUnit = (getField(row, '[Growth] Weight Unit', 'Weight Unit') || 'LB').toUpperCase();
        if (weightUnit === 'KG') detectedUnits.weightUnit = 'kg';

        const rawHeight = getField(row, '[Growth] Height', 'Height', 'heightIn', 'Length');
        const heightUnit = (getField(row, '[Growth] Height Unit', 'Height Unit') || 'IN').toUpperCase();
        if (heightUnit === 'CM') detectedUnits.lengthUnit = 'cm';

        const rawHead = getField(row, '[Growth] Head Size', 'Head Size', 'headIn', 'Head Circumference');
        const headUnit = (getField(row, '[Growth] Head Size Unit', 'Head Size Unit') || 'IN').toUpperCase();

        if (rawWeight) {
          const w = parseFloat(rawWeight);
          details.weightLb = weightUnit === 'KG' ? Math.round((w / 0.453592) * 100) / 100 : w;
          details.weightKg = weightUnit === 'KG' ? w : Math.round(w * 0.453592 * 100) / 100;
        }

        if (rawHeight) {
          const h = parseFloat(rawHeight);
          details.heightIn = heightUnit === 'CM' ? Math.round((h / 2.54) * 10) / 10 : h;
          details.heightCm = heightUnit === 'CM' ? h : Math.round(h * 2.54 * 10) / 10;
        }

        if (rawHead) {
          const hd = parseFloat(rawHead);
          details.headIn = headUnit === 'CM' ? Math.round((hd / 2.54) * 10) / 10 : hd;
          details.headCm = headUnit === 'CM' ? hd : Math.round(hd * 2.54 * 10) / 10;
        }
      } else if (type === 'SOLIDS') {
        details.food = getField(row, '[Solid] Food', 'Food', 'Solid Food', 'Meals') || note || 'Solid Feed';
        details.reaction = getField(row, '[Solid] Reaction', 'Reaction', 'Loved', 'Like') || 'liked';
      } else if (type === 'HEALTH') {
        details.medicineName = getField(row, '[Medical] Medication', 'Medication', 'Medicine', 'medicineName') || '';
        const rawTemp = getField(row, '[Medical] Temperature', 'Temperature', 'temp_f', 'temperatureNum');
        const tempUnit = (getField(row, '[Medical] Temperature Unit', 'Temperature Unit') || 'F').toUpperCase();
        if (tempUnit === 'C') detectedUnits.tempUnit = 'C';

        if (rawTemp) {
          const t = parseFloat(rawTemp);
          details.temperatureF = tempUnit === 'C' ? Math.round(((t * 9) / 5 + 32) * 10) / 10 : t;
          details.temperatureC = tempUnit === 'C' ? t : Math.round((((t - 32) * 5) / 9) * 10) / 10;
        }
        details.doctorName = getField(row, 'Doctor', 'doctorName', 'Clinic') || '';
        details.vaccineName = getField(row, 'Vaccine', 'vaccineName') || '';
      } else if (type === 'ROUTINE') {
        details.routineName = getField(row, 'Routine', 'routineName', 'Activity') || 'Tummy Time';
      } else if (type === 'MILESTONE') {
        const rawType = String(getField(row, 'Type', 'trackTypeKey', 'Activity') || '').toUpperCase();
        const mFirst = getField(row, '[Baby First] Baby First', 'Baby First');
        const mMilestone = getField(row, '[Milestone] Milestone', 'Milestone', 'milestoneName');
        const mText = mFirst || mMilestone;
        details.milestoneName = mText || note || 'Baby First';
        details.isBabyFirst = Boolean(mFirst) || rawType.includes('BABY FIRST') || rawType.includes('FIRST');
      }

      const id = getField(row, '_activityKey') || `imp_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 6)}`;

      events.push({
        id,
        childKey,
        type,
        beginDt,
        endDt,
        durationMs,
        details,
        note,
      });
    } catch (err) {
      console.warn('Error parsing row:', row, err);
    }
  });

  // Collect unique caregivers
  const caregivers = Array.from(new Set(events.map(e => e.details?.caregiver).filter(Boolean)));

  // Sort events chronologically (newest first)
  const sortedEvents = events.sort((a, b) => b.beginDt - a.beginDt);

  return {
    events: sortedEvents,
    detectedProfile,
    detectedUnits,
    detectedCaregivers: caregivers,
  };
}

/**
 * Parses Nara JSON backup format (NaraGaiden / Firebase export)
 */
export function convertNaraJsonToEvents(jsonData, defaultChildId = 'child_1') {
  if (!jsonData) return { events: [], detectedProfile: null, detectedUnits: {} };
  let rawEvents = [];

  if (Array.isArray(jsonData)) {
    rawEvents = jsonData;
  } else if (Array.isArray(jsonData.events)) {
    rawEvents = jsonData.events;
  } else if (jsonData.trackz && typeof jsonData.trackz === 'object') {
    rawEvents = Object.values(jsonData.trackz);
  } else {
    rawEvents = Object.values(jsonData);
  }

  const mappedRows = rawEvents.map(ev => {
    const payload = ev.payload || {};
    return {
      ...payload,
      ...ev,
      Type: ev.trackTypeKey || ev.trackGroupKey || ev.type || payload.type,
      beginDt: ev.beginDt || payload.beginDt,
      endDt: ev.endDt || payload.endDt,
      note: ev.note || payload.note,
    };
  });

  return convertNaraRowsToEvents(mappedRows, defaultChildId);
}

/**
 * Analyzes parsed events to generate an import preview summary
 */
export function generateImportSummary(events) {
  const summary = {
    total: events.length,
    byType: {},
    earliestDate: null,
    latestDate: null,
    childKeys: new Set(),
    sampleEvents: events.slice(0, 5),
  };

  events.forEach(ev => {
    summary.byType[ev.type] = (summary.byType[ev.type] || 0) + 1;
    if (ev.childKey) summary.childKeys.add(ev.childKey);

    if (!summary.earliestDate || ev.beginDt < summary.earliestDate) {
      summary.earliestDate = ev.beginDt;
    }
    if (!summary.latestDate || ev.beginDt > summary.latestDate) {
      summary.latestDate = ev.beginDt;
    }
  });

  summary.childCount = summary.childKeys.size;
  return summary;
}

/**
 * Converts internal events to Nara-compatible CSV export string
 */
export function exportEventsToNaraCSV(events, childName = 'Baby') {
  if (!events || events.length === 0) return '';

  const headers = [
    'Type',
    'Profile Name',
    'Start Date/time',
    'Start Date/time (Epoch)',
    'Created By Caregiver',
    'Last Updated By Caregiver',
    'Note',
    'Time Zone',
    '[Sleep] Duration (Seconds)',
    '[Sleep] End Date/time',
    '[Sleep] End Date/time (Epoch)',
    '[Breastfeed] Begin Side',
    '[Breastfeed] End Side',
    '[Breastfeed] Left Duration (Seconds)',
    '[Breastfeed] Right Duration (Seconds)',
    '[Growth] Head Size',
    '[Growth] Head Size Unit',
    '[Growth] Height',
    '[Growth] Height Unit',
    '[Growth] Weight',
    '[Growth] Weight Unit',
    '[Diaper] Type',
    '[Diaper] Detail',
    '[Diaper] Dirty Color',
    '[Diaper] Dirty Texture',
    '[Baby First] Baby First',
    '[Medical] Medication',
    '[Medical] Temperature',
    '[Medical] Temperature Unit',
    '[Milestone] Milestone',
    '_activityKey'
  ];

  const rows = [headers.map(h => `"${h}"`).join(',')];

  events.forEach(ev => {
    const d = new Date(ev.beginDt);
    const dateStr = d.toISOString().replace('T', ' ').substring(0, 19);
    const epochStr = String(ev.beginDt);
    const det = ev.details || {};

    const sleepSec = ev.type === 'SLEEP' && ev.durationMs ? String(Math.round(ev.durationMs / 1000)) : '';
    const sleepEndStr = ev.type === 'SLEEP' && ev.endDt ? new Date(ev.endDt).toISOString().replace('T', ' ').substring(0, 19) : '';
    const sleepEndEpoch = ev.type === 'SLEEP' && ev.endDt ? String(ev.endDt) : '';

    const leftSec = det.leftDurationMs ? String(Math.round(det.leftDurationMs / 1000)) : '';
    const rightSec = det.rightDurationMs ? String(Math.round(det.rightDurationMs / 1000)) : '';

    let diaperType = '';
    if (ev.type === 'DIAPER') {
      if (det.pee && det.poop) diaperType = 'Dirty Wet';
      else if (det.poop) diaperType = 'Dirty';
      else if (det.pee) diaperType = 'Wet';
      else if (det.dry) diaperType = 'Dry';
    }

    const clean = (val) => {
      if (val === null || val === undefined || val === '') return '';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const row = [
      clean(ev.type === 'BREAST' ? 'Breastfeed' : ev.type === 'SLEEP' ? 'Sleep' : ev.type === 'DIAPER' ? 'Diaper' : ev.type === 'GROWTH' ? 'Growth' : ev.type === 'HEALTH' ? 'Medical' : ev.type === 'MILESTONE' ? 'Baby First' : ev.type),
      clean(childName),
      clean(dateStr),
      clean(epochStr),
      clean(det.caregiver || 'Parent'),
      clean(det.caregiver || 'Parent'),
      clean(ev.note || ''),
      clean('Europe/Brussels'),
      clean(sleepSec),
      clean(sleepEndStr),
      clean(sleepEndEpoch),
      clean(det.side === 'BOTH' ? 'LEFT' : det.side || ''),
      clean(det.side === 'BOTH' ? 'RIGHT' : det.side || ''),
      clean(leftSec),
      clean(rightSec),
      clean(det.headCm || det.headIn || ''),
      clean(det.headCm ? 'CM' : (det.headIn ? 'IN' : '')),
      clean(det.heightCm || det.heightIn || ''),
      clean(det.heightCm ? 'CM' : (det.heightIn ? 'IN' : '')),
      clean(det.weightKg || det.weightLb || ''),
      clean(det.weightKg ? 'KG' : (det.weightLb ? 'LB' : '')),
      clean(diaperType),
      clean(det.detail || ''),
      clean(det.color || ''),
      clean(det.texture || ''),
      clean(ev.type === 'MILESTONE' ? (det.milestoneName || '') : ''),
      clean(det.medicineName || ''),
      clean(det.temperatureC || det.temperatureF || ''),
      clean(det.temperatureC ? 'C' : (det.temperatureF ? 'F' : '')),
      clean(det.milestoneName || ''),
      clean(ev.id)
    ];

    rows.push(row.join(','));
  });

  return rows.join('\n');
}
