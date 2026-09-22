import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { calculateTrends } from '../../utils/trendsCalculator';
import { formatDurationMs, formatVolume, formatWeight, formatLength } from '../../utils/formatters';
import { Moon, Utensils, Sparkles, TrendingUp, Clock, Scale } from 'lucide-react';

export function TrendsView() {
  const { events, activeChildId, preferences } = useApp();
  const [timeframe, setTimeframe] = useState(7); // 1, 7, 14, 30

  const trends = useMemo(() => {
    return calculateTrends(events, timeframe, activeChildId);
  }, [events, timeframe, activeChildId]);

  const isMetric = preferences.volumeUnit === 'ml';

  return (
    <div className="trends-view">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2>Trends & Insights</h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Nara patterns over time
          </span>
        </div>
      </div>

      {/* Timeframe Selector */}
      <div className="timeframe-selector">
        {[
          { days: 1, label: '1 Day' },
          { days: 7, label: '7 Days' },
          { days: 14, label: '14 Days' },
          { days: 30, label: '30 Days' },
        ].map(t => (
          <button
            key={t.days}
            className={`timeframe-btn ${timeframe === t.days ? 'active' : ''}`}
            onClick={() => setTimeframe(t.days)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 1. Sleep Trends Card */}
      <div className="trend-card">
        <div className="trend-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', backgroundColor: 'var(--color-slate-light)', color: 'var(--color-slate)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Moon size={16} />
            </div>
            <h3>Sleep Patterns</h3>
          </div>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-slate)' }}>
            Avg {formatDurationMs(Math.round(trends.sleep.totalSleepMs / Math.max(1, timeframe)))} / day
          </span>
        </div>

        <div className="trend-metrics-grid">
          <div className="metric-box">
            <span className="metric-label">Avg Nap</span>
            <span className="metric-value">{formatDurationMs(trends.sleep.avgNapMs)}</span>
          </div>

          <div className="metric-box">
            <span className="metric-label">Avg Wake Window</span>
            <span className="metric-value">{formatDurationMs(trends.sleep.avgWakeWindowMs)}</span>
          </div>

          <div className="metric-box">
            <span className="metric-label">Longest Stretch</span>
            <span className="metric-value">{formatDurationMs(trends.sleep.longestSleepMs)}</span>
          </div>
        </div>

        {/* Daily Sleep Bar Chart */}
        <div style={{ marginTop: '0.5rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
            Daily Sleep (Hours)
          </div>
          <MiniBarChart
            data={trends.dailySeries.map(d => ({ label: d.label, value: d.sleepHours }))}
            color="var(--color-slate)"
            unit="h"
          />
        </div>
      </div>

      {/* 2. Feeding Trends Card */}
      <div className="trend-card">
        <div className="trend-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', backgroundColor: 'var(--color-terracotta-light)', color: 'var(--color-terracotta)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Utensils size={16} />
            </div>
            <h3>Feeding Breakdown</h3>
          </div>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-terracotta)' }}>
            {trends.feed.totalCount} Sessions
          </span>
        </div>

        <div className="trend-metrics-grid">
          {trends.feed.breastSessions > trends.feed.bottleCount ? (
            <>
              <div className="metric-box">
                <span className="metric-label">Avg Nursing</span>
                <span className="metric-value">{formatDurationMs(trends.feed.avgBreastSessionMs)}</span>
              </div>

              <div className="metric-box">
                <span className="metric-label">Total Nursing</span>
                <span className="metric-value">{formatDurationMs(trends.feed.totalBreastMs)}</span>
              </div>
            </>
          ) : (
            <>
              <div className="metric-box">
                <span className="metric-label">Avg Bottle</span>
                <span className="metric-value">{formatVolume(trends.feed.avgBottleFloz, preferences.volumeUnit)}</span>
              </div>

              <div className="metric-box">
                <span className="metric-label">Total Bottle Milk</span>
                <span className="metric-value">{formatVolume(trends.feed.totalBottleFloz, preferences.volumeUnit)}</span>
              </div>
            </>
          )}

          <div className="metric-box">
            <span className="metric-label">Time Btwn Feeds</span>
            <span className="metric-value">{formatDurationMs(trends.feed.avgIntervalMs)}</span>
          </div>
        </div>

        {trends.feed.breastSessions > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0.85rem', backgroundColor: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-md)', fontSize: '0.82rem' }}>
            <span>🤱 Nursing Duration: <strong>{formatDurationMs(trends.feed.totalBreastMs)}</strong></span>
            <span>L: {formatDurationMs(trends.feed.leftBreastMs)} | R: {formatDurationMs(trends.feed.rightBreastMs)}</span>
          </div>
        )}

        {/* Daily Feed Chart: Adaptive for Nursing or Bottle */}
        <div style={{ marginTop: '0.5rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
            {trends.feed.breastSessions > trends.feed.bottleCount ? 'Daily Nursing (Minutes)' : `Daily Bottle Volume (${isMetric ? 'mL' : 'oz'})`}
          </div>
          <MiniBarChart
            data={trends.dailySeries.map(d => ({
              label: d.label,
              value: trends.feed.breastSessions > trends.feed.bottleCount
                ? d.nursingMinutes
                : (isMetric ? Math.round(d.bottleFloz * 29.5735) : d.bottleFloz),
            }))}
            color="var(--color-terracotta)"
            unit={trends.feed.breastSessions > trends.feed.bottleCount ? 'm' : (isMetric ? 'mL' : 'oz')}
          />
        </div>
      </div>

      {/* 3. Diapers Trends Card */}
      <div className="trend-card">
        <div className="trend-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', backgroundColor: 'var(--color-caramel-light)', color: 'var(--color-caramel)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={16} />
            </div>
            <h3>Diaper Changes</h3>
          </div>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-caramel)' }}>
            {trends.diaper.avgPerDay} / day
          </span>
        </div>

        <div className="trend-metrics-grid">
          <div className="metric-box">
            <span className="metric-label">Total Diapers</span>
            <span className="metric-value">{trends.diaper.total}</span>
          </div>

          <div className="metric-box">
            <span className="metric-label">Wet / Dirty</span>
            <span className="metric-value">{trends.diaper.wet} / {trends.diaper.dirty}</span>
          </div>

          <div className="metric-box">
            <span className="metric-label">Blowouts</span>
            <span className="metric-value">{trends.diaper.blowouts}</span>
          </div>
        </div>

        {/* Daily Diapers Bar Chart */}
        <div style={{ marginTop: '0.5rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
            Daily Diapers
          </div>
          <MiniBarChart
            data={trends.dailySeries.map(d => ({ label: d.label, value: d.diapers }))}
            color="var(--color-caramel)"
            unit=""
          />
        </div>
      </div>

      {/* 4. Growth Trends (if available) */}
      {trends.growth.length > 0 && (
        <div className="trend-card">
          <div className="trend-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', backgroundColor: 'var(--color-sage-light)', color: 'var(--color-sage)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Scale size={16} />
              </div>
              <h3>Growth Log</h3>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {trends.growth.map((g, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  backgroundColor: 'var(--bg-card-subtle)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.85rem',
                }}
              >
                <span>{new Date(g.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                <span style={{ fontWeight: 600 }}>
                  {g.weightKg && isMetric ? `${g.weightKg} kg` : (g.weightLb ? formatWeight(g.weightLb, preferences.weightUnit) : '')}
                  {g.heightCm && preferences.lengthUnit === 'cm' ? ` • ${g.heightCm} cm` : (g.heightIn ? ` • ${formatLength(g.heightIn, preferences.lengthUnit)}` : '')}
                  {g.headCm && preferences.lengthUnit === 'cm' ? ` • Head: ${g.headCm} cm` : (g.headIn ? ` • Head: ${formatLength(g.headIn, preferences.lengthUnit)}` : '')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Responsive Pure SVG Mini Bar Chart
 */
function MiniBarChart({ data, color, unit }) {
  if (!data || data.length === 0) return null;

  const maxVal = Math.max(1, ...data.map(d => d.value));
  const chartHeight = 80;

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.4rem', height: chartHeight + 25, paddingTop: 10 }}>
      {data.map((item, idx) => {
        const heightPct = Math.round((item.value / maxVal) * 100);
        const barHeight = Math.max(4, Math.round((heightPct / 100) * chartHeight));

        return (
          <div
            key={idx}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              height: '100%',
              justifyContent: 'flex-end',
              gap: '0.25rem',
            }}
          >
            <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {item.value > 0 ? `${item.value}` : ''}
            </div>

            <div
              style={{
                width: '100%',
                maxWidth: 24,
                height: barHeight,
                backgroundColor: color,
                borderRadius: '4px 4px 0 0',
                opacity: item.value > 0 ? 0.9 : 0.2,
                transition: 'height 0.3s ease',
              }}
              title={`${item.label}: ${item.value} ${unit}`}
            />

            <div
              style={{
                fontSize: '0.65rem',
                color: 'var(--text-tertiary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                width: '100%',
                textAlign: 'center',
              }}
            >
              {item.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
