import React, { useState, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { syncService } from '../services/syncService';
import { triggerHaptic } from '../utils/haptics';
import { PhotoLightbox } from './PhotoLightbox';
import {
  FileText,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Eye,
  ExternalLink,
  Check,
  Moon,
  Milk,
  Apple,
  Sparkles as DiaperIcon,
  Stethoscope,
  Clock,
  BookOpen,
  Settings,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export function DaycareReportUploader({
  reportUrl,
  reportType,
  onReportChange,
  daycareName = '',
  dateStr = '',
  onExtractedCountChange,
}) {
  const { preferences, addEvent, openModal, closeModal, language, t, activeChild } = useApp();
  const isDutch = language === 'nl';
  const fileInputRef = useRef(null);

  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [showLightbox, setShowLightbox] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [selectedIndices, setSelectedIndices] = useState(new Set());
  const [importedSuccess, setImportedSuccess] = useState(null);

  // Raw file dataUrl for sending to Gemini API
  const [rawFileDataUrl, setRawFileDataUrl] = useState(null);

  const hasApiKey = Boolean(preferences?.geminiApiKey && preferences.geminiApiKey.trim());

  // Handle file selection (Image or PDF)
  const processFile = useCallback(async (file) => {
    if (!file) return;

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImage = file.type.startsWith('image/');

    if (!isPdf && !isImage) {
      alert(isDutch ? 'Selecteer een afbeelding (JPG, PNG) of PDF-bestand.' : 'Please select an image or PDF file.');
      return;
    }

    setIsUploading(true);
    setAnalysisError('');
    setExtractedData(null);
    setImportedSuccess(null);
    triggerHaptic('light', preferences?.haptics);

    try {
      const reader = new FileReader();
      const dataUrl = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });

      setRawFileDataUrl(dataUrl);

      // Upload to server storage
      const uploadedUrl = await syncService.uploadFile(dataUrl);
      const mime = isPdf ? 'application/pdf' : (file.type || 'image/jpeg');

      onReportChange({
        url: uploadedUrl || dataUrl,
        type: mime,
        name: file.name,
        size: file.size,
      });

      triggerHaptic('success', preferences?.haptics);
    } catch (err) {
      console.error('[DaycareReport] Upload failed:', err);
      setAnalysisError(err.message || 'File upload failed');
    } finally {
      setIsUploading(false);
    }
  }, [isDutch, onReportChange, preferences?.haptics]);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, [processFile]);

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleRemoveReport = (e) => {
    e.stopPropagation();
    triggerHaptic('warning', preferences?.haptics);
    onReportChange(null);
    setRawFileDataUrl(null);
    setExtractedData(null);
    setImportedSuccess(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Trigger Gemini AI extraction
  const handleAnalyzeWithGemini = async () => {
    if (!hasApiKey) {
      setAnalysisError(t('daycareModal.apiKeyMissing'));
      return;
    }

    const fileToAnalyze = rawFileDataUrl || reportUrl;
    if (!fileToAnalyze) {
      setAnalysisError(isDutch ? 'Upload eerst een foto of PDF van het verslag.' : 'Please upload a photo or PDF first.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError('');
    setImportedSuccess(null);
    triggerHaptic('medium', preferences?.haptics);

    try {
      const res = await syncService.extractDaycareReport({
        file: fileToAnalyze,
        mimeType: reportType || 'image/jpeg',
        date: dateStr || new Date().toISOString().split('T')[0],
        daycareName: daycareName || '',
        childName: activeChild?.name || 'Baby',
        apiKey: preferences.geminiApiKey,
      });

      if (!res.success) {
        throw new Error(res.error || 'Extraction failed');
      }

      setExtractedData(res);
      // Select all by default
      if (Array.isArray(res.events)) {
        setSelectedIndices(new Set(res.events.map((_, i) => i)));
      }
      triggerHaptic('success', preferences?.haptics);
    } catch (err) {
      console.error('[DaycareReport] Gemini extraction failed:', err);
      setAnalysisError(err.message || 'Gemini AI extraction failed. Check API key and try again.');
      triggerHaptic('warning', preferences?.haptics);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Toggle selection for a single extracted item
  const toggleIndex = (idx) => {
    triggerHaptic('light', preferences?.haptics);
    setSelectedIndices(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const selectAll = () => {
    if (!extractedData?.events) return;
    triggerHaptic('light', preferences?.haptics);
    setSelectedIndices(new Set(extractedData.events.map((_, i) => i)));
  };

  const deselectAll = () => {
    triggerHaptic('light', preferences?.haptics);
    setSelectedIndices(new Set());
  };

  // Add selected extracted activities to timeline with comment "daycare"
  const handleImportSelected = () => {
    if (!extractedData?.events || selectedIndices.size === 0) return;

    triggerHaptic('success', preferences?.haptics);
    const datePrefix = dateStr || new Date().toISOString().split('T')[0];
    const [year, month, day] = datePrefix.split('-').map(Number);

    let count = 0;
    extractedData.events.forEach((item, idx) => {
      if (!selectedIndices.has(idx)) return;

      // Calculate timestamp from HH:MM time
      let beginDt = Date.now();
      if (item.time) {
        const [hours, minutes] = item.time.split(':').map(Number);
        const d = new Date(year, month - 1, day, hours || 12, minutes || 0, 0, 0);
        beginDt = d.getTime();
      }

      let endDt = null;
      let durationMs = 0;
      if (item.endTime) {
        const [endH, endM] = item.endTime.split(':').map(Number);
        const ed = new Date(year, month - 1, day, endH || 13, endM || 0, 0, 0);
        endDt = ed.getTime();
        durationMs = Math.max(0, endDt - beginDt);
      } else if (item.durationMinutes) {
        durationMs = Number(item.durationMinutes) * 60000;
        endDt = beginDt + durationMs;
      }

      // Mandatory requirement: comment/note MUST be "daycare" (with optional remark appended)
      const noteComment = item.daycareRemark && item.daycareRemark.trim()
        ? `daycare: ${item.daycareRemark.trim()}`
        : 'daycare';

      const eventPayload = {
        type: item.type || 'NOTE',
        beginDt,
        endDt,
        durationMs,
        note: noteComment,
        photoUrl: reportUrl || null,
        details: {
          ...(item.details || {}),
          source: 'DAYCARE',
          daycareName: daycareName || extractedData.daycareName || '',
          reportUrl: reportUrl || null,
          title: item.title || '',
          teacherRemark: item.daycareRemark || '',
        },
      };

      addEvent(eventPayload);
      count++;
    });

    if (onExtractedCountChange) {
      onExtractedCountChange(count);
    }

    try {
      confetti({ particleCount: 35, spread: 60, origin: { y: 0.7 } });
    } catch {}

    setImportedSuccess(
      t('daycareModal.importedSuccess', { count }) || `${count} activiteiten toegevoegd met opmerking 'daycare'!`
    );
  };

  const isPdfReport = Boolean(
    reportType?.includes('pdf') ||
    (typeof reportUrl === 'string' && reportUrl.toLowerCase().includes('.pdf'))
  );

  const getEventIcon = (type) => {
    switch (type) {
      case 'SLEEP': return Moon;
      case 'BOTTLE': return Milk;
      case 'SOLIDS': return Apple;
      case 'DIAPER': return DiaperIcon;
      case 'HEALTH': return Stethoscope;
      case 'ROUTINE': return Clock;
      case 'NOTE':
      default:
        return BookOpen;
    }
  };

  const getEventColor = (type) => {
    switch (type) {
      case 'SLEEP': return 'var(--color-sleep)';
      case 'BOTTLE': return 'var(--color-bottle)';
      case 'SOLIDS': return 'var(--color-solids)';
      case 'DIAPER': return 'var(--color-diaper)';
      case 'HEALTH': return 'var(--color-health)';
      case 'ROUTINE': return 'var(--color-routine)';
      case 'NOTE':
      default:
        return 'var(--color-note)';
    }
  };

  return (
    <div className="daycare-report-section">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />

      {/* 1. Upload Dropzone / Preview */}
      {!reportUrl ? (
        <div
          className={`daycare-dropzone ${dragActive ? 'drag-active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          {isUploading ? (
            <div className="dropzone-content">
              <Loader2 size={32} className="spin" style={{ color: 'var(--color-daycare)' }} />
              <p className="dropzone-title">{isDutch ? 'Verslag uploaden...' : 'Uploading report...'}</p>
            </div>
          ) : (
            <div className="dropzone-content">
              <div className="dropzone-icon-circle">
                <Upload size={22} />
              </div>
              <p className="dropzone-title">{t('daycareModal.uploadReportPrompt')}</p>
              <p className="dropzone-subtitle">{t('daycareModal.uploadReportHint')}</p>
              <button
                type="button"
                className="btn-secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                style={{ marginTop: '0.4rem', fontSize: '0.82rem', padding: '0.45rem 0.95rem' }}
              >
                {t('daycareModal.selectFileBtn')}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="daycare-attached-card">
          <div className="attached-header">
            <div className="attached-type-tag">
              {isPdfReport ? (
                <>
                  <FileText size={16} style={{ color: 'var(--color-daycare)' }} />
                  <span>PDF Verslag</span>
                </>
              ) : (
                <>
                  <Eye size={16} style={{ color: 'var(--color-daycare)' }} />
                  <span>Foto Verslag</span>
                </>
              )}
            </div>

            <div className="attached-actions">
              {isPdfReport ? (
                <a
                  href={syncService.resolveMediaUrl(reportUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-icon-subtle"
                  title={isDutch ? 'Open PDF in nieuw tabblad' : 'Open PDF in new tab'}
                >
                  <ExternalLink size={16} />
                </a>
              ) : (
                <button
                  type="button"
                  className="btn-icon-subtle"
                  onClick={() => setShowLightbox(true)}
                  title={isDutch ? 'Foto vergroten' : 'Zoom photo'}
                >
                  <Eye size={16} />
                </button>
              )}
              <button
                type="button"
                className="btn-icon-subtle danger"
                onClick={handleRemoveReport}
                title={t('daycareModal.removeFileBtn')}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          {/* Thumbnail preview */}
          {isPdfReport ? (
            <div
              className="pdf-preview-box"
              onClick={() => window.open(syncService.resolveMediaUrl(reportUrl), '_blank')}
            >
              <FileText size={36} style={{ color: 'var(--color-daycare)' }} />
              <div className="pdf-info">
                <span className="pdf-filename">{isDutch ? 'Dagverslag crèche (PDF)' : 'Daycare report (PDF)'}</span>
                <span className="pdf-hint">{isDutch ? 'Tik om PDF te openen ↗' : 'Tap to open PDF ↗'}</span>
              </div>
            </div>
          ) : (
            <div className="photo-preview-box" onClick={() => setShowLightbox(true)}>
              <img
                src={syncService.resolveMediaUrl(reportUrl)}
                alt="Daycare report"
                className="photo-preview-img"
              />
              <div className="photo-zoom-hint">
                <Eye size={14} />
                <span>{isDutch ? 'Tik voor vergroting' : 'Tap to zoom'}</span>
              </div>
            </div>
          )}

          {/* Lightbox for image preview */}
          {showLightbox && !isPdfReport && (
            <PhotoLightbox
              photoUrl={syncService.resolveMediaUrl(reportUrl)}
              onClose={() => setShowLightbox(false)}
            />
          )}

          {/* 2. Gemini AI Extract Button */}
          <div className="gemini-extract-panel">
            {!hasApiKey ? (
              <div className="gemini-missing-key-banner">
                <AlertCircle size={18} style={{ color: '#D97706', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#92400E' }}>
                    {t('daycareModal.apiKeyMissing')}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#B45309' }}>
                    {isDutch
                      ? 'Voeg je Google Gemini API-sleutel toe in Instellingen om verslagen automatisch uit te lezen.'
                      : 'Add your Google Gemini API key in Settings to extract reports automatically.'}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    closeModal();
                    window.dispatchEvent(new CustomEvent('babytracker:navigate', { detail: { tab: 'settings' } }));
                  }}
                  style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}
                >
                  <Settings size={13} />
                  <span>{isDutch ? 'Instellingen' : 'Settings'}</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-gemini-extract"
                onClick={handleAnalyzeWithGemini}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 size={16} className="spin" />
                    <span>{t('daycareModal.analyzing')}</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>{t('daycareModal.analyzeWithGemini')}</span>
                  </>
                )}
              </button>
            )}

            {analysisError && (
              <div className="gemini-error-banner">
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{analysisError}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Extracted Activities Checklist */}
      {extractedData && Array.isArray(extractedData.events) && (
        <div className="extracted-results-container">
          <div className="extracted-header">
            <div>
              <h4 className="extracted-title">
                <Sparkles size={16} style={{ color: '#9333EA' }} />
                <span>{t('daycareModal.extractedTitle', { count: extractedData.events.length })}</span>
              </h4>
              <p className="extracted-subtitle">{t('daycareModal.extractedSubtitle')}</p>
            </div>

            <div className="extracted-toggle-buttons">
              <button type="button" className="btn-link-subtle" onClick={selectAll}>
                {t('daycareModal.selectAll')}
              </button>
              <span className="dot-divider">•</span>
              <button type="button" className="btn-link-subtle" onClick={deselectAll}>
                {t('daycareModal.deselectAll')}
              </button>
            </div>
          </div>

          {/* General summary if found */}
          {extractedData.generalSummary && (
            <div className="extracted-summary-callout">
              <span className="summary-label">{t('daycareModal.generalSummary')}:</span>
              <p className="summary-text">{extractedData.generalSummary}</p>
            </div>
          )}

          {extractedData.events.length === 0 ? (
            <div className="extracted-empty-banner">
              <p>{t('daycareModal.noItemsExtracted')}</p>
            </div>
          ) : (
            <div className="extracted-items-list">
              {extractedData.events.map((ev, idx) => {
                const isSelected = selectedIndices.has(idx);
                const IconComponent = getEventIcon(ev.type);
                const typeColor = getEventColor(ev.type);

                return (
                  <div
                    key={idx}
                    className={`extracted-item-row ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleIndex(idx)}
                  >
                    <div className="extracted-checkbox">
                      <div className={`checkbox-box ${isSelected ? 'checked' : ''}`}>
                        {isSelected && <Check size={14} color="#FFF" />}
                      </div>
                    </div>

                    <div className="extracted-icon-wrap" style={{ backgroundColor: `${typeColor}15`, color: typeColor }}>
                      <IconComponent size={16} />
                    </div>

                    <div className="extracted-content">
                      <div className="extracted-item-top">
                        <span className="extracted-item-title">{ev.title || ev.type}</span>
                        {ev.time && <span className="extracted-item-time">{ev.time}{ev.endTime ? ` - ${ev.endTime}` : ''}</span>}
                      </div>

                      {ev.daycareRemark && (
                        <div className="extracted-item-remark">
                          "{ev.daycareRemark}"
                        </div>
                      )}

                      <div className="extracted-tag-comment">
                        <span className="tag-pill">opmerking: "daycare"</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Import Action Button */}
          {extractedData.events.length > 0 && (
            <div className="extracted-actions-footer">
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={handleImportSelected}
                disabled={selectedIndices.size === 0}
              >
                <CheckCircle2 size={16} />
                <span>
                  {t('daycareModal.importSelected', { count: selectedIndices.size })}
                </span>
              </button>
            </div>
          )}

          {importedSuccess && (
            <div className="gemini-success-banner">
              <CheckCircle2 size={16} style={{ color: '#16A34A', flexShrink: 0 }} />
              <span>{importedSuccess}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
