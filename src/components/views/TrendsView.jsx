import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { calculateTrends } from '../../utils/trendsCalculator';
import { formatDurationMs, formatVolume, formatWeight, formatLength } from '../../utils/formatters';
import { Moon, Utensils, Sparkles, TrendingUp, Clock, Scale, Plus } from 'lucide-react';
import { WHOGrowthChart } from '../charts/WHOGrowthChart';

export function TrendsView() {
  const { events, activeChildId, preferences, openModal, t, language } = useApp();
  const [timeframe, setTimeframe] = useState(7); // 1, 7, 14, 30, 'all'

  const trends = useMemo(() => {
    return calculateTrends(events, timeframe, activeChildId);
  }, [events, timeframe, activeChildId]);

  const isMetric = preferences.volumeUnit === 'ml';

  return (
    <div className="trends-view">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2>{t('trends.title')}</h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {t('trends.subtitle')}
          </span>
        </div>
      </div>

      {/* Timeframe Selector */}
      <div className="timeframe-selector">
        {[
          { days: 1, label: t('trends.day1') },
          { days: 7, label: t('trends.days7') },
          { days: 14, label: t('trends.days14') },
          { days: 30, label: t('trends.days30') },
          { days: 'all', label: t('trends.lifetime') },
        ].map(tf => (
          <button
            key={String(tf.days)}
            className={`timeframe-btn ${timeframe === tf.days ? 'active' : ''}`}
            onClick={() => setTimeframe(tf.days)}
          >
            {tf.label}
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
            <h3>{t('trends.sleepPatterns')}</h3>
          </div>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-slate)' }}>
            {t('trends.avgPerDay', { value: formatDurationMs(Math.round(trends.sleep.totalSleepMs / Math.max(1, trends.timeframeDays)), language) })}
          </span>
        </div>

        <div className="trend-metrics-grid">
          <div className="metric-box">
            <span className="metric-label">{t('trends.avgNap')}</span>
            <span className="metric-value">{formatDurationMs(trends.sleep.avgNapMs, language)}</span>
          </div>

          <div className="metric-box">
            <span className="metric-label">{t('trends.avgWakeWindow')}</span>
            <span className="metric-value">{formatDurationMs(trends.sleep.avgWakeWindowMs, language)}</span>
          </div>

          <div className="metric-box">
            <span className="metric-label">{t('trends.longestStretch')}</span>
            <span className="metric-value">{formatDurationMs(trends.sleep.longestSleepMs, language)}</span>
          </div>
        </div>

        {/* Daily Sleep Bar Chart */}
        <div style={{ marginTop: '0.5rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
            {trends.seriesAggregation === 'weekly' ? t('trends.weeklySleep') : t('trends.dailySleep')}
          </div>
          <MiniBarChart
            data={trends.dailySeries.map(d => ({ label: d.label, subLabel: d.subLabel, value: d.sleepHours }))}
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
            <h3>{t('trends.feedingBreakdown')}</h3>
          </div>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-terracotta)' }}>
            {t('trends.sessionsCount', { count: trends.feed.totalCount })}
          </span>
        </div>

        <div className="trend-metrics-grid">
          {trends.feed.breastSessions > trends.feed.bottleCount ? (
            <>
              <div className="metric-box">
                <span className="metric-label">{t('trends.avgNursing')}</span>
                <span className="metric-value">{formatDurationMs(trends.feed.avgBreastSessionMs, language)}</span>
              </div>

              <div className="metric-box">
                <span className="metric-label">{t('trends.totalNursing')}</span>
                <span className="metric-value">{formatDurationMs(trends.feed.totalBreastMs, language)}</span>
              </div>
            </>
          ) : (
            <>
              <div className="metric-box">
                <span className="metric-label">{t('trends.avgBottle')}</span>
                <span className="metric-value">{formatVolume(trends.feed.avgBottleFloz, preferences.volumeUnit)}</span>
              </div>

              <div className="metric-box">
                <span className="metric-label">{t('trends.totalBottle')}</span>
                <span className="metric-value">{formatVolume(trends.feed.totalBottleFloz, preferences.volumeUnit)}</span>
              </div>
            </>
          )}

          <div className="metric-box">
            <span className="metric-label">{t('trends.timeBtwnFeeds')}</span>
            <span className="metric-value">{formatDurationMs(trends.feed.avgIntervalMs, language)}</span>
          </div>
        </div>

        {trends.feed.breastSessions > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0.85rem', backgroundColor: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-md)', fontSize: '0.82rem' }}>
            <span>🤱 {t('trends.nursingDuration')}: <strong>{formatDurationMs(trends.feed.totalBreastMs, language)}</strong></span>
            <span>L: {formatDurationMs(trends.feed.leftBreastMs, language)} | R: {formatDurationMs(trends.feed.rightBreastMs, language)}</span>
          </div>
        )}

        {/* Daily Feed Chart: Adaptive for Nursing or Bottle */}
        <div style={{ marginTop: '0.5rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
            {trends.feed.breastSessions > trends.feed.bottleCount
              ? (trends.seriesAggregation === 'weekly' ? (language === 'nl' ? 'Wekelijks gem. dagelijkse borstvoeding (minuten)' : 'Weekly Avg Daily Nursing (Minutes)') : (language === 'nl' ? 'Dagelijkse borstvoeding (minuten)' : 'Daily Nursing (Minutes)'))
              : (trends.seriesAggregation === 'weekly' ? (language === 'nl' ? `Wekelijks gem. flesje per dag (${isMetric ? 'mL' : 'oz'})` : `Weekly Avg Daily Bottle (${isMetric ? 'mL' : 'oz'})`) : (language === 'nl' ? `Dagelijks flesvolume (${isMetric ? 'mL' : 'oz'})` : `Daily Bottle Volume (${isMetric ? 'mL' : 'oz'})`))}
          </div>
          <MiniBarChart
            data={trends.dailySeries.map(d => ({
              label: d.label,
              subLabel: d.subLabel,
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
            <h3>{t('trends.diapersTitle')}</h3>
          </div>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-caramel)' }}>
            {t('trends.diapersPerDay', { count: trends.diaper.avgPerDay })}
          </span>
        </div>

        <div className="trend-metrics-grid">
          <div className="metric-box">
            <span className="metric-label">{t('trends.totalDiapers')}</span>
            <span className="metric-value">{trends.diaper.total}</span>
          </div>

          <div className="metric-box">
            <span className="metric-label">{t('trends.wetDirty')}</span>
            <span className="metric-value">{trends.diaper.wet} / {trends.diaper.dirty}</span>
          </div>

          <div className="metric-box">
            <span className="metric-label">{t('trends.blowouts')}</span>
            <span className="metric-value">{trends.diaper.blowouts}</span>
          </div>
        </div>

        {/* Daily Diapers Bar Chart */}
        <div style={{ marginTop: '0.5rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
            {trends.seriesAggregation === 'weekly' ? t('trends.weeklyDiapers') : t('trends.dailyDiapers')}
          </div>
          <MiniBarChart
            data={trends.dailySeries.map(d => ({ label: d.label, subLabel: d.subLabel, value: d.diapers }))}
            color="var(--color-caramel)"
            unit=""
          />
        </div>
      </div>

      {/* 4. WHO Guidelines Growth Standards Chart */}
      <WHOGrowthChart allEvents={events} />

      {/* 5. Comprehensive Growth Log */}
      {(() => {
        const childGrowthEvents = events
          .filter(e => e.type === 'GROWTH' && (!e.childKey || e.childKey === activeChildId))
          .sort((a, b) => b.beginDt - a.beginDt);

        if (childGrowthEvents.length === 0) return null;

        return (
          <div className="trend-card">
            <div className="trend-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', backgroundColor: 'var(--color-sage-light)', color: 'var(--color-sage)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Scale size={16} />
                </div>
                <h3>{t('trends.growthHistory')}</h3>
              </div>
              <button
                className="btn-secondary"
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                onClick={() => openModal('GROWTH')}
              >
                <Plus size={13} />
                <span>{t('trends.logCheckup')}</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {childGrowthEvents.map((ev) => {
                const det = ev.details || {};
                const dateStr = new Date(ev.beginDt).toLocaleDateString(language === 'nl' ? 'nl-BE' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                return (
                  <div
                    key={ev.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.65rem 0.85rem',
                      backgroundColor: 'var(--bg-input)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.84rem',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                    }}
                    onClick={() => openModal('GROWTH', ev)}
                    title={t('trends.tapToEdit')}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {dateStr}
                      </span>
                      {det.caregiver && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                          {t('trends.loggedBy', { name: det.caregiver })}
                        </span>
                      )}
                    </div>

                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      {(() => {
                        const parts = [];
                        if (det.weightKg && isMetric) parts.push(`${det.weightKg} kg`);
                        else if (det.weightLb) parts.push(formatWeight(det.weightLb, preferences.weightUnit));

                        if (det.heightCm && preferences.lengthUnit === 'cm') parts.push(`${det.heightCm} cm`);
                        else if (det.heightIn) parts.push(formatLength(det.heightIn, preferences.lengthUnit));

                        if (det.headCm && preferences.lengthUnit === 'cm') parts.push(t('trends.headCirc', { value: det.headCm + ' cm' }));
                        else if (det.headIn) parts.push(t('trends.headCirc', { value: formatLength(det.headIn, preferences.lengthUnit) }));

                        return parts.join(' • ') || (ev.note ? ev.note : (language === 'nl' ? 'Meting' : 'Measurement'));
                      })()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

/**
 * Responsive Pure SVG Mini Bar Chart
 */
/**
 * Responsive Pure SVG Mini Bar Chart with horizontal scroll for longer periods
 */
function MiniBarChart({ data, color, unit }) {
  if (!data || data.length === 0) return null;

  const maxVal = Math.max(1, ...data.map(d => d.value));
  const chartHeight = 80;
  // If more than 7 bars, ensure each bar has at least 32px so bars never get squashed
  const needsScroll = data.length > 7;
  const itemMinWidth = needsScroll ? (data.length > 14 ? 32 : 36) : 'auto';

  return (
    <div className="chart-scroll-wrapper">
      <div
        className="mini-bar-chart-track"
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: data.length > 14 ? '0.3rem' : '0.45rem',
          height: chartHeight + 30,
          paddingTop: 10,
          paddingBottom: 4,
          minWidth: needsScroll ? `${data.length * (data.length > 14 ? 34 : 38)}px` : '100%',
        }}
      >
        {data.map((item, idx) => {
          const heightPct = Math.round((item.value / maxVal) * 100);
          const barHeight = Math.max(4, Math.round((heightPct / 100) * chartHeight));

          return (
            <div
              key={idx}
              style={{
                flex: needsScroll ? '0 0 auto' : 1,
                width: needsScroll ? itemMinWidth : 'auto',
                minWidth: itemMinWidth,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                height: '100%',
                justifyContent: 'flex-end',
                gap: '0.2rem',
              }}
              title={`${item.label}${item.subLabel ? ` (${item.subLabel})` : ''}: ${item.value} ${unit}`}
            >
              <div style={{ fontSize: '0.66rem', fontWeight: 700, color: 'var(--text-secondary)', lineHeight: 1 }}>
                {item.value > 0 ? `${item.value}` : ''}
              </div>

              <div
                style={{
                  width: '100%',
                  maxWidth: needsScroll ? 22 : 26,
                  height: barHeight,
                  backgroundColor: color,
                  borderRadius: '4px 4px 0 0',
                  opacity: item.value > 0 ? 0.9 : 0.2,
                  transition: 'height 0.3s ease',
                }}
              />

              <div
                style={{
                  fontSize: '0.66rem',
                  color: 'var(--text-tertiary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  width: '100%',
                  textAlign: 'center',
                  fontWeight: 600,
                  lineHeight: 1.1,
                  marginTop: '0.1rem',
                }}
              >
                {item.label}
              </div>
              {item.subLabel && (
                <div style={{ fontSize: '0.58rem', color: 'var(--text-tertiary)', lineHeight: 1, opacity: 0.8 }}>
                  {item.subLabel}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
