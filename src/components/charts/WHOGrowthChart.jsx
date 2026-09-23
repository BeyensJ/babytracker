import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  getWHOCurves,
  extractChildGrowthData,
  getGrowthSummary,
} from '../../utils/whoGrowthData';
import { Scale, Ruler, Info, Calendar, User, TrendingUp } from 'lucide-react';

export function WHOGrowthChart({ allEvents }) {
  const { activeChild, preferences, openModal, t, language } = useApp();
  const [metricType, setMetricType] = useState('weight'); // 'weight' | 'length'
  const [maxMonths, setMaxMonths] = useState(6); // 6, 12, 24
  const [activePoint, setActivePoint] = useState(null);
  const [unitOverride, setUnitOverride] = useState(null); // null (use preferences), 'metric', 'imperial'

  const isMetric = unitOverride !== null
    ? unitOverride === 'metric'
    : (metricType === 'weight' ? preferences.weightUnit === 'kg' : preferences.lengthUnit === 'cm');

  const sex = activeChild?.sex || 'FEMALE';
  const birthdate = activeChild?.birthdate;

  // Extract all growth points for active child across full timeline
  const growthData = useMemo(() => {
    return extractChildGrowthData(
      allEvents || [],
      activeChild?.id,
      birthdate,
      sex,
      isMetric
    );
  }, [allEvents, activeChild?.id, birthdate, sex, isMetric]);

  const summary = useMemo(() => {
    return getGrowthSummary(growthData, isMetric);
  }, [growthData, isMetric]);

  // Points to display based on selected metric
  const points = metricType === 'weight' ? growthData.weightPoints : growthData.lengthPoints;
  const currentSummary = metricType === 'weight'
    ? { latest: summary.latestWeight, gain: summary.totalWeightGain }
    : { latest: summary.latestLength, gain: summary.totalLengthGain };

  // WHO Curves up to maxMonths
  const curves = useMemo(() => {
    return getWHOCurves(metricType, sex, maxMonths, isMetric);
  }, [metricType, sex, maxMonths, isMetric]);

  // Calculate SVG dimensions and coordinate scales
  const chartWidth = 540;
  const chartHeight = 280;
  const padLeft = 46;
  const padRight = 44;
  const padTop = 24;
  const padBottom = 34;

  const innerWidth = chartWidth - padLeft - padRight;
  const innerHeight = chartHeight - padTop - padBottom;

  // Y-range calculation based on WHO curves and child points
  const yMin = useMemo(() => {
    if (metricType === 'weight') {
      return isMetric ? 1.8 : 4.0;
    }
    return isMetric ? 42.0 : 16.5;
  }, [metricType, isMetric]);

  const yMax = useMemo(() => {
    const highestCurveVal = curves.p97[curves.p97.length - 1]?.y || 10;
    const highestPointVal = points.length > 0 ? Math.max(...points.map(p => p.value)) : 0;
    const maxVal = Math.max(highestCurveVal, highestPointVal);
    // Add small buffer
    return Math.ceil(maxVal * 1.08 * 10) / 10;
  }, [curves, points]);

  // Scale functions
  const scaleX = (month) => {
    return padLeft + (Math.max(0, Math.min(maxMonths, month)) / maxMonths) * innerWidth;
  };

  const scaleY = (val) => {
    const clamped = Math.max(yMin, Math.min(yMax, val));
    return padTop + innerHeight - ((clamped - yMin) / (yMax - yMin)) * innerHeight;
  };

  // Helper to build SVG path from points
  const buildPath = (pts) => {
    if (!pts || pts.length === 0) return '';
    return pts.reduce((acc, pt, i) => {
      const x = scaleX(pt.x);
      const y = scaleY(pt.y);
      return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  };

  // Helper to build closed area between two curves (e.g. P3 to P97)
  const buildArea = (topPts, bottomPts) => {
    if (!topPts || !bottomPts || topPts.length === 0) return '';
    const topPath = topPts.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(pt.x)} ${scaleY(pt.y)}`).join(' ');
    const bottomPath = [...bottomPts].reverse().map(pt => `L ${scaleX(pt.x)} ${scaleY(pt.y)}`).join(' ');
    return `${topPath} ${bottomPath} Z`;
  };

  // Generate ticks
  const xTicks = useMemo(() => {
    if (maxMonths === 6) return [0, 1, 2, 3, 4, 5, 6];
    if (maxMonths === 12) return [0, 2, 4, 6, 8, 10, 12];
    return [0, 3, 6, 9, 12, 18, 24];
  }, [maxMonths]);

  const yTicks = useMemo(() => {
    const ticks = [];
    const step = metricType === 'weight'
      ? (isMetric ? 1 : 2)
      : (isMetric ? 5 : 2);
    const start = Math.ceil(yMin / step) * step;
    for (let v = start; v <= yMax; v += step) {
      ticks.push(Math.round(v * 10) / 10);
    }
    return ticks;
  }, [yMin, yMax, metricType, isMetric]);

  // Points within visible range
  const visibleChildPoints = points.filter(p => p.ageMonths <= maxMonths);
  const childPath = buildPath(visibleChildPoints.map(p => ({ x: p.ageMonths, y: p.value })));

  return (
    <div className="who-growth-card">
      {/* Header */}
      <div className="who-card-header">
        <div className="who-header-left">
          <div className="who-header-icon">
            {metricType === 'weight' ? <Scale size={18} /> : <Ruler size={18} />}
          </div>
          <div>
            <div className="who-header-title-row">
              <h3 className="who-card-title">
                {metricType === 'weight'
                  ? (language === 'nl' ? 'Gewicht naar leeftijd' : 'Weight-for-Age')
                  : (language === 'nl' ? 'Lengte naar leeftijd' : 'Length-for-Age')}
              </h3>
              <span className="who-standard-badge">{language === 'nl' ? 'WHO Richtlijn' : 'WHO Standard'}</span>
            </div>
            <p className="who-card-sub">
              {language === 'nl'
                ? `${activeChild?.name || 'Baby'} vergeleken met de officiële WHO-groeicurve`
                : `${activeChild?.name || 'Baby'} compared to World Health Organization growth curves`}
            </p>
          </div>
        </div>

        {/* Metric Switcher & Zoom */}
        <div className="who-header-controls">
          <div className="who-pill-toggle">
            <button
              className={`who-toggle-btn ${metricType === 'weight' ? 'active' : ''}`}
              onClick={() => {
                setMetricType('weight');
                setActivePoint(null);
              }}
            >
              {language === 'nl' ? 'Gewicht' : 'Weight'}
            </button>
            <button
              className={`who-toggle-btn ${metricType === 'length' ? 'active' : ''}`}
              onClick={() => {
                setMetricType('length');
                setActivePoint(null);
              }}
            >
              {language === 'nl' ? 'Lengte' : 'Length'}
            </button>
          </div>

          <div className="who-pill-toggle range-toggle">
            <button
              className={`who-toggle-btn ${maxMonths === 6 ? 'active' : ''}`}
              onClick={() => setMaxMonths(6)}
              title={language === 'nl' ? 'Bekijk eerste 6 maanden' : 'View first 6 months'}
            >
              0–6m
            </button>
            <button
              className={`who-toggle-btn ${maxMonths === 12 ? 'active' : ''}`}
              onClick={() => setMaxMonths(12)}
              title={language === 'nl' ? 'Bekijk eerste jaar' : 'View first year'}
            >
              0–12m
            </button>
            <button
              className={`who-toggle-btn ${maxMonths === 24 ? 'active' : ''}`}
              onClick={() => setMaxMonths(24)}
              title={language === 'nl' ? 'Bekijk 0 tot 24 maanden' : 'View 0 to 24 months'}
            >
              0–24m
            </button>
          </div>
        </div>
      </div>

      {/* Overview Glance Badges */}
      {currentSummary.latest ? (
        <div className="who-summary-row">
          <div className="who-summary-pill highlight">
            <span className="who-pill-label">
              {language === 'nl'
                ? (metricType === 'weight' ? 'Laatste gewicht' : 'Laatste lengte')
                : `Latest ${metricType === 'weight' ? 'Weight' : 'Length'}`}
            </span>
            <div className="who-pill-val-row">
              <span className="who-pill-val">
                {currentSummary.latest.value} {currentSummary.latest.unit}
              </span>
              {currentSummary.latest.percentile != null && (
                <span className="who-percentile-tag">
                  {currentSummary.latest.percentile}th %ile
                </span>
              )}
            </div>
            <span className="who-pill-meta">
              {language === 'nl' ? 'Gemeten op ' : 'Measured at '}
              {currentSummary.latest.ageLabel} ({new Date(currentSummary.latest.date).toLocaleDateString(language === 'nl' ? 'nl-BE' : 'en-US', { month: 'short', day: 'numeric' })})
            </span>
          </div>

          {currentSummary.gain && (
            <div className="who-summary-pill">
              <span className="who-pill-label">{language === 'nl' ? 'Gewonnen sinds geboorte' : 'Gain Since Birth'}</span>
              <div className="who-pill-val-row">
                <span className="who-pill-val">
                  +{currentSummary.gain.value} {currentSummary.gain.unit}
                </span>
                <TrendingUp size={15} color="var(--status-green)" />
              </div>
              <span className="who-pill-meta">
                {language === 'nl'
                  ? `Vanaf ${points[0]?.value} ${points[0]?.unit} bij geboorte`
                  : `From ${points[0]?.value} ${points[0]?.unit} at birth`}
              </span>
            </div>
          )}

          <div className="who-summary-pill subtle">
            <span className="who-pill-label">{language === 'nl' ? 'Standaard referentie' : 'Standard Reference'}</span>
            <div className="who-pill-val-row">
              <span className="who-pill-val-sub">
                WHO {sex.toLowerCase() === 'female' ? (language === 'nl' ? 'Meisjes' : 'Girls') : (language === 'nl' ? 'Jongens' : 'Boys')} 0–24m
              </span>
            </div>
            <span className="who-pill-meta">
              {language === 'nl' ? 'Mediaan op ' : 'Median at '}
              {currentSummary.latest.ageLabel}: ~{interpolateWHOMedian(currentSummary.latest.ageMonths, metricType, sex, isMetric)} {currentSummary.latest.unit}
            </span>
          </div>
        </div>
      ) : (
        <div className="who-summary-empty">
          <Info size={16} />
          <span>
            {language === 'nl'
              ? `Nog geen ${metricType === 'weight' ? 'gewichtsmetingen' : 'lengtemetingen'} geregistreerd voor ${activeChild?.name || 'baby'}. Tik hieronder om te loggen!`
              : `No ${metricType} records logged yet for ${activeChild?.name}. Tap below to log!`}
          </span>
          <button
            className="btn-secondary"
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
            onClick={() => openModal('GROWTH')}
          >
            {language === 'nl' ? 'Meting toevoegen' : 'Log Measurement'}
          </button>
        </div>
      )}

      {/* Interactive SVG Chart */}
      <div className="who-chart-wrapper">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="who-chart-svg"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Gradient for P3 to P97 Outer Healthy Band */}
            <linearGradient id="whoOuterBand" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--color-slate)" stopOpacity="0.08" />
              <stop offset="100%" stopColor="var(--color-slate)" stopOpacity="0.04" />
            </linearGradient>

            {/* Gradient for P15 to P85 Middle Band */}
            <linearGradient id="whoMiddleBand" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--color-slate)" stopOpacity="0.14" />
              <stop offset="100%" stopColor="var(--color-slate)" stopOpacity="0.08" />
            </linearGradient>

            {/* Baby Curve Glow Filter */}
            <filter id="babyPointGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="rgba(206, 107, 76, 0.45)" />
            </filter>
          </defs>

          {/* Grid Lines - Horizontal (Y) */}
          {yTicks.map((val, idx) => {
            const y = scaleY(val);
            return (
              <g key={`ytick-${idx}`}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={chartWidth - padRight}
                  y2={y}
                  stroke="var(--border-subtle)"
                  strokeDasharray="2 3"
                  strokeWidth="0.8"
                />
                <text
                  x={padLeft - 6}
                  y={y + 3.5}
                  textAnchor="end"
                  fontSize="9"
                  fill="var(--text-tertiary)"
                  fontWeight="600"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Grid Lines - Vertical (X) */}
          {xTicks.map((month) => {
            const x = scaleX(month);
            return (
              <g key={`xtick-${month}`}>
                <line
                  x1={x}
                  y1={padTop}
                  x2={x}
                  y2={chartHeight - padBottom}
                  stroke="var(--border-subtle)"
                  strokeWidth="0.8"
                />
                <text
                  x={x}
                  y={chartHeight - padBottom + 14}
                  textAnchor="middle"
                  fontSize="9"
                  fill="var(--text-tertiary)"
                  fontWeight="600"
                >
                  {month === 0 ? (language === 'nl' ? 'Geboorte' : 'Birth') : `${month}m`}
                </text>
              </g>
            );
          })}

          {/* WHO Shaded Normal Range: P3 to P97 */}
          <path
            d={buildArea(curves.p97, curves.p3)}
            fill="url(#whoOuterBand)"
          />

          {/* WHO Shaded Middle Range: P15 to P85 */}
          <path
            d={buildArea(curves.p85, curves.p15)}
            fill="url(#whoMiddleBand)"
          />

          {/* WHO Boundary Lines */}
          {/* P97 */}
          <path
            d={buildPath(curves.p97)}
            fill="none"
            stroke="var(--color-slate)"
            strokeWidth="1"
            strokeOpacity="0.4"
          />
          {/* P85 */}
          <path
            d={buildPath(curves.p85)}
            fill="none"
            stroke="var(--color-slate)"
            strokeWidth="0.75"
            strokeDasharray="2 2"
            strokeOpacity="0.45"
          />
          {/* P50 (Median) */}
          <path
            d={buildPath(curves.p50)}
            fill="none"
            stroke="var(--color-slate)"
            strokeWidth="1.5"
            strokeDasharray="4 3"
            strokeOpacity="0.75"
          />
          {/* P15 */}
          <path
            d={buildPath(curves.p15)}
            fill="none"
            stroke="var(--color-slate)"
            strokeWidth="0.75"
            strokeDasharray="2 2"
            strokeOpacity="0.45"
          />
          {/* P3 */}
          <path
            d={buildPath(curves.p3)}
            fill="none"
            stroke="var(--color-slate)"
            strokeWidth="1"
            strokeOpacity="0.4"
          />

          {/* Right margin Percentile Tags */}
          <text
            x={chartWidth - padRight + 6}
            y={scaleY(curves.p97[curves.p97.length - 1]?.y) + 3}
            fontSize="8"
            fontWeight="700"
            fill="var(--color-slate)"
            opacity="0.8"
          >
            P97
          </text>
          <text
            x={chartWidth - padRight + 6}
            y={scaleY(curves.p85[curves.p85.length - 1]?.y) + 3}
            fontSize="7.5"
            fontWeight="600"
            fill="var(--color-slate)"
            opacity="0.7"
          >
            P85
          </text>
          <text
            x={chartWidth - padRight + 6}
            y={scaleY(curves.p50[curves.p50.length - 1]?.y) + 3}
            fontSize="8"
            fontWeight="700"
            fill="var(--color-slate)"
          >
            P50
          </text>
          <text
            x={chartWidth - padRight + 6}
            y={scaleY(curves.p15[curves.p15.length - 1]?.y) + 3}
            fontSize="7.5"
            fontWeight="600"
            fill="var(--color-slate)"
            opacity="0.7"
          >
            P15
          </text>
          <text
            x={chartWidth - padRight + 6}
            y={scaleY(curves.p3[curves.p3.length - 1]?.y) + 3}
            fontSize="8"
            fontWeight="700"
            fill="var(--color-slate)"
            opacity="0.8"
          >
            P3
          </text>

          {/* Child's Actual Growth Line */}
          {childPath && (
            <path
              d={childPath}
              fill="none"
              stroke="var(--color-terracotta)"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Child's Plotted Data Points */}
          {visibleChildPoints.map((pt) => {
            const cx = scaleX(pt.ageMonths);
            const cy = scaleY(pt.value);
            const isSelected = activePoint?.id === pt.id;

            return (
              <g
                key={pt.id}
                className="who-data-point-group"
                onClick={() => setActivePoint(isSelected ? null : pt)}
                style={{ cursor: 'pointer' }}
              >
                {/* Hit target */}
                <circle cx={cx} cy={cy} r="12" fill="transparent" />

                {/* Outer Selection Ring */}
                {isSelected && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r="8"
                    fill="none"
                    stroke="var(--color-terracotta)"
                    strokeWidth="1.5"
                    strokeOpacity="0.4"
                  />
                )}

                {/* Point */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isSelected ? "5" : "4"}
                  fill="var(--color-terracotta)"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  filter="url(#babyPointGlow)"
                />
              </g>
            );
          })}
        </svg>

        {/* Interactive Floating Tooltip */}
        {activePoint && (
          <div
            className="who-chart-tooltip"
            style={{
              left: `${Math.min(80, Math.max(10, (scaleX(activePoint.ageMonths) / chartWidth) * 100))}%`,
              top: `${Math.max(10, (scaleY(activePoint.value) / chartHeight) * 100 - 24)}%`,
            }}
          >
            <div className="tooltip-header">
              <span className="tooltip-age">{activePoint.ageLabel}</span>
              <span className="tooltip-date">
                {new Date(activePoint.date).toLocaleDateString(language === 'nl' ? 'nl-BE' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <div className="tooltip-main-val">
              <strong>{activePoint.value} {activePoint.unit}</strong>
              {activePoint.percentile != null && (
                <span className="tooltip-pct">~{activePoint.percentile}e %ile</span>
              )}
            </div>
            {activePoint.caregiver && (
              <div className="tooltip-footer">
                <User size={10} />
                <span>{language === 'nl' ? `Geregistreerd door ${activePoint.caregiver}` : `Logged by ${activePoint.caregiver}`}</span>
              </div>
            )}
            <button
              className="tooltip-close-btn"
              onClick={() => setActivePoint(null)}
              aria-label={language === 'nl' ? 'Sluit tooltip' : 'Close tooltip'}
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* Legend & Guidance Footer */}
      <div className="who-chart-footer">
        <div className="who-legend">
          <div className="legend-item">
            <span className="legend-line baby" />
            <span className="legend-text">
              {language === 'nl' ? `Groei van ${activeChild?.name || 'Baby'}` : `${activeChild?.name || 'Baby'}'s Growth`}
            </span>
          </div>
          <div className="legend-item">
            <span className="legend-line p50" />
            <span className="legend-text">
              {language === 'nl' ? 'WHO Mediaan (P50)' : 'WHO 50th %ile (Median)'}
            </span>
          </div>
          <div className="legend-item">
            <span className="legend-swatch middle" />
            <span className="legend-text">
              {language === 'nl' ? 'Normale zone (P15–P85)' : '15th–85th %ile'}
            </span>
          </div>
          <div className="legend-item">
            <span className="legend-swatch outer" />
            <span className="legend-text">
              {language === 'nl' ? 'P3–P97 (Gezond bereik)' : '3rd–97th %ile (Normal)'}
            </span>
          </div>
        </div>

        {/* Unit Toggle Quick Action */}
        <button
          className="who-unit-toggle-btn"
          onClick={() => setUnitOverride(isMetric ? 'imperial' : 'metric')}
          title={language === 'nl' ? 'Wissel tussen metrisch en imperiaal' : 'Toggle Metric and Imperial units'}
        >
          {language === 'nl'
            ? `Eenheden: ${isMetric ? (metricType === 'weight' ? 'kg' : 'cm') : (metricType === 'weight' ? 'lb' : 'in')} (Tik om te wisselen)`
            : `Units: ${isMetric ? (metricType === 'weight' ? 'kg' : 'cm') : (metricType === 'weight' ? 'lb' : 'in')} (Tap to switch)`}
        </button>
      </div>
    </div>
  );
}

/**
 * Helper to get median value for summary card
 */
function interpolateWHOMedian(ageMonths, metricType, sex, isMetric) {
  const curves = getWHOCurves(metricType, sex, 24, isMetric);
  const clamped = Math.max(0, Math.min(24, ageMonths));
  const lower = Math.floor(clamped);
  const upper = Math.min(curves.p50.length - 1, Math.ceil(clamped));

  if (lower === upper) return curves.p50[lower]?.y || 0;
  const fraction = clamped - lower;
  const val = curves.p50[lower]?.y + (curves.p50[upper]?.y - curves.p50[lower]?.y) * fraction;
  return Math.round(val * 10) / 10;
}
