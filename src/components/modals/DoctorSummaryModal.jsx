import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Stethoscope, X, Printer, Copy, Check, AlertTriangle, Droplets, Thermometer, Pill } from 'lucide-react';
import { calculateSickModeData, generateDoctorSummaryText } from '../../utils/sickModeCalculator';
import { triggerHaptic } from '../../utils/haptics';

export function DoctorSummaryModal() {
  const {
    activeModal,
    closeModal,
    activeChild,
    events,
    preferences,
    language,
    t,
  } = useApp();

  const [copied, setCopied] = useState(false);
  const isDutch = language === 'nl';
  const isMetric = preferences.tempUnit === 'C';

  if (activeModal !== 'DOCTOR_SUMMARY') return null;

  const sickData = calculateSickModeData(events, activeChild, preferences, Date.now());

  const handleCopy = async () => {
    try {
      const text = generateDoctorSummaryText({
        child: activeChild,
        sickData,
        preferences,
        language,
      });
      await navigator.clipboard.writeText(text);
      setCopied(true);
      triggerHaptic('success', preferences?.haptics);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error('Failed to copy summary:', e);
    }
  };

  const handlePrint = () => {
    triggerHaptic('light', preferences?.haptics);
    window.print();
  };

  const illnessHours = Math.round(sickData.illnessDurationMs / (60 * 60 * 1000));
  const diagnosisText = sickData.customDiagnosis || (sickData.symptoms?.length > 0 ? sickData.symptoms.join(', ') : (isDutch ? 'Ziekte / koortsepisode' : 'Illness / fever episode'));

  return (
    <div className="modal-overlay doctor-summary-overlay" onClick={closeModal}>
      <div className="modal-card doctor-summary-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header no-print">
          <div className="modal-title-wrap">
            <div className="modal-title-icon" style={{ backgroundColor: 'var(--color-health-light)', color: 'var(--color-health)' }}>
              <Stethoscope size={18} />
            </div>
            <h2>{isDutch ? 'Arts & Consultatie Overzicht' : 'Doctor Consultation Summary'}</h2>
          </div>
          <button onClick={closeModal} style={{ color: 'var(--text-tertiary)' }} aria-label={t('common.close')}>
            <X size={20} />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="doctor-summary-actions-toolbar no-print">
          <button
            type="button"
            className="action-btn-pill copy-btn"
            onClick={handleCopy}
          >
            {copied ? <Check size={14} color="var(--status-green)" /> : <Copy size={14} />}
            <span>{copied ? (isDutch ? 'Gekopieerd!' : 'Copied!') : (isDutch ? 'Kopieer tekst' : 'Copy Text')}</span>
          </button>

          <button
            type="button"
            className="action-btn-pill print-btn"
            onClick={handlePrint}
          >
            <Printer size={14} />
            <span>{isDutch ? 'Afdrukken / Opslaan als PDF' : 'Print / Save PDF'}</span>
          </button>
        </div>

        {/* Printable Document Content */}
        <div className="doctor-printable-document">
          {/* Document Header */}
          <div className="doc-header-banner">
            <div>
              <h1 className="doc-title">{isDutch ? 'Medisch Consultatieoverzicht' : 'Medical Consultation Summary'}</h1>
              <div className="doc-subtitle">
                {isDutch ? 'Geëxporteerd uit Baby Tracker voor arts of kinderarts' : 'Exported from Baby Tracker for pediatrician or physician'}
              </div>
            </div>
            <div className="doc-timestamp">
              {new Date().toLocaleDateString(isDutch ? 'nl-BE' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </div>

          {/* Patient Card */}
          <div className="doc-patient-box">
            <div className="doc-patient-grid">
              <div>
                <span className="doc-field-label">{isDutch ? 'Patiënt' : 'Patient'}:</span>
                <span className="doc-field-val strong">{activeChild?.name || 'Baby'}</span>
              </div>
              <div>
                <span className="doc-field-label">{isDutch ? 'Geboortedatum' : 'Birthdate'}:</span>
                <span className="doc-field-val">{activeChild?.birthdate || '–'}</span>
              </div>
              <div>
                <span className="doc-field-label">{isDutch ? 'Diagnose / Klachten' : 'Diagnosis'}:</span>
                <span className="doc-field-val">{diagnosisText}</span>
              </div>
              <div>
                <span className="doc-field-label">{isDutch ? 'Duur ziekte' : 'Illness Duration'}:</span>
                <span className="doc-field-val">{illnessHours} {isDutch ? 'uur' : 'hours'}</span>
              </div>
            </div>

            {sickData.notes && (
              <div className="doc-notes-row">
                <span className="doc-field-label">{isDutch ? 'Observaties ouders' : 'Parent Notes'}:</span>
                <span className="doc-field-val">{sickData.notes}</span>
              </div>
            )}
          </div>

          {/* Key Metrics Grid */}
          <div className="doc-metrics-grid">
            <div className="doc-metric-card">
              <div className="metric-header">
                <Thermometer size={14} color="var(--color-health)" />
                <span>{isDutch ? 'Laatste Meting' : 'Latest Temp'}</span>
              </div>
              <div className="metric-large">
                {sickData.latestTemp
                  ? (isMetric ? `${sickData.latestTemp.tempC}°C` : `${sickData.latestTemp.tempF}°F`)
                  : '–'}
              </div>
              <div className="metric-sub">
                {sickData.latestTemp
                  ? new Date(sickData.latestTemp.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : (isDutch ? 'Geen meting' : 'None')}
              </div>
            </div>

            <div className="doc-metric-card">
              <div className="metric-header">
                <Thermometer size={14} color="var(--status-red)" />
                <span>{isDutch ? 'Hoogste Koorts' : 'Peak Fever'}</span>
              </div>
              <div className="metric-large">
                {sickData.peakTemp
                  ? (isMetric ? `${sickData.peakTemp.tempC}°C` : `${sickData.peakTemp.tempF}°F`)
                  : '–'}
              </div>
              <div className="metric-sub">
                {sickData.peakTemp
                  ? new Date(sickData.peakTemp.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : (isDutch ? 'Geen meting' : 'None')}
              </div>
            </div>

            <div className="doc-metric-card">
              <div className="metric-header">
                <Droplets size={14} color="var(--color-daycare)" />
                <span>{isDutch ? 'Vocht (24u)' : 'Fluids (24h)'}</span>
              </div>
              <div className="metric-large">
                {sickData.hydration24h.totalFluidsMl} ml
              </div>
              <div className="metric-sub">
                {sickData.hydration24h.totalFluidsOz} oz
                {sickData.hydration24h.nursingDurationMinutes > 0 && ` + ${sickData.hydration24h.nursingDurationMinutes}m`}
              </div>
            </div>

            <div className="doc-metric-card">
              <div className="metric-header">
                <span style={{ fontSize: '0.85rem' }}>✨</span>
                <span>{isDutch ? 'Plasluiers (24u)' : 'Wet Diapers (24h)'}</span>
              </div>
              <div className="metric-large">
                {sickData.hydration24h.wetDiapers}
              </div>
              <div className={`metric-sub ${sickData.hydration24h.status === 'warning' ? 'danger-text' : ''}`}>
                {sickData.hydration24h.status === 'good'
                  ? (isDutch ? 'Voldoende' : 'Sufficient')
                  : (isDutch ? '⚠️ Let op hydratatie' : '⚠️ Watch hydration')}
              </div>
            </div>
          </div>

          {/* Section: Medications Administered */}
          <div className="doc-section">
            <h3 className="doc-section-title">
              <Pill size={15} color="var(--color-pump)" />
              <span>{isDutch ? 'Toegediende Medicatie (voorgaande 72u)' : 'Medications Administered (Past 72h)'}</span>
            </h3>

            {sickData.recentMeds.length === 0 ? (
              <div className="doc-empty-table-text">
                {isDutch ? 'Geen medicatie geregistreerd in de voorbije 72 uur.' : 'No medications recorded in the past 72 hours.'}
              </div>
            ) : (
              <table className="doc-table">
                <thead>
                  <tr>
                    <th>{isDutch ? 'Tijdstip' : 'Timestamp'}</th>
                    <th>{isDutch ? 'Geneesmiddel' : 'Medication'}</th>
                    <th>{isDutch ? 'Dosis' : 'Dosage'}</th>
                    <th>{isDutch ? 'Toegediend door' : 'Administered by'}</th>
                  </tr>
                </thead>
                <tbody>
                  {sickData.recentMeds.map((m) => (
                    <tr key={m.id}>
                      <td className="doc-time-cell">
                        {new Date(m.timestamp).toLocaleDateString([], { day: '2-digit', month: '2-digit' })}{' '}
                        <strong>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                      </td>
                      <td className="strong">{m.name}</td>
                      <td>{m.dosage || '–'}</td>
                      <td>{m.loggedBy || '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Section: Temperature Log */}
          <div className="doc-section">
            <h3 className="doc-section-title">
              <Thermometer size={15} color="var(--color-health)" />
              <span>{isDutch ? 'Temperatuurmetingen' : 'Temperature History'}</span>
            </h3>

            {sickData.tempReadings.length === 0 ? (
              <div className="doc-empty-table-text">
                {isDutch ? 'Geen temperatuurmetingen geregistreerd.' : 'No temperature readings recorded.'}
              </div>
            ) : (
              <table className="doc-table">
                <thead>
                  <tr>
                    <th>{isDutch ? 'Tijdstip' : 'Timestamp'}</th>
                    <th>{isDutch ? 'Temperatuur' : 'Temperature'}</th>
                    <th>{isDutch ? 'Status' : 'Status'}</th>
                    <th>{isDutch ? 'Notitie' : 'Note'}</th>
                  </tr>
                </thead>
                <tbody>
                  {sickData.tempReadings.map((tItem) => (
                    <tr key={tItem.id}>
                      <td className="doc-time-cell">
                        {new Date(tItem.timestamp).toLocaleDateString([], { day: '2-digit', month: '2-digit' })}{' '}
                        <strong>{new Date(tItem.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                      </td>
                      <td className="strong">
                        {isMetric ? `${tItem.tempC}°C` : `${tItem.tempF}°F`}
                      </td>
                      <td>
                        <span className={`doc-status-badge ${tItem.status.toLowerCase()}`}>
                          {tItem.status === 'HIGH_FEVER'
                            ? (isDutch ? 'Hoge Koorts' : 'High Fever')
                            : tItem.status === 'ELEVATED'
                            ? (isDutch ? 'Verhoging' : 'Elevated')
                            : (isDutch ? 'Normaal' : 'Normal')}
                        </span>
                      </td>
                      <td>{tItem.note || '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pediatric Guidance / Red Flags Footer */}
          <div className="doc-footer-guidance">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
              <AlertTriangle size={15} color="var(--status-amber)" />
              <span>{isDutch ? 'Rode vlaggen & Alarmsignalen' : 'Pediatric Red Flags'}</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
              {isDutch
                ? 'Contacteer onmiddellijk een arts bij: baby jonger dan 3 maanden met koorts ≥ 38.0°C, sufheid of moeilijk wekbaar, aanhoudende koorts > 3 dagen, kreunend ademhalen, of tekenen van uitdroging (geen natte luier gedurende > 8 uur).'
                : 'Seek immediate medical attention if: infant under 3 months with fever ≥ 38.0°C (100.4°F), extreme lethargy, fever lasting > 3 days, breathing difficulties, or dehydration (no wet diaper for > 8 hours).'}
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer no-print">
          <button type="button" className="btn-secondary" onClick={closeModal}>
            {isDutch ? 'Sluiten' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
