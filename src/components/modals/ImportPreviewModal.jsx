import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { generateImportSummary } from '../../utils/csvParser';
import { formatTime, formatDateHeading } from '../../utils/formatters';
import { Upload, X, Check, Baby, Sliders, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

export function ImportPreviewModal() {
  const {
    activeModal,
    modalInitialData,
    closeModal,
    importEvents,
    childList,
    setChildList,
    addChild,
    updateChild,
    activeChildId,
    setActiveChildId,
    setPreferences,
    t,
    language,
  } = useApp();

  const [importMode, setImportMode] = useState('replace'); // default to 'replace' or 'merge'
  const [applyProfile, setApplyProfile] = useState(true);
  const [applyUnits, setApplyUnits] = useState(true);

  if (activeModal !== 'IMPORT_PREVIEW' || !modalInitialData?.parsedEvents) return null;

  const events = modalInitialData.parsedEvents;
  const fileName = modalInitialData.fileName || 'Baby Tracker Export.csv';
  const detectedProfile = modalInitialData.detectedProfile;
  const detectedUnits = modalInitialData.detectedUnits;
  const detectedCaregivers = modalInitialData.detectedCaregivers || [];
  const summary = generateImportSummary(events);

  const handleConfirm = () => {
    let targetChildKey = modalInitialData.activeChildId || activeChildId;

    // 1. Handle child profile import
    if (applyProfile && detectedProfile?.name) {
      const existing = childList.find(
        c => c.name.toLowerCase() === detectedProfile.name.toLowerCase()
      );

      if (existing) {
        updateChild(existing.id, {
          birthdate: detectedProfile.birthdate || existing.birthdate,
        });
        setActiveChildId(existing.id);
        targetChildKey = existing.id;
      } else if (childList.length === 1 && childList[0].id === 'child_1' && childList[0].name === 'Rowan') {
        // Replace initial demo placeholder child
        const updated = {
          ...childList[0],
          name: detectedProfile.name,
          birthdate: detectedProfile.birthdate || childList[0].birthdate,
          avatarColor: 'terracotta',
        };
        setChildList([updated]);
        setActiveChildId(updated.id);
        targetChildKey = updated.id;
      } else {
        const newChild = addChild({
          name: detectedProfile.name,
          birthdate: detectedProfile.birthdate,
          avatarColor: 'terracotta',
        });
        targetChildKey = newChild.id;
      }
    }

    // 2. Handle detected unit preferences
    if (applyUnits && detectedUnits) {
      setPreferences(prev => ({
        ...prev,
        weightUnit: detectedUnits.weightUnit || prev.weightUnit,
        lengthUnit: detectedUnits.lengthUnit || prev.lengthUnit,
        tempUnit: detectedUnits.tempUnit || prev.tempUnit,
        volumeUnit: detectedUnits.weightUnit === 'kg' ? 'ml' : prev.volumeUnit,
      }));
    }

    // Re-tag events with current child if needed
    const finalizedEvents = events.map(ev => ({
      ...ev,
      childKey: targetChildKey || ev.childKey,
    }));

    importEvents(finalizedEvents, importMode);

    try {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
      });
    } catch { }

    closeModal();
  };

  const locale = language === 'nl' ? 'nl-BE' : 'en-US';
  const getEarliestFormatted = summary.earliestDate
    ? new Date(summary.earliestDate).toLocaleDateString([locale], { month: 'short', day: 'numeric', year: 'numeric' })
    : (language === 'nl' ? 'Onbekend' : 'Unknown');
  const getLatestFormatted = summary.latestDate
    ? new Date(summary.latestDate).toLocaleDateString([locale], { month: 'short', day: 'numeric', year: 'numeric' })
    : (language === 'nl' ? 'Onbekend' : 'Unknown');

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal-card" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-title-icon" style={{ backgroundColor: 'var(--color-terracotta-light)', color: 'var(--color-terracotta)' }}>
              <Upload size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem' }}>{t('importModal.title')}</h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{fileName}</span>
            </div>
          </div>
          <button onClick={closeModal} style={{ color: 'var(--text-tertiary)' }} aria-label={t('common.close')}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ gap: '1rem' }}>
          {/* Top Success Banner */}
          <div style={{ backgroundColor: 'var(--status-green-light)', border: '1px solid rgba(58, 125, 68, 0.2)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--status-green)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Check size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--status-green)', fontSize: '0.92rem' }}>
                {t('importModal.recognized', { count: summary.total })}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                {language === 'nl' ? 'Periode:' : 'Timespan:'} {getEarliestFormatted} — {getLatestFormatted}
              </div>
            </div>
          </div>

          {/* Profile & Units Detected Banner */}
          {detectedProfile?.name && (
            <div style={{ backgroundColor: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={applyProfile}
                  onChange={e => setApplyProfile(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: 'var(--color-terracotta)' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', fontWeight: 600 }}>
                  <Baby size={16} color="var(--color-terracotta)" />
                  {language === 'nl' ? 'Babyprofiel importeren:' : 'Import Baby Profile:'} <strong>{detectedProfile.name}</strong>
                  {detectedProfile.birthdate && (
                    <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-secondary)' }}>
                      ({language === 'nl' ? 'Geboren:' : 'Born:'} {detectedProfile.birthdate})
                    </span>
                  )}
                </div>
              </label>

              {detectedUnits?.weightUnit && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', marginLeft: '1.75rem' }}>
                  <input
                    type="checkbox"
                    checked={applyUnits}
                    onChange={e => setApplyUnits(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: 'var(--color-sage)' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {language === 'nl' ? 'Standaard eenheden instellen op Metrisch (kg, cm, °C, mL)' : `Set preferred units to Metric (${detectedUnits.weightUnit}, ${detectedUnits.lengthUnit || 'cm'}, ${detectedUnits.tempUnit || '°C'})`}
                  </span>
                </label>
              )}

              {detectedCaregivers.length > 0 && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '1.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>{language === 'nl' ? 'Herkende verzorgers:' : 'Caregivers tracked:'}</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{detectedCaregivers.join(', ')}</strong>
                </div>
              )}
            </div>
          )}

          {/* Activity Breakdown Grid */}
          <div className="form-group">
            <label className="form-label">{language === 'nl' ? 'Overzicht van activiteiten' : 'Activity Breakdown'}</label>
            <div className="preview-summary-grid">
              <div className="preview-stat-card">
                <div className="preview-stat-number">
                  {(summary.byType.BREAST || 0) + (summary.byType.BOTTLE || 0) + (summary.byType.SOLIDS || 0)}
                </div>
                <div className="preview-stat-label">
                  {language === 'nl' ? `Voedingen (${summary.byType.BREAST || 0} borst)` : `Feeds (${summary.byType.BREAST || 0} BF)`}
                </div>
              </div>

              <div className="preview-stat-card">
                <div className="preview-stat-number">{summary.byType.SLEEP || 0}</div>
                <div className="preview-stat-label">{language === 'nl' ? 'Slaapjes' : 'Sleeps'}</div>
              </div>

              <div className="preview-stat-card">
                <div className="preview-stat-number">{summary.byType.DIAPER || 0}</div>
                <div className="preview-stat-label">{language === 'nl' ? 'Pampers' : 'Diapers'}</div>
              </div>

              <div className="preview-stat-card">
                <div className="preview-stat-number">
                  {(summary.byType.GROWTH || 0) + (summary.byType.MILESTONE || 0) + (summary.byType.HEALTH || 0)}
                </div>
                <div className="preview-stat-label">
                  {language === 'nl' ? 'Groei & Eerste keren' : 'Growth & Firsts'}
                </div>
              </div>
            </div>
          </div>

          {/* Sample Rows Table */}
          <div className="form-group">
            <label className="form-label">{language === 'nl' ? 'Gegevensvoorbeeld (laatste 5 activiteiten)' : 'Data Preview (Latest 5 Events)'}</label>
            <div className="preview-table-container">
              <table className="preview-table">
                <thead>
                  <tr>
                    <th>{language === 'nl' ? 'Datum & Tijd' : 'Date & Time'}</th>
                    <th>{language === 'nl' ? 'Type' : 'Type'}</th>
                    <th>{language === 'nl' ? 'Details' : 'Details'}</th>
                    <th>{language === 'nl' ? 'Verzorger' : 'Caregiver'}</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.sampleEvents.map((ev, idx) => (
                    <tr key={idx}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {formatDateHeading(new Date(ev.beginDt).toISOString().split('T')[0], language)} {formatTime(ev.beginDt, language)}
                      </td>
                      <td style={{ fontWeight: 600 }}>{t(`categories.${ev.type}`) || ev.type}</td>
                      <td>
                        {ev.type === 'BREAST' && (language === 'nl' ? `Kant: ${ev.details.side === 'LEFT' ? 'Links' : ev.details.side === 'RIGHT' ? 'Rechts' : 'Beide'} (${Math.round((ev.durationMs || 0) / 60000)}m)` : `Side: ${ev.details.side || 'Left'} (${Math.round((ev.durationMs || 0) / 60000)}m)`)}
                        {ev.type === 'BOTTLE' && `${ev.details.volumeFloz || 0} oz (${ev.details.milkType})`}
                        {ev.type === 'SLEEP' && `${Math.round((ev.durationMs || 0) / 60000)} ${language === 'nl' ? 'minuten geslapen' : 'min stretch'}`}
                        {ev.type === 'DIAPER' && `${ev.details.pee ? (language === 'nl' ? 'Pipi ' : 'Wet ') : ''}${ev.details.poop ? (language === 'nl' ? 'Kaka' : 'Dirty') : ''} ${ev.details.color ? `(${ev.details.color})` : ''}`}
                        {ev.type === 'GROWTH' && (ev.details.weightKg ? `${ev.details.weightKg} kg` : `${ev.details.weightLb || 0} lbs`)}
                        {ev.type === 'MILESTONE' && ev.details.milestoneName}
                        {ev.type === 'HEALTH' && (ev.details.medicineName || (ev.details.temperatureC ? `${ev.details.temperatureC}°C` : ''))}
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {ev.details.caregiver ? (language === 'nl' ? `Door ${ev.details.caregiver}` : `By ${ev.details.caregiver}`) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mode Selection */}
          <div className="form-group">
            <label className="form-label">{language === 'nl' ? 'Importeermodus' : 'Import Mode'}</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.65rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', cursor: 'pointer', backgroundColor: importMode === 'replace' ? 'var(--bg-card-subtle)' : 'transparent' }}>
                <input
                  type="radio"
                  name="importMode"
                  value="replace"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                  style={{ accentColor: 'var(--color-terracotta)' }}
                />
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    {language === 'nl' ? 'Volledige export laden (Vervang huidige demogegevens)' : 'Load Entire Export (Replace current demo data)'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {language === 'nl' ? 'Aanbevolen: Vervang voorbeelddata door al je echte activiteitengeschiedenis' : 'Recommended: Replace sample data with all your real activity history'}
                  </div>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.65rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', cursor: 'pointer', backgroundColor: importMode === 'merge' ? 'var(--bg-card-subtle)' : 'transparent' }}>
                <input
                  type="radio"
                  name="importMode"
                  value="merge"
                  checked={importMode === 'merge'}
                  onChange={() => setImportMode('merge')}
                  style={{ accentColor: 'var(--color-terracotta)' }}
                />
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t('importModal.mergeOption')}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {t('importModal.mergeDesc')}
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={closeModal}>
            {t('common.cancel')}
          </button>
          <button type="button" className="btn-primary" onClick={handleConfirm} id="confirm-import-btn">
            {t('importModal.confirmBtn', { count: summary.total })}
          </button>
        </div>
      </div>
    </div>
  );
}
