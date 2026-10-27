import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { triggerHaptic } from '../../utils/haptics';
import { formatTime, formatDurationMs } from '../../utils/formatters';
import { DaycareReportUploader } from '../DaycareReportUploader';
import {
  School,
  X,
  Clock,
  Calendar,
  User,
  Check,
  Play,
  RotateCcw,
  Sparkles,
  Bell,
  Trash2,
  Building,
  Car,
} from 'lucide-react';

export function DaycareModal() {
  const {
    activeModal,
    modalInitialData,
    closeModal,
    openModal,
    addEvent,
    updateEvent,
    deleteEvent,
    activeTimers,
    startDaycare,
    stopDaycare,
    clearActiveTimer,
    completeReminder,
    caregivers,
    activeCaregiver,
    preferences,
    language,
    t,
    showConfirm,
  } = useApp();

  const isDutch = language === 'nl';
  const isEditing = Boolean(modalInitialData && modalInitialData.id);
  const isFromActiveTimer = Boolean(modalInitialData?.fromActiveTimer === 'daycare');
  const isCurrentlyAtDaycare = Boolean(activeTimers?.daycare?.running);
  const isFromReminder = Boolean(modalInitialData?.sourceReminderId);
  const isDropOffReminder = Boolean(
    isFromReminder && (modalInitialData?.isDropOff || modalInitialData?.subType === 'DROPOFF' || (!modalInitialData?.isPickUp && modalInitialData?.subType !== 'PICKUP'))
  );
  const isPickUpReminder = Boolean(
    isFromReminder && (modalInitialData?.isPickUp || modalInitialData?.subType === 'PICKUP')
  );

  // Active sub-tab: 'stay' or 'report' (default to 'stay' so user always has access to times & delete button)
  const [activeTab, setActiveTab] = useState(() => {
    return modalInitialData?.initialTab || 'stay';
  });

  // Stay form fields
  const [daycareName, setDaycareName] = useState(() => {
    const raw = modalInitialData?.details?.daycareName ??
      modalInitialData?.daycareName ??
      modalInitialData?.prefilledData?.daycareName;
    if (raw && typeof raw === 'string' && raw.trim()) return raw.trim();
    return preferences?.daycareName || '';
  });

  const [dateStr, setDateStr] = useState(() => {
    const d = new Date(modalInitialData?.beginDt || Date.now());
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });

  const [dropOffTime, setDropOffTime] = useState(() => {
    const initialBegin = modalInitialData?.beginDt || (isCurrentlyAtDaycare ? activeTimers.daycare.dropOffMs : null);
    const d = initialBegin ? new Date(initialBegin) : new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  const [pickUpTime, setPickUpTime] = useState(() => {
    const initialEnd = modalInitialData?.endDt || (isFromActiveTimer ? Date.now() : null);
    const d = initialEnd ? new Date(initialEnd) : new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  const [dropOffCaregiver, setDropOffCaregiver] = useState(() => {
    return modalInitialData?.details?.dropOffCaregiver || activeCaregiver?.id || 'cg_mom';
  });

  const [pickUpCaregiver, setPickUpCaregiver] = useState(() => {
    return modalInitialData?.details?.pickUpCaregiver || activeCaregiver?.id || 'cg_dad';
  });

  const [note, setNote] = useState(() => modalInitialData?.note || '');

  // Daycare report attachment
  const [report, setReport] = useState(() => {
    const rawUrl = modalInitialData?.details?.reportUrl || modalInitialData?.photoUrl || null;
    const renderUrl = modalInitialData?.details?.renderUrl || (modalInitialData?.photoUrl && !modalInitialData.photoUrl.toLowerCase().includes('.pdf') ? modalInitialData.photoUrl : null);
    const isPdf = Boolean(
      modalInitialData?.details?.reportType?.includes('pdf') ||
      (rawUrl && rawUrl.toLowerCase().includes('.pdf'))
    );
    const type = modalInitialData?.details?.reportType || (isPdf ? 'application/pdf' : 'image/jpeg');
    const url = modalInitialData?.details?.reportUrl || (isPdf ? rawUrl : null) || rawUrl;
    return (url || renderUrl) ? { url: url || renderUrl, type, renderUrl } : null;
  });

  const [extractedCount, setExtractedCount] = useState(() => {
    return modalInitialData?.details?.extractedCount || 0;
  });

  // Calculate duration from dropOffTime and pickUpTime
  const computeDurationMs = () => {
    if (!dropOffTime || !pickUpTime || !dateStr) return 0;
    const [y, m, d] = dateStr.split('-').map(Number);
    const [dH, dM] = dropOffTime.split(':').map(Number);
    const [pH, pM] = pickUpTime.split(':').map(Number);
    const start = new Date(y, m - 1, d, dH || 0, dM || 0, 0, 0).getTime();
    let end = new Date(y, m - 1, d, pH || 0, pM || 0, 0, 0).getTime();
    if (end < start) {
      end += 24 * 60 * 60 * 1000;
    }
    return Math.max(0, end - start);
  };

  const calculatedDurationMs = computeDurationMs();

  if (activeModal !== 'DAYCARE') return null;

  // 1. Live Drop-off: Starts the live timer and closes modal
  const handleStartLiveDropOff = () => {
    triggerHaptic('medium', preferences?.haptics);
    const finalDaycareName = (daycareName && daycareName.trim()) || preferences?.daycareName || '';

    // Check if user changed time from now
    const now = new Date();
    const nowH = String(now.getHours()).padStart(2, '0');
    const nowM = String(now.getMinutes()).padStart(2, '0');
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    let startMs = Date.now();
    if (dateStr && (dateStr !== todayStr || dropOffTime !== `${nowH}:${nowM}`)) {
      const [y, m, d] = dateStr.split('-').map(Number);
      const [h, min] = (dropOffTime || '').split(':').map(Number);
      startMs = new Date(y, m - 1, d, h || 0, min || 0, 0, 0).getTime();
    }

    startDaycare(startMs, finalDaycareName, dropOffCaregiver);
    if (modalInitialData?.sourceReminderId) {
      completeReminder(modalInitialData.sourceReminderId, false);
    }
    closeModal();
  };

  // 2. Pick up from live active timer
  const handlePickUpFromLiveTimer = () => {
    triggerHaptic('success', preferences?.haptics);
    stopDaycare();
  };

  // 3. Save stay (manual entry or finishing live timer)
  const handleSaveStay = (e) => {
    if (e) e.preventDefault();
    triggerHaptic('success', preferences?.haptics);

    const [y, m, d] = (dateStr || '').split('-').map(Number);
    const [dH, dM] = (dropOffTime || '').split(':').map(Number);
    const [pH, pM] = (pickUpTime || '').split(':').map(Number);

    const beginDt = new Date(y, m - 1, d, dH || 8, dM || 0, 0, 0).getTime();
    let endDt = new Date(y, m - 1, d, pH || 16, pM || 30, 0, 0).getTime();
    if (endDt < beginDt) {
      endDt += 24 * 60 * 60 * 1000;
    }
    const durationMs = Math.max(0, endDt - beginDt);
    const finalDaycareName = (daycareName && daycareName.trim()) || preferences?.daycareName || (isDutch ? 'Opvang / Crèche' : 'Daycare');

    // For photoUrl, use the rendered image so photo thumbnails, lightbox, and cards can display the render as an image!
    const effectivePhoto = report?.renderUrl || (report?.type?.includes('pdf') ? null : report?.url) || null;

    const eventPayload = {
      type: 'DAYCARE',
      beginDt,
      endDt,
      durationMs,
      note,
      photoUrl: effectivePhoto,
      details: {
        ...(modalInitialData?.details || {}),
        daycareName: finalDaycareName,
        dropOffCaregiver,
        pickUpCaregiver,
        reportUrl: report?.url || null,
        reportType: report?.type || null,
        renderUrl: report?.renderUrl || null,
        extractedCount,
      },
    };

    if (isEditing) {
      updateEvent(modalInitialData.id, eventPayload);
    } else {
      addEvent(eventPayload);
    }

    if (isFromActiveTimer || isCurrentlyAtDaycare) {
      clearActiveTimer('daycare');
    }

    if (modalInitialData?.sourceReminderId) {
      completeReminder(modalInitialData.sourceReminderId, false);
    }

    closeModal();
  };

  const handleDelete = async () => {
    triggerHaptic('warning', preferences?.haptics);
    if (isEditing) {
      const ok = await showConfirm({
        title: t('common.deleteConfirmTitle'),
        message: t('timeline.deleteConfirm') || (isDutch ? 'Weet je zeker dat je deze opvangregistratie wilt verwijderen?' : 'Are you sure you want to delete this daycare log?'),
        confirmText: t('common.delete'),
        type: 'danger',
      });
      if (ok) {
        deleteEvent(modalInitialData.id);
        if (isCurrentlyAtDaycare || isFromActiveTimer) {
          clearActiveTimer('daycare');
        }
        closeModal();
      }
    } else if (isCurrentlyAtDaycare || isFromActiveTimer) {
      const ok = await showConfirm({
        title: t('common.discardTimerTitle'),
        message: isDutch ? 'Weet je zeker dat je deze actieve opvangtimer wilt annuleren?' : 'Discard this active daycare timer?',
        confirmText: isDutch ? 'Timer wissen' : 'Discard timer',
        type: 'warning',
      });
      if (ok) {
        clearActiveTimer('daycare');
        closeModal();
      }
    }
  };

  // Schedule Individual Reminders
  const handleOpenDropOffSchedule = () => {
    triggerHaptic('light', preferences?.haptics);
    closeModal();
    const finalDaycareName = (daycareName && daycareName.trim()) || preferences?.daycareName || '';
    openModal('REMINDERS', {
      tab: 'create',
      presetId: 'preset_daycare_dropoff',
      activityType: 'DAYCARE',
      subType: 'DROPOFF',
      title: isDutch ? 'Afzetten bij crèche / opvang' : 'Daycare Drop-off',
      time: dropOffTime || '08:00',
      prefilledData: {
        subType: 'DROPOFF',
        daycareName: finalDaycareName,
      },
    });
  };

  const handleOpenPickUpSchedule = () => {
    triggerHaptic('light', preferences?.haptics);
    closeModal();
    const finalDaycareName = (daycareName && daycareName.trim()) || preferences?.daycareName || '';
    openModal('REMINDERS', {
      tab: 'create',
      presetId: 'preset_daycare_pickup',
      activityType: 'DAYCARE',
      subType: 'PICKUP',
      title: isDutch ? 'Ophalen van crèche / opvang' : 'Daycare Pick-up',
      time: pickUpTime || '16:30',
      prefilledData: {
        subType: 'PICKUP',
        daycareName: finalDaycareName,
      },
    });
  };

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal-card daycare-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div
              className="modal-title-icon"
              style={{ backgroundColor: 'var(--color-daycare-light)', color: 'var(--color-daycare)' }}
            >
              <School size={18} />
            </div>
            <h2>
              {isEditing ? t('daycareModal.titleEdit') : t('daycareModal.titleAdd')}
            </h2>
          </div>
          <button onClick={closeModal} style={{ color: 'var(--text-tertiary)' }} aria-label={t('common.close')}>
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{ padding: '0.65rem 1.15rem 0' }}>
          <div className="modal-mode-toggle">
            <button
              type="button"
              className={`modal-mode-btn ${activeTab === 'stay' ? 'active' : ''}`}
              onClick={() => {
                triggerHaptic('light', preferences?.haptics);
                setActiveTab('stay');
              }}
            >
              <Clock size={15} />
              <span>{t('daycareModal.tabStay')}</span>
            </button>

            <button
              type="button"
              className={`modal-mode-btn ${activeTab === 'report' ? 'active' : ''}`}
              onClick={() => {
                triggerHaptic('light', preferences?.haptics);
                setActiveTab('report');
              }}
            >
              <Sparkles size={15} style={{ color: '#9333EA' }} />
              <span>{t('daycareModal.tabReport')}</span>
              {report?.url && (
                <span
                  style={{
                    backgroundColor: 'var(--color-daycare)',
                    color: '#FFF',
                    borderRadius: '999px',
                    padding: '0.1rem 0.45rem',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                  }}
                >
                  1
                </span>
              )}
            </button>
          </div>
        </div>

        {/* TAB 1: Stay & Times */}
        {activeTab === 'stay' && (
          <form onSubmit={handleSaveStay}>
            <div className="modal-body">
              {/* Live Active Stay Hero (if baby is currently at daycare) */}
              {isCurrentlyAtDaycare && !isEditing && (
                <div className="daycare-active-banner">
                  <div className="active-banner-pulse">
                    <span className="pulse-ring" />
                    <School size={18} />
                  </div>
                  <div className="active-banner-info">
                    <span className="active-banner-label">{t('daycareModal.activeStay')}</span>
                    <span className="active-banner-sub">
                      {isDutch ? 'Afgezet om ' : 'Dropped off at '}
                      {formatTime(activeTimers.daycare.dropOffMs || activeTimers.daycare.startMs, language, true)}
                      {activeTimers.daycare.daycareName ? ` (${activeTimers.daycare.daycareName})` : ''}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleDelete}
                      title={isDutch ? 'Timer annuleren' : 'Discard timer'}
                      style={{
                        fontSize: '0.8rem',
                        padding: '0.45rem 0.75rem',
                        color: 'var(--status-red)',
                        borderColor: 'rgba(239, 68, 68, 0.3)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      <Trash2 size={13} />
                      <span>{isDutch ? 'Annuleren' : 'Discard'}</span>
                    </button>
                    {!isFromActiveTimer && (
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={handlePickUpFromLiveTimer}
                        style={{
                          backgroundColor: 'var(--color-daycare)',
                          fontSize: '0.8rem',
                          padding: '0.45rem 0.85rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        <Car size={14} />
                        <span>{t('daycareModal.finishPickUp')}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Daycare Name */}
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Building size={14} />
                    <span>{t('daycareModal.daycareName')}</span>
                  </span>
                  {preferences?.daycareName && (!modalInitialData || daycareName === preferences.daycareName) && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-daycare)', fontWeight: 600 }}>
                      ✓ {t('daycareModal.autoFilledFromSettings')}
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={preferences?.daycareName || t('daycareModal.daycareNamePlaceholder')}
                  value={daycareName}
                  onChange={(e) => setDaycareName(e.target.value)}
                />
              </div>

              {/* Date */}
              <div className="form-group">
                <label className="form-label">{t('common.date')}</label>
                <input
                  type="date"
                  className="form-input"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  required
                />
              </div>

              {/* Drop-off & Pick-up Times Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span className="dot-indicator dropoff" />
                    <span>{t('daycareModal.dropOffTime')}</span>
                  </label>
                  <input
                    type="time"
                    className="form-input"
                    value={dropOffTime}
                    onChange={(e) => setDropOffTime(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span className="dot-indicator pickup" />
                    <span>{t('daycareModal.pickUpTime')}</span>
                  </label>
                  <input
                    type="time"
                    className="form-input"
                    value={pickUpTime}
                    onChange={(e) => setPickUpTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Calculated Duration Display */}
              {calculatedDurationMs > 0 && (
                <div className="daycare-duration-badge">
                  <Clock size={15} />
                  <span>
                    {t('daycareModal.duration')}: <strong>{formatDurationMs(calculatedDurationMs, language)}</strong>
                  </span>
                </div>
              )}

              {/* Caregivers Attribution */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <User size={13} />
                    <span>{t('daycareModal.dropOffCaregiver')}</span>
                  </label>
                  <select
                    className="form-select"
                    value={dropOffCaregiver}
                    onChange={(e) => setDropOffCaregiver(e.target.value)}
                  >
                    {caregivers.map((cg) => (
                      <option key={cg.id} value={cg.id}>
                        {cg.name} ({cg.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <User size={13} />
                    <span>{t('daycareModal.pickUpCaregiver')}</span>
                  </label>
                  <select
                    className="form-select"
                    value={pickUpCaregiver}
                    onChange={(e) => setPickUpCaregiver(e.target.value)}
                  >
                    {caregivers.map((cg) => (
                      <option key={cg.id} value={cg.id}>
                        {cg.name} ({cg.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Note */}
              <div className="form-group">
                <label className="form-label">{t('common.notes')}</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder={isDutch ? 'bv. Vrolijke dag, veel gespeeld...' : 'e.g. Great day, happy mood...'}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              {/* Individual Scheduling Shortcuts */}
              <div className="daycare-scheduling-shortcuts">
                <span className="scheduling-title">
                  <Bell size={13} />
                  <span>{isDutch ? 'Afzonderlijk inplannen met herinneringen' : 'Schedule Individually with Reminders'}</span>
                </span>
                <div className="scheduling-buttons-grid">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleOpenDropOffSchedule}
                    style={{ fontSize: '0.8rem', padding: '0.45rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem', justifyContent: 'center' }}
                  >
                    <Clock size={13} />
                    <span>{t('daycareModal.scheduleDropOff')}</span>
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleOpenPickUpSchedule}
                    style={{ fontSize: '0.8rem', padding: '0.45rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem', justifyContent: 'center' }}
                  >
                    <Car size={13} />
                    <span>{t('daycareModal.schedulePickUp')}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="modal-footer">
              {(isEditing || isFromActiveTimer || isCurrentlyAtDaycare) && (
                <button
                  type="button"
                  className="btn-danger"
                  onClick={handleDelete}
                >
                  <Trash2 size={16} />
                  <span>
                    {isCurrentlyAtDaycare || isFromActiveTimer
                      ? (isDutch ? 'Timer annuleren' : 'Discard timer')
                      : (isDutch ? 'Verwijderen' : 'Delete')}
                  </span>
                </button>
              )}

              {/* Start Live Drop-off button (if not editing and not currently running) */}
              {!isEditing && !isFromActiveTimer && !isCurrentlyAtDaycare && (
                <button
                  type="button"
                  className={isDropOffReminder ? 'btn-primary' : 'btn-secondary'}
                  style={isDropOffReminder ? { backgroundColor: 'var(--color-daycare)', flex: 1 } : {}}
                  onClick={handleStartLiveDropOff}
                  title={t('daycareModal.startDropOff')}
                >
                  <Play size={15} />
                  <span>{t('daycareModal.startDropOff')}</span>
                </button>
              )}

              <button
                type="submit"
                className={isDropOffReminder ? 'btn-secondary' : 'btn-primary'}
                style={!isDropOffReminder ? { backgroundColor: 'var(--color-daycare)', flex: 1 } : {}}
              >
                <Check size={16} />
                <span>
                  {isEditing
                    ? t('daycareModal.submitEdit')
                    : isDropOffReminder
                      ? (isDutch ? 'Volledige dag opslaan' : 'Log completed stay')
                      : isCurrentlyAtDaycare || isPickUpReminder
                        ? (isDutch ? 'Ophalen & timer afronden' : 'Pick up & stop timer')
                        : t('daycareModal.submitAdd')}
                </span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: Daycare Report & Gemini AI Extraction */}
        {activeTab === 'report' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <div className="modal-body">
              <DaycareReportUploader
                reportUrl={report?.url || null}
                reportType={report?.type || null}
                renderUrl={report?.renderUrl || null}
                onReportChange={(newReport) => setReport(newReport)}
                daycareName={(daycareName && daycareName.trim()) || preferences?.daycareName || ''}
                dateStr={dateStr}
                onExtractedCountChange={(cnt) => setExtractedCount(cnt)}
              />
            </div>

            <div className="modal-footer">
              {(isEditing || isFromActiveTimer || isCurrentlyAtDaycare) && (
                <button
                  type="button"
                  className="btn-danger"
                  onClick={handleDelete}
                >
                  <Trash2 size={16} />
                  <span>
                    {isCurrentlyAtDaycare || isFromActiveTimer
                      ? (isDutch ? 'Timer annuleren' : 'Discard timer')
                      : (isDutch ? 'Verwijderen' : 'Delete')}
                  </span>
                </button>
              )}

              <button
                type="button"
                className="btn-secondary"
                onClick={() => setActiveTab('stay')}
              >
                <span>← {t('daycareModal.tabStay')}</span>
              </button>

              <button
                type="button"
                className="btn-primary"
                onClick={handleSaveStay}
                style={{ backgroundColor: 'var(--color-daycare)' }}
              >
                <Check size={16} />
                <span>{isEditing ? t('daycareModal.submitEdit') : t('daycareModal.submitAdd')}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
