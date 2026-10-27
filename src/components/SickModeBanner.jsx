import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Thermometer,
  Pill,
  Droplets,
  AlertTriangle,
  Stethoscope,
  ChevronDown,
  ChevronUp,
  Plus,
  Clock,
  CheckCircle2,
  Settings,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { calculateSickModeData } from '../utils/sickModeCalculator';
import { FeverCurveChart } from './charts/FeverCurveChart';
import { triggerHaptic } from '../utils/haptics';
import { formatDurationMs } from '../utils/formatters';

export function SickModeBanner() {
  const {
    events,
    activeChild,
    preferences,
    openModal,
    language,
  } = useApp();

  const [now, setNow] = useState(Date.now());
  const [showFeverChart, setShowFeverChart] = useState(true);
  const [showRedFlags, setShowRedFlags] = useState(false);

  // Tick every 15 seconds to update real-time dose countdowns
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  const isDutch = language === 'nl';
  const isMetric = preferences.tempUnit === 'C';

  if (!activeChild?.sickMode?.active) {
    return null;
  }

  const sickData = calculateSickModeData(events, activeChild, preferences, now);
  const illnessHours = Math.round(sickData.illnessDurationMs / (60 * 60 * 1000));
  const illnessDays = Math.max(1, Math.ceil(illnessHours / 24));

  const diagnosis = sickData.customDiagnosis || (sickData.symptoms?.length > 0 ? sickData.symptoms.join(', ') : (isDutch ? 'Koorts / ziekte' : 'Fever / illness'));

  // Handler to quickly log temperature
  const handleLogTemp = () => {
    triggerHaptic('light', preferences?.haptics);
    openModal('HEALTH', {
      subType: 'TEMP',
    });
  };

  // Handler to log Paracetamol with prefilled name & dosage
  const handleLogParacetamol = () => {
    triggerHaptic('light', preferences?.haptics);
    const lastDose = sickData.paracetamol?.lastDose;
    openModal('HEALTH', {
      subType: 'MED',
      medicineName: lastDose?.name || (isDutch ? 'Perdolan' : 'Tylenol'),
      dosage: lastDose?.dosage || '',
    });
  };

  // Handler to log Ibuprofen with prefilled name & dosage
  const handleLogIbuprofen = () => {
    triggerHaptic('light', preferences?.haptics);
    const lastDose = sickData.ibuprofen?.lastDose;
    openModal('HEALTH', {
      subType: 'MED',
      medicineName: lastDose?.name || (isDutch ? 'Nurofen' : 'Motrin'),
      dosage: lastDose?.dosage || '',
    });
  };

  return (
    <div className="sick-mode-hero-banner">
      {/* Top Header Bar */}
      <div className="sick-banner-header">
        <div className="sick-banner-title-wrap">
          <span className="sick-live-pulse-dot" />
          <div>
            <div className="sick-banner-title">
              🤒 {diagnosis}
            </div>
            <div className="sick-banner-duration">
              {isDutch ? `Dag ${illnessDays} · ${illnessHours}u bezig` : `Day ${illnessDays} · ${illnessHours}h elapsed`}
            </div>
          </div>
        </div>

        <div className="sick-banner-header-actions">
          <button
            type="button"
            className="sick-action-btn-pill doctor-btn"
            onClick={() => {
              triggerHaptic('light', preferences?.haptics);
              openModal('DOCTOR_SUMMARY');
            }}
            title={isDutch ? 'Open medisch consultatieoverzicht' : 'Open doctor consultation summary'}
          >
            <Stethoscope size={13} />
            <span>{isDutch ? 'Arts Overzicht' : 'Doctor Summary'}</span>
          </button>

          <button
            type="button"
            className="sick-action-btn-pill manage-btn"
            onClick={() => {
              triggerHaptic('light', preferences?.haptics);
              openModal('SICK_MODE');
            }}
            aria-label={isDutch ? 'Ziekte-modus beheren' : 'Manage Sick Mode'}
          >
            <Settings size={13} />
          </button>
        </div>
      </div>

      {/* Main Grid: Vital Signs & Quick Log */}
      <div className="sick-vitals-grid">
        {/* Current / Latest Temperature */}
        <div className={`sick-vital-card temp-card ${sickData.latestTemp?.status?.toLowerCase() || 'normal'}`}>
          <div className="vital-card-top">
            <div className="vital-label">
              <Thermometer size={14} />
              <span>{isDutch ? 'Temperatuur' : 'Temperature'}</span>
            </div>
            {sickData.tempTrend === 'rising' && (
              <span className="vital-trend rising" title={isDutch ? 'Stijgende temperatuur' : 'Rising'}>
                <TrendingUp size={13} /> {isDutch ? 'Stijgend' : 'Rising'}
              </span>
            )}
            {sickData.tempTrend === 'falling' && (
              <span className="vital-trend falling" title={isDutch ? 'Dalende temperatuur' : 'Falling'}>
                <TrendingDown size={13} /> {isDutch ? 'Dalend' : 'Falling'}
              </span>
            )}
            {sickData.tempTrend === 'stable' && sickData.latestTemp && (
              <span className="vital-trend stable">
                <Minus size={13} /> {isDutch ? 'Stabiel' : 'Stable'}
              </span>
            )}
          </div>

          <div className="vital-value-row">
            <div className="vital-large-val">
              {sickData.latestTemp
                ? (isMetric ? `${sickData.latestTemp.tempC}°C` : `${sickData.latestTemp.tempF}°F`)
                : (isDutch ? 'Niet gemeten' : 'No reading')}
            </div>
            <button
              type="button"
              className="quick-vital-btn"
              onClick={handleLogTemp}
            >
              <Plus size={14} />
              <span>{isDutch ? 'Meet' : 'Log'}</span>
            </button>
          </div>

          <div className="vital-sub-info">
            {sickData.latestTemp ? (
              <>
                <span>
                  {formatDurationMs(Math.max(0, now - sickData.latestTemp.timestamp), language)} {isDutch ? 'geleden' : 'ago'}
                </span>
                {sickData.peakTemp && (
                  <span>
                    • {isDutch ? 'Hoogste:' : 'Peak:'} {isMetric ? `${sickData.peakTemp.tempC}°C` : `${sickData.peakTemp.tempF}°F`}
                  </span>
                )}
              </>
            ) : (
              <span>{isDutch ? 'Voer eerste meting in' : 'Log first temperature reading'}</span>
            )}
          </div>
        </div>

        {/* Hydration & Wet Diapers Card */}
        <div className={`sick-vital-card hydration-card ${sickData.hydration24h.status}`}>
          <div className="vital-card-top">
            <div className="vital-label">
              <Droplets size={14} />
              <span>{isDutch ? 'Hydratatie (24u)' : 'Hydration (24h)'}</span>
            </div>
            <span className={`hydration-badge ${sickData.hydration24h.status}`}>
              {sickData.hydration24h.status === 'good'
                ? (isDutch ? 'Voldoende' : 'Good')
                : sickData.hydration24h.status === 'moderate'
                ? (isDutch ? 'Matig' : 'Moderate')
                : (isDutch ? '⚠️ Laag' : '⚠️ Low')}
            </span>
          </div>

          <div className="vital-value-row">
            <div className="vital-large-val">
              {sickData.hydration24h.wetDiapers} <span style={{ fontSize: '0.82rem', fontWeight: 500 }}>{isDutch ? 'plasluiers' : 'wet diapers'}</span>
            </div>
            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--color-daycare)' }}>
              {sickData.hydration24h.totalFluidsMl} ml
            </div>
          </div>

          <div className="vital-sub-info">
            {sickData.hydration24h.status === 'warning' ? (
              <span className="danger-text">
                ⚠️ {isDutch ? 'Weinig natte luiers - let op uitdroging' : 'Low wet diapers - risk of dehydration'}
              </span>
            ) : (
              <span>
                {sickData.hydration24h.totalFluidsOz} oz {isDutch ? 'vocht' : 'fluids'}
                {sickData.hydration24h.nursingDurationMinutes > 0 && ` • ${sickData.hydration24h.nursingDurationMinutes}m borstvoeding`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Safe Dose Timers Grid */}
      <div className="sick-meds-section">
        <div className="sick-section-heading">
          <Pill size={14} color="var(--color-pump)" />
          <span>{isDutch ? 'Veilige Doseringstimers (Koortsremmers)' : 'Safe Dose Timers (Fever Reducers)'}</span>
        </div>

        <div className="sick-meds-grid">
          {/* Paracetamol Card */}
          <div className={`sick-med-card ${sickData.paracetamol?.canGiveNow ? 'safe' : 'wait'}`}>
            <div className="med-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span className="med-pill-dot paracetamol" />
                <span className="med-title">{isDutch ? 'Paracetamol / Perdolan' : 'Acetaminophen / Tylenol'}</span>
              </div>
              <span className="med-counter">
                {sickData.paracetamol?.doses24h || 0} / {sickData.paracetamol?.maxDoses24h || 4} (24u)
              </span>
            </div>

            <div className="med-countdown-box">
              {sickData.paracetamol?.canGiveNow ? (
                <div className="countdown-status safe">
                  <CheckCircle2 size={15} color="var(--status-green)" />
                  <span>
                    {sickData.paracetamol?.lastDose
                      ? (isDutch ? 'Veilig om toe te dienen' : 'Safe to give now')
                      : (isDutch ? 'Klaar voor eerste dosis' : 'Ready for dose')}
                  </span>
                </div>
              ) : (
                <div className="countdown-status wait">
                  <Clock size={15} color="var(--status-red)" />
                  <span>
                    {isDutch
                      ? `Wacht nog ${formatDurationMs(sickData.paracetamol?.remainingMinMs || 0, language)}`
                      : `Wait ${formatDurationMs(sickData.paracetamol?.remainingMinMs || 0, language)}`}
                  </span>
                </div>
              )}
            </div>

            <div className="med-last-dose-info">
              {sickData.paracetamol?.lastDose ? (
                <span>
                  {isDutch ? 'Laatst:' : 'Last:'} {sickData.paracetamol.lastDose.dosage ? `${sickData.paracetamol.lastDose.dosage} • ` : ''}
                  {formatDurationMs(sickData.paracetamol.elapsedMs, language)} {isDutch ? 'geleden' : 'ago'}
                  {sickData.paracetamol.lastDose.loggedBy ? ` (${sickData.paracetamol.lastDose.loggedBy})` : ''}
                </span>
              ) : (
                <span>{isDutch ? 'Nog geen paracetamol geregistreerd' : 'No paracetamol logged'}</span>
              )}
            </div>

            <button
              type="button"
              className="med-give-btn"
              onClick={handleLogParacetamol}
            >
              <Plus size={13} />
              <span>{isDutch ? 'Dien Perdolan toe' : 'Log Tylenol Dose'}</span>
            </button>
          </div>

          {/* Ibuprofen Card */}
          <div className={`sick-med-card ${sickData.ibuprofen?.canGiveNow ? 'safe' : 'wait'}`}>
            <div className="med-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span className="med-pill-dot ibuprofen" />
                <span className="med-title">{isDutch ? 'Ibuprofen / Nurofen' : 'Ibuprofen / Motrin'}</span>
              </div>
              <span className="med-counter">
                {sickData.ibuprofen?.doses24h || 0} / {sickData.ibuprofen?.maxDoses24h || 3} (24u)
              </span>
            </div>

            <div className="med-countdown-box">
              {sickData.ibuprofen?.canGiveNow ? (
                <div className="countdown-status safe">
                  <CheckCircle2 size={15} color="var(--status-green)" />
                  <span>
                    {sickData.ibuprofen?.lastDose
                      ? (isDutch ? 'Veilig om toe te dienen' : 'Safe to give now')
                      : (isDutch ? 'Klaar voor eerste dosis' : 'Ready for dose')}
                  </span>
                </div>
              ) : (
                <div className="countdown-status wait">
                  <Clock size={15} color="var(--status-red)" />
                  <span>
                    {isDutch
                      ? `Wacht nog ${formatDurationMs(sickData.ibuprofen?.remainingMinMs || 0, language)}`
                      : `Wait ${formatDurationMs(sickData.ibuprofen?.remainingMinMs || 0, language)}`}
                  </span>
                </div>
              )}
            </div>

            <div className="med-last-dose-info">
              {sickData.ibuprofen?.lastDose ? (
                <span>
                  {isDutch ? 'Laatst:' : 'Last:'} {sickData.ibuprofen.lastDose.dosage ? `${sickData.ibuprofen.lastDose.dosage} • ` : ''}
                  {formatDurationMs(sickData.ibuprofen.elapsedMs, language)} {isDutch ? 'geleden' : 'ago'}
                  {sickData.ibuprofen.lastDose.loggedBy ? ` (${sickData.ibuprofen.lastDose.loggedBy})` : ''}
                </span>
              ) : (
                <span>{isDutch ? 'Nog geen ibuprofen geregistreerd' : 'No ibuprofen logged'}</span>
              )}
            </div>

            <button
              type="button"
              className="med-give-btn"
              onClick={handleLogIbuprofen}
            >
              <Plus size={13} />
              <span>{isDutch ? 'Dien Nurofen toe' : 'Log Motrin Dose'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Fever Curve Chart */}
      <div className="sick-chart-section">
        <button
          type="button"
          className="sick-chart-toggle-header"
          onClick={() => setShowFeverChart(!showFeverChart)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <Thermometer size={15} color="var(--color-health)" />
            <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>
              {isDutch ? 'Koortsverloop & Medicatiereactie' : 'Fever Curve & Medication Impact'}
            </span>
          </div>
          {showFeverChart ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showFeverChart && (
          <div className="sick-chart-body">
            <FeverCurveChart
              chartPoints={sickData.chartPoints}
              preferences={preferences}
              language={language}
            />
          </div>
        )}
      </div>

      {/* Red Flags / When to Call Doctor */}
      <div className="sick-red-flags-section">
        <button
          type="button"
          className="sick-flags-toggle-header"
          onClick={() => setShowRedFlags(!showRedFlags)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <AlertTriangle size={14} color="var(--status-amber)" />
            <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>
              {isDutch ? 'Wanneer dringend een arts raadplegen?' : 'When to seek urgent medical care?'}
            </span>
          </div>
          {showRedFlags ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showRedFlags && (
          <div className="sick-flags-content">
            <ul>
              <li>
                <strong>{isDutch ? 'Baby jonger dan 3 maanden:' : 'Infant under 3 months:'}</strong>{' '}
                {isDutch ? 'altijd direct contact opnemen bij koorts ≥ 38.0°C (100.4°F).' : 'always call a doctor immediately if fever ≥ 38.0°C (100.4°F).'}
              </li>
              <li>
                <strong>{isDutch ? 'Hoge koorts:' : 'High fever:'}</strong>{' '}
                {isDutch ? 'koorts ≥ 39.0°C (102.2°F) die niet zakt met koortswerende middelen.' : 'fever ≥ 39.0°C (102.2°F) that does not respond to medicine.'}
              </li>
              <li>
                <strong>{isDutch ? 'Duur:' : 'Duration:'}</strong>{' '}
                {isDutch ? 'koorts die langer dan 3 opeenvolgende dagen aanhoudt.' : 'fever lasting more than 3 consecutive days.'}
              </li>
              <li>
                <strong>{isDutch ? 'Uitdroging:' : 'Dehydration:'}</strong>{' '}
                {isDutch ? 'geen natte luier gedurende meer dan 8 uur, droge mond, geen tranen bij huilen.' : 'no wet diaper in >8 hours, dry mouth, or crying without tears.'}
              </li>
              <li>
                <strong>{isDutch ? 'Gedrag & ademhaling:' : 'Alertness & breathing:'}</strong>{' '}
                {isDutch ? 'kreunend ademen, extreme sufheid of moeilijk wekbaar.' : 'rapid/labored breathing, grunting, extreme lethargy, or hard to wake.'}
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
