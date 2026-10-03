import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  BellRing,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronRight,
  MoreVertical,
  RotateCcw,
  Edit2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Milk,
  Pill,
  Moon,
  Apple,
  Heart,
  Droplet,
  FileText,
  Plus
} from 'lucide-react';
import {
  formatReminderOverdue,
  formatReminderSchedule,
  getCategorySummary,
  RECURRENCE_TYPES
} from '../utils/reminderUtils';
import { triggerHaptic } from '../utils/haptics';

export function RemindersDueBanner() {
  const {
    dueReminders,
    completeReminder,
    snoozeReminder,
    openModal,
    activeChild,
    language,
    t,
    preferences,
  } = useApp();

  const [expanded, setExpanded] = useState(true);
  const [openSnoozeMenuId, setOpenSnoozeMenuId] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  if (!dueReminders || dueReminders.length === 0) {
    return null;
  }

  const isDutch = language === 'nl';
  const count = dueReminders.length;

  const getActivityIcon = (type) => {
    switch (type) {
      case 'BOTTLE': return <Milk size={18} />;
      case 'HEALTH': return <Pill size={18} />;
      case 'SLEEP': return <Moon size={18} />;
      case 'SOLIDS': return <Apple size={18} />;
      case 'ROUTINE': return <Clock size={18} />;
      case 'BREAST': return <Heart size={18} />;
      case 'PUMP': return <Droplet size={18} />;
      case 'DIAPER': return <Sparkles size={18} />;
      default: return <FileText size={18} />;
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'BOTTLE': return 'var(--color-bottle)';
      case 'HEALTH': return 'var(--color-health)';
      case 'SLEEP': return 'var(--color-sleep)';
      case 'SOLIDS': return 'var(--color-solids)';
      case 'ROUTINE': return 'var(--color-routine)';
      case 'BREAST': return 'var(--color-breast)';
      case 'PUMP': return 'var(--color-pump)';
      case 'DIAPER': return 'var(--color-diaper)';
      default: return 'var(--color-terracotta)';
    }
  };

  const handleQuickComplete = async (reminder) => {
    triggerHaptic('success', preferences?.haptics);
    setProcessingId(reminder.id);
    try {
      completeReminder(reminder.id, true);
    } finally {
      setTimeout(() => setProcessingId(null), 300);
    }
  };

  const handleEditAndLog = (reminder) => {
    // Open the specific modal with prefilled data and link to reminder
    const modalType = reminder.activityType || 'ROUTINE';
    const initialData = {
      ...(reminder.prefilledData || {}),
      sourceReminderId: reminder.id,
      note: reminder.prefilledData?.note || reminder.note || '',
    };
    openModal(modalType, initialData);
  };

  const handleSnooze = (reminderId, minutes) => {
    snoozeReminder(reminderId, minutes);
    setOpenSnoozeMenuId(null);
  };

  return (
    <div className="reminders-due-banner card-glass animate-slide-down" id="reminders-due-banner">
      {/* Header Bar */}
      <div className="reminders-banner-header" onClick={() => setExpanded(!expanded)}>
        <div className="reminders-header-left">
          <div className="reminders-bell-pulse">
            <BellRing size={20} className="reminders-bell-icon" />
            <span className="reminders-pulse-ring" />
          </div>
          <div className="reminders-header-text">
            <div className="reminders-banner-title">
              {t('reminders.dueBannerTitle', { count, plural: isDutch ? (count > 1 ? 'en' : '') : (count > 1 ? 's' : '') })}
            </div>
            <div className="reminders-banner-subtitle">
              {t('reminders.dueBannerSubtitle', { name: activeChild?.name || 'Baby' })}
            </div>
          </div>
        </div>

        <div className="reminders-header-right" onClick={(e) => e.stopPropagation()}>
          <button
            className="btn-reminders-manage"
            onClick={() => openModal('REMINDERS')}
            title={t('reminders.manageReminders')}
          >
            <span>{isDutch ? 'Beheer' : 'Manage'}</span>
            <ChevronRight size={14} />
          </button>

          <button
            className="btn-reminders-toggle"
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {/* Expanded List of Due Reminders */}
      {expanded && (
        <div className="reminders-due-list">
          {dueReminders.map((reminder) => {
            const actColor = getActivityColor(reminder.activityType);
            const summary = getCategorySummary(reminder.activityType, reminder.prefilledData, language);
            const overdueStr = formatReminderOverdue(reminder.dueTime, language);
            const scheduleStr = formatReminderSchedule(reminder, language);
            const isProcessing = processingId === reminder.id;
            const isSnoozeOpen = openSnoozeMenuId === reminder.id;

            return (
              <div
                key={reminder.id}
                className={`reminder-due-item ${isProcessing ? 'reminder-item-processing' : ''}`}
                style={{ borderLeftColor: actColor }}
              >
                <div className="reminder-item-body">
                  <div className="reminder-item-main">
                    <div
                      className="reminder-icon-box"
                      style={{ backgroundColor: `color-mix(in srgb, ${actColor} 15%, transparent)`, color: actColor }}
                    >
                      {getActivityIcon(reminder.activityType)}
                    </div>

                    <div className="reminder-info">
                      <div className="reminder-title-row">
                        <span className="reminder-title">{reminder.title || summary}</span>
                        <span className="reminder-badge-overdue">
                          <AlertTriangle size={11} />
                          {overdueStr}
                        </span>
                      </div>

                      <div className="reminder-summary-row">
                        {summary && reminder.title && (
                          <span className="reminder-details-tag">{summary}</span>
                        )}
                        <span className="reminder-schedule-text">{scheduleStr}</span>
                      </div>

                      {reminder.note && (
                        <div className="reminder-note-snippet">"{reminder.note}"</div>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="reminder-actions-row">
                    <button
                      className="btn-quick-log"
                      onClick={() => handleQuickComplete(reminder)}
                      disabled={isProcessing}
                      title={t('reminders.quickLogDesc')}
                    >
                      <CheckCircle2 size={16} />
                      <span>{t('reminders.quickLogAndComplete')}</span>
                    </button>

                    <button
                      className="btn-edit-log"
                      onClick={() => handleEditAndLog(reminder)}
                      title={t('reminders.editAndLog')}
                    >
                      <Edit2 size={14} />
                      <span>{isDutch ? 'Aanpassen' : 'Review'}</span>
                    </button>

                    {/* Snooze Popover Menu */}
                    <div className="reminder-snooze-container">
                      <button
                        className={`btn-reminder-snooze ${isSnoozeOpen ? 'active' : ''}`}
                        onClick={() => setOpenSnoozeMenuId(isSnoozeOpen ? null : reminder.id)}
                        title={t('reminders.snooze')}
                      >
                        <RotateCcw size={14} />
                        <span>{t('reminders.snooze')}</span>
                        <ChevronDown size={12} />
                      </button>

                      {isSnoozeOpen && (
                        <>
                          <div
                            className="reminders-backdrop"
                            onClick={() => setOpenSnoozeMenuId(null)}
                          />
                          <div className="snooze-dropdown-menu">
                            <div className="snooze-dropdown-title">
                              {isDutch ? 'Herinner me over...' : 'Remind me in...'}
                            </div>
                            <button onClick={() => handleSnooze(reminder.id, 15)}>
                              ⏱️ {t('reminders.snooze15m')}
                            </button>
                            <button onClick={() => handleSnooze(reminder.id, 30)}>
                              ⏱️ {t('reminders.snooze30m')}
                            </button>
                            <button onClick={() => handleSnooze(reminder.id, 60)}>
                              ⏱️ {t('reminders.snooze1h')}
                            </button>
                            <button onClick={() => handleSnooze(reminder.id, 120)}>
                              ⏱️ {t('reminders.snooze2h')}
                            </button>
                            <button onClick={() => handleSnooze(reminder.id, 24 * 60)}>
                              🌅 {t('reminders.snoozeTomorrow')}
                            </button>
                            <div className="snooze-divider" />
                            <button
                              className="snooze-complete-only"
                              onClick={() => {
                                completeReminder(reminder.id, false);
                                setOpenSnoozeMenuId(null);
                              }}
                            >
                              ✓ {t('reminders.markCompleteOnly')}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
