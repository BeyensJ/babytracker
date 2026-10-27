import React, { useState, useMemo } from 'react';
import { Pill, Thermometer } from 'lucide-react';
import { FEVER_THRESHOLDS_C, FEVER_THRESHOLDS_F } from '../../utils/sickModeCalculator';

export function FeverCurveChart({ chartPoints = [], preferences = {}, language = 'nl' }) {
  const [selectedPoint, setSelectedPoint] = useState(null);
  const isMetric = preferences.tempUnit === 'C';
  const isDutch = language === 'nl';

  // Dimensions
  const width = 600;
  const height = 220;
  const padding = { top: 25, right: 30, bottom: 35, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Filter and calculate points and scales
  const { tempPoints, medPoints, minTime, maxTime, minTemp, maxTemp } = useMemo(() => {
    const temps = chartPoints.filter((p) => p.type === 'TEMP');
    const meds = chartPoints.filter((p) => p.type === 'MED');

    if (temps.length === 0) {
      return { tempPoints: [], medPoints: [], minTime: 0, maxTime: 0, minTemp: 36, maxTemp: 40 };
    }

    const allTimes = chartPoints.map((p) => p.timestamp);
    const minT = Math.min(...allTimes);
    const maxT = Math.max(...allTimes);

    // Temperature bounds
    const tempVals = temps.map((p) => (isMetric ? p.tempC : p.tempF));
    const lowest = Math.min(...tempVals);
    const highest = Math.max(...tempVals);

    const minBound = isMetric ? Math.min(36.0, Math.floor(lowest * 2) / 2 - 0.5) : Math.min(96.8, lowest - 1.0);
    const maxBound = isMetric ? Math.max(40.0, Math.ceil(highest * 2) / 2 + 0.5) : Math.max(104.0, highest + 1.0);

    return {
      tempPoints: temps,
      medPoints: meds,
      minTime: minT,
      maxTime: Math.max(maxT, minT + 3600000), // at least 1h range
      minTemp: minBound,
      maxTemp: maxBound,
    };
  }, [chartPoints, isMetric]);

  // Scales
  const getX = (ts) => {
    if (maxTime === minTime) return padding.left + chartW / 2;
    const ratio = (ts - minTime) / (maxTime - minTime);
    return padding.left + ratio * chartW;
  };

  const getY = (tempVal) => {
    if (maxTemp === minTemp) return padding.top + chartH / 2;
    const ratio = (tempVal - minTemp) / (maxTemp - minTemp);
    return padding.top + chartH - ratio * chartH;
  };

  // Threshold lines
  const normalThreshold = isMetric ? FEVER_THRESHOLDS_C.NORMAL_MAX : FEVER_THRESHOLDS_F.NORMAL_MAX;
  const highThreshold = isMetric ? FEVER_THRESHOLDS_C.HIGH_FEVER_MIN : FEVER_THRESHOLDS_F.HIGH_FEVER_MIN;

  const yNormal = getY(normalThreshold);
  const yHigh = getY(highThreshold);

  // SVG Path for temperature line
  const { pathD, areaD } = useMemo(() => {
    if (tempPoints.length < 2) {
      return { pathD: '', areaD: '' };
    }
    const path = tempPoints.reduce((acc, curr, idx) => {
      const x = getX(curr.timestamp);
      const y = getY(isMetric ? curr.tempC : curr.tempF);
      return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');

    const firstX = getX(tempPoints[0].timestamp);
    const lastX = getX(tempPoints[tempPoints.length - 1].timestamp);
    const bottomY = padding.top + chartH;
    const area = `${path} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;

    return { pathD: path, areaD: area };
  }, [tempPoints, isMetric, minTime, maxTime, minTemp, maxTemp, chartH, padding.top]);

  if (tempPoints.length === 0) {
    return (
      <div className="fever-chart-empty">
        <Thermometer size={28} className="fever-chart-empty-icon" />
        <div className="fever-chart-empty-text">
          {isDutch
            ? 'Nog geen temperatuurmetingen geregistreerd tijdens deze ziekteperiode.'
            : 'No temperature readings recorded yet during this illness.'}
        </div>
        <div className="fever-chart-empty-sub">
          {isDutch
            ? 'Tik hierboven op "Meet" om een meting toe te voegen.'
            : 'Tap "Log" above to record a temperature reading.'}
        </div>
      </div>
    );
  }

  return (
    <div className="fever-curve-container">
      <div className="fever-curve-legend">
        <div className="legend-item">
          <span className="legend-dot normal" />
          <span>{isDutch ? 'Normaal (<37.5°)' : 'Normal (<99.5°)'}</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot elevated" />
          <span>{isDutch ? 'Verhoging (37.5–38.4°)' : 'Elevated'}</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot high" />
          <span>{isDutch ? 'Hoge koorts (≥38.5°)' : 'High Fever'}</span>
        </div>
        <div className="legend-item">
          <Pill size={12} color="var(--color-pump)" />
          <span>{isDutch ? 'Medicatie' : 'Medication'}</span>
        </div>
      </div>

      <div style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="fever-curve-svg"
          style={{ width: '100%', height: 'auto', display: 'block' }}
        >
          <defs>
            <linearGradient id="feverAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-health)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--color-health)" stopOpacity="0.03" />
            </linearGradient>
            <filter id="shadowPoint" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodOpacity="0.25" />
            </filter>
          </defs>

          {/* Background Zones */}
          {/* Normal Zone (bottom) */}
          {yNormal < padding.top + chartH && (
            <rect
              x={padding.left}
              y={Math.max(padding.top, yNormal)}
              width={chartW}
              height={Math.max(0, padding.top + chartH - Math.max(padding.top, yNormal))}
              fill="rgba(46, 115, 57, 0.05)"
            />
          )}
          {/* Elevated Zone (middle) */}
          {yHigh < yNormal && (
            <rect
              x={padding.left}
              y={Math.max(padding.top, yHigh)}
              width={chartW}
              height={Math.max(0, yNormal - Math.max(padding.top, yHigh))}
              fill="rgba(217, 119, 6, 0.06)"
            />
          )}
          {/* High Fever Zone (top) */}
          {yHigh > padding.top && (
            <rect
              x={padding.left}
              y={padding.top}
              width={chartW}
              height={Math.max(0, yHigh - padding.top)}
              fill="rgba(225, 29, 72, 0.08)"
            />
          )}

          {/* Reference Threshold Lines */}
          <line
            x1={padding.left}
            y1={yNormal}
            x2={padding.left + chartW}
            y2={yNormal}
            stroke="var(--status-green)"
            strokeDasharray="4 3"
            strokeOpacity="0.45"
            strokeWidth="1"
          />
          <text
            x={padding.left + 5}
            y={yNormal - 4}
            fill="var(--status-green)"
            fontSize="10"
            fontWeight="600"
            opacity="0.8"
          >
            {isMetric ? '37.5°C' : '99.5°F'}
          </text>

          <line
            x1={padding.left}
            y1={yHigh}
            x2={padding.left + chartW}
            y2={yHigh}
            stroke="var(--color-health)"
            strokeDasharray="4 3"
            strokeOpacity="0.5"
            strokeWidth="1"
          />
          <text
            x={padding.left + 5}
            y={yHigh - 4}
            fill="var(--color-health)"
            fontSize="10"
            fontWeight="600"
            opacity="0.8"
          >
            {isMetric ? '38.5°C' : '101.3°F'}
          </text>

          {/* Area & Line */}
          {areaD && <path d={areaD} fill="url(#feverAreaGrad)" />}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="var(--color-health)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Medication Indicators (Vertical Dotted Lines + Pill Icons) */}
          {medPoints.map((med) => {
            const mx = getX(med.timestamp);
            const isParacetamol = med.medClass === 'PARACETAMOL';
            return (
              <g key={`med_${med.id}`} className="fever-med-marker" onClick={() => setSelectedPoint(med)}>
                <line
                  x1={mx}
                  y1={padding.top}
                  x2={mx}
                  y2={padding.top + chartH}
                  stroke={isParacetamol ? 'var(--color-terracotta)' : 'var(--color-pump)'}
                  strokeDasharray="3 3"
                  strokeWidth="1.5"
                  opacity="0.75"
                />
                {/* Pill badge at top */}
                <circle
                  cx={mx}
                  cy={padding.top + 6}
                  r="9"
                  fill="var(--bg-card)"
                  stroke={isParacetamol ? 'var(--color-terracotta)' : 'var(--color-pump)'}
                  strokeWidth="1.5"
                  filter="url(#shadowPoint)"
                  style={{ cursor: 'pointer' }}
                />
                <text
                  x={mx}
                  y={padding.top + 9.5}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="700"
                  fill={isParacetamol ? 'var(--color-terracotta)' : 'var(--color-pump)'}
                  style={{ cursor: 'pointer' }}
                >
                  💊
                </text>
              </g>
            );
          })}

          {/* Temperature Points */}
          {tempPoints.map((pt) => {
            const px = getX(pt.timestamp);
            const py = getY(isMetric ? pt.tempC : pt.tempF);
            const isHigh = pt.status === 'HIGH_FEVER';
            const isElevated = pt.status === 'ELEVATED';

            const dotColor = isHigh ? 'var(--color-health)' : isElevated ? 'var(--status-amber)' : 'var(--status-green)';

            return (
              <g
                key={`temp_${pt.id}`}
                className="fever-temp-marker"
                onClick={() => setSelectedPoint(pt)}
                style={{ cursor: 'pointer' }}
              >
                <circle
                  cx={px}
                  cy={py}
                  r="7"
                  fill="var(--bg-card)"
                  stroke={dotColor}
                  strokeWidth="2.5"
                  filter="url(#shadowPoint)"
                />
                <circle cx={px} cy={py} r="3" fill={dotColor} />

                {/* Value label directly above point */}
                <text
                  x={px}
                  y={py - 11}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  fill="var(--text-primary)"
                >
                  {isMetric ? `${pt.tempC}°` : `${pt.tempF}°`}
                </text>
              </g>
            );
          })}

          {/* Time Axis Labels (Bottom) */}
          {tempPoints.map((pt, i) => {
            // Show time on select points to prevent overcrowding
            if (tempPoints.length > 5 && i % Math.ceil(tempPoints.length / 5) !== 0 && i !== tempPoints.length - 1) {
              return null;
            }
            const px = getX(pt.timestamp);
            const timeStr = new Date(pt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return (
              <text
                key={`tlabel_${pt.id}`}
                x={px}
                y={padding.top + chartH + 18}
                textAnchor="middle"
                fontSize="10"
                fill="var(--text-tertiary)"
                fontWeight="500"
              >
                {timeStr}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Selected Point Popover / Details */}
      {selectedPoint && (
        <div className="fever-point-detail-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              {selectedPoint.type === 'MED' ? (
                <div className="point-icon med">
                  <Pill size={14} />
                </div>
              ) : (
                <div className={`point-icon temp ${selectedPoint.status?.toLowerCase()}`}>
                  <Thermometer size={14} />
                </div>
              )}
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                {selectedPoint.type === 'MED'
                  ? `${selectedPoint.name} ${selectedPoint.dosage ? `(${selectedPoint.dosage})` : ''}`
                  : (isMetric ? `${selectedPoint.tempC}°C` : `${selectedPoint.tempF}°F`)}
              </span>
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              {new Date(selectedPoint.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {selectedPoint.note && (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
              "{selectedPoint.note}"
            </div>
          )}

          <button
            type="button"
            className="point-close-btn"
            onClick={() => setSelectedPoint(null)}
          >
            {isDutch ? 'Sluiten' : 'Dismiss'}
          </button>
        </div>
      )}
    </div>
  );
}
