import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Bell,
  BellRing,
  CheckCircle2,
  Clock,
  Sparkles,
  X,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  RotateCcw,
  AlertTriangle,
  Milk,
  Pill,
  Moon,
  Apple,
  Heart,
  Droplet,
  FileText,
  ToggleLeft,
  ToggleRight,
  ChevronRight,
  Check,
  Play
} from 'lucide-react';
import {
  formatReminderOverdue,
  formatReminderSchedule,
  formatUpcomingTime,
  getCategorySummary,
  getPresetTemplates,
  RECURRENCE_TYPES
} from '../../utils/reminderUtils';
import { triggerHaptic } from '../../utils/haptics';

export function RemindersModal() {
  const {
    activeModal,
    modalInitialData,
    closeModal,
    reminders,
    dueReminders,
    upcomingReminders,
    addReminder,
    updateReminder,
    deleteReminder,
    completeReminder,
    snoozeReminder,
    toggleReminderEnabled,
    activeChild,
    activeChildId,
    preferences,
    language,
    t,
  } = useApp();

  const isDutch = language === 'nl';
  const childReminders = reminders.filter(r => !r.childKey || r.childKey === activeChildId);

  const initialTab = modalInitialData?.tab || (dueReminders.length > 0 ? 'due' : 'all');
  const [activeTab, setActiveTab] = useState(initialTab); // 'due' | 'upcoming' | 'all' | 'presets' | 'create'
  const [editingReminderId, setEditingReminderId] = useState(modalInitialData?.editId || null);

  // Form states
  const [formActivityType, setFormActivityType] = useState(() => {
    if (modalInitialData?.activityType) return modalInitialData.activityType;
    return 'HEALTH';
  });
  const [formTitle, setFormTitle] = useState(() => modalInitialData?.title || '');
  const [formRecurrence, setFormRecurrence] = useState(() => modalInitialData?.recurrence || RECURRENCE_TYPES.DAILY);
  const [formTime, setFormTime] = useState(() => {
    if (modalInitialData?.time) return modalInitialData.time;
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [formDate, setFormDate] = useState(() => {
    if (modalInitialData?.date) return modalInitialData.date;
    return new Date().toISOString().split('T')[0];
  });
  const [formIntervalHours, setFormIntervalHours] = useState(() => modalInitialData?.intervalHours || 3);
  const [formDayOfMonth, setFormDayOfMonth] = useState(() => modalInitialData?.dayOfMonth || 1);
  const [formRecurrenceDays, setFormRecurrenceDays] = useState(() => {
    if (Array.isArray(modalInitialData?.recurrenceDays)) return modalInitialData.recurrenceDays;
    return [1, 2, 3, 4, 5]; // Mon-Fri
  });
  const [formNote, setFormNote] = useState(() => modalInitialData?.note || '');

  // Pre-fill sub-details
  const [prefilledData, setPrefilledData] = useState(() => modalInitialData?.prefilledData || {});

  if (activeModal !== 'REMINDERS') return null;

  const getActivityIcon = (type) => {
    switch (type) {
      case 'BOTTLE': return <Milk size={16} />;
      case 'HEALTH': return <Pill size={16} />;
      case 'SLEEP': return <Moon size={16} />;
      case 'SOLIDS': return <Apple size={16} />;
      case 'ROUTINE': return <Clock size={16} />;
      case 'BREAST': return <Heart size={16} />;
      case 'PUMP': return <Droplet size={16} />;
      case 'DIAPER': return <Sparkles size={16} />;
      default: return <FileText size={16} />;
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

  const resetForm = () => {
    setEditingReminderId(null);
    setFormActivityType('HEALTH');
    setFormTitle('');
    setFormRecurrence(RECURRENCE_TYPES.DAILY);
    const now = new Date();
    setFormTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    setFormDate(now.toISOString().split('T')[0]);
    setFormIntervalHours(3);
    setFormDayOfMonth(1);
    setFormRecurrenceDays([1, 2, 3, 4, 5]);
    setFormNote('');
    setPrefilledData({});
  };

  const startEdit = (rem) => {
    setEditingReminderId(rem.id);
    setFormActivityType(rem.activityType || 'HEALTH');
    setFormTitle(rem.title || '');
    setFormRecurrence(rem.recurrence || RECURRENCE_TYPES.DAILY);
    setFormTime(rem.time || '08:00');
    setFormDate(rem.date || new Date().toISOString().split('T')[0]);
    setFormIntervalHours(rem.intervalHours || 3);
    setFormDayOfMonth(rem.dayOfMonth || 1);
    setFormRecurrenceDays(Array.isArray(rem.recurrenceDays) ? rem.recurrenceDays : [1, 2, 3, 4, 5]);
    setFormNote(rem.note || '');
    setPrefilledData(rem.prefilledData || {});
    setActiveTab('create');
  };

  const handleApplyPreset = (preset) => {
    setEditingReminderId(null);
    setFormActivityType(preset.activityType);
    setFormTitle(preset.title);
    setFormRecurrence(preset.recurrence);
    setFormTime(preset.time || '08:00');
    setFormIntervalHours(preset.intervalHours || 3);
    setFormRecurrenceDays(preset.recurrenceDays || [1, 2, 3, 4, 5]);
    setFormNote(preset.prefilledData?.note || '');
    setPrefilledData(preset.prefilledData || {});
    setActiveTab('create');
    triggerHaptic('light', preferences?.haptics);
  };

  const handleSaveForm = (e) => {
    e.preventDefault();

    const reminderPayload = {
      childKey: activeChildId,
      title: formTitle.trim(),
      activityType: formActivityType,
      prefilledData: {
        ...prefilledData,
        note: formNote.trim(),
      },
      recurrence: formRecurrence,
      recurrenceDays: formRecurrenceDays,
      intervalHours: Number(formIntervalHours) || 3,
      dayOfMonth: Number(formDayOfMonth) || 1,
      time: formTime,
      date: formDate,
      note: formNote.trim(),
    };

    if (editingReminderId) {
      updateReminder(editingReminderId, reminderPayload);
    } else {
      addReminder(reminderPayload);
    }

    resetForm();
    setActiveTab('all');
  };

  const toggleDaySelection = (dayIndex) => {
    setFormRecurrenceDays(prev => {
      const exists = prev.includes(dayIndex);
      if (exists) {
        if (prev.length <= 1) return prev; // Keep at least one day
        return prev.filter(d => d !== dayIndex).sort();
      } else {
        return [...prev, dayIndex].sort();
      }
    });
  };

  const weekdaysList = isDutch
    ? [{ id: 1, label: 'Ma' }, { id: 2, label: 'Di' }, { id: 3, label: 'Wo' }, { id: 4, label: 'Do' }, { id: 5, label: 'Vr' }, { id: 6, label: 'Za' }, { id: 0, label: 'Zo' }]
    : [{ id: 1, label: 'Mo' }, { id: 2, label: 'Tu' }, { id: 3, label: 'We' }, { id: 4, label: 'Th' }, { id: 5, label: 'Fr' }, { id: 6, label: 'Sa' }, { id: 0, label: 'Su' }];

  const presets = getPresetTemplates(language);

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div
        className="modal-card modal-reminders"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-icon-badge" style={{ backgroundColor: 'var(--color-caramel-light)', color: 'var(--color-caramel)' }}>
              <BellRing size={20} />
            </div>
            <div>
              <h2 className="modal-title">{t('reminders.title')}</h2>
              <p className="modal-subtitle">{t('reminders.subtitle')}</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={closeModal} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="reminders-tab-nav">
          <button
            className={`reminders-tab-btn ${activeTab === 'due' ? 'active' : ''}`}
            onClick={() => { setActiveTab('due'); setEditingReminderId(null); }}
          >
            <AlertTriangle size={15} />
            <span>{isDutch ? 'Te laat' : 'Due Now'}</span>
            {dueReminders.length > 0 && (
              <span className="reminders-tab-badge badge-due">{dueReminders.length}</span>
            )}
          </button>

          <button
            className={`reminders-tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
            onClick={() => { setActiveTab('upcoming'); setEditingReminderId(null); }}
          >
            <Clock size={15} />
            <span>{isDutch ? 'Binnenkort' : 'Upcoming'}</span>
            {upcomingReminders.length > 0 && (
              <span className="reminders-tab-badge">{upcomingReminders.length}</span>
            )}
          </button>

          <button
            className={`reminders-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => { setActiveTab('all'); setEditingReminderId(null); }}
          >
            <Calendar size={15} />
            <span>{isDutch ? 'Alle schema\'s' : 'All'}</span>
            <span className="reminders-tab-badge">{childReminders.length}</span>
          </button>

          <button
            className={`reminders-tab-btn ${activeTab === 'presets' ? 'active' : ''}`}
            onClick={() => { setActiveTab('presets'); setEditingReminderId(null); }}
          >
            <Sparkles size={15} />
            <span>{isDutch ? 'Sjablonen' : 'Presets'}</span>
          </button>

          <button
            className={`reminders-tab-btn tab-create ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => {
              if (activeTab !== 'create') resetForm();
              setActiveTab('create');
            }}
          >
            <Plus size={15} />
            <span>{editingReminderId ? (isDutch ? 'Bewerken' : 'Edit') : (isDutch ? 'Nieuw' : 'New')}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="reminders-modal-body">
          {/* TAB 1: DUE NOW */}
          {activeTab === 'due' && (
            <div className="reminders-tab-content">
              {dueReminders.length === 0 ? (
                <div className="reminders-empty-state">
                  <div className="empty-state-icon">
                    <CheckCircle2 size={40} color="var(--status-green)" />
                  </div>
                  <h3>{isDutch ? 'Geen openstaande herinneringen' : 'All caught up!'}</h3>
                  <p>{t('reminders.noDueReminders')}</p>
                  <button
                    className="btn-create-reminder-empty"
                    onClick={() => { resetForm(); setActiveTab('create'); }}
                  >
                    <Plus size={16} />
                    <span>{t('reminders.addReminder')}</span>
                  </button>
                </div>
              ) : (
                <div className="reminders-list-container">
                  {dueReminders.map(rem => {
                    const actColor = getActivityColor(rem.activityType);
                    const summary = getCategorySummary(rem.activityType, rem.prefilledData, language);
                    const overdueStr = formatReminderOverdue(rem.dueTime, language);

                    return (
                      <div
                        key={rem.id}
                        className="reminder-card-due"
                        style={{ borderLeftColor: actColor }}
                      >
                        <div className="reminder-card-main">
                          <div
                            className="reminder-icon-box"
                            style={{ backgroundColor: `color-mix(in srgb, ${actColor} 15%, transparent)`, color: actColor }}
                          >
                            {getActivityIcon(rem.activityType)}
                          </div>
                          <div className="reminder-card-text">
                            <div className="reminder-title-row">
                              <span className="reminder-title">{rem.title || summary}</span>
                              <span className="reminder-badge-overdue">
                                <AlertTriangle size={11} />
                                {overdueStr}
                              </span>
                            </div>
                            <div className="reminder-subtitle-row">
                              {summary && rem.title && <span className="reminder-details-tag">{summary}</span>}
                              <span>{formatReminderSchedule(rem, language)}</span>
                            </div>
                            {rem.note && <div className="reminder-note-snippet">"{rem.note}"</div>}
                          </div>
                        </div>

                        <div className="reminder-card-actions">
                          <button
                            className="btn-quick-log"
                            onClick={() => completeReminder(rem.id, true)}
                          >
                            <CheckCircle2 size={16} />
                            <span>{t('reminders.quickLogAndComplete')}</span>
                          </button>
                          <button
                            className="btn-edit-log"
                            onClick={() => startEdit(rem)}
                          >
                            <Edit2 size={14} />
                            <span>{isDutch ? 'Bewerken' : 'Edit'}</span>
                          </button>
                          <button
                            className="btn-snooze-quick"
                            onClick={() => snoozeReminder(rem.id, 30)}
                            title={t('reminders.snooze30m')}
                          >
                            <RotateCcw size={14} />
                            <span>+30m</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: UPCOMING */}
          {activeTab === 'upcoming' && (
            <div className="reminders-tab-content">
              {upcomingReminders.length === 0 ? (
                <div className="reminders-empty-state">
                  <div className="empty-state-icon">
                    <Clock size={40} color="var(--color-slate)" />
                  </div>
                  <h3>{isDutch ? 'Geen geplande herinneringen' : 'No upcoming schedules'}</h3>
                  <p>{isDutch ? 'Voeg een dagelijks of wekelijks schema toe om herinnerd te worden.' : 'Add a daily or weekly schedule to stay on top of routines.'}</p>
                  <button
                    className="btn-create-reminder-empty"
                    onClick={() => { resetForm(); setActiveTab('create'); }}
                  >
                    <Plus size={16} />
                    <span>{t('reminders.addReminder')}</span>
                  </button>
                </div>
              ) : (
                <div className="reminders-list-container">
                  {upcomingReminders.map(rem => {
                    const actColor = getActivityColor(rem.activityType);
                    const summary = getCategorySummary(rem.activityType, rem.prefilledData, language);
                    const upcomingStr = formatUpcomingTime(rem.dueTime, language);

                    return (
                      <div
                        key={rem.id}
                        className="reminder-card-upcoming"
                        style={{ borderLeftColor: actColor }}
                      >
                        <div className="reminder-card-main">
                          <div
                            className="reminder-icon-box"
                            style={{ backgroundColor: `color-mix(in srgb, ${actColor} 15%, transparent)`, color: actColor }}
                          >
                            {getActivityIcon(rem.activityType)}
                          </div>
                          <div className="reminder-card-text">
                            <div className="reminder-title-row">
                              <span className="reminder-title">{rem.title || summary}</span>
                              <span className="reminder-badge-upcoming">
                                <Clock size={11} />
                                {upcomingStr}
                              </span>
                            </div>
                            <div className="reminder-subtitle-row">
                              {summary && rem.title && <span className="reminder-details-tag">{summary}</span>}
                              <span>{formatReminderSchedule(rem, language)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="reminder-card-actions">
                          <button
                            className="btn-edit-log"
                            onClick={() => startEdit(rem)}
                          >
                            <Edit2 size={14} />
                            <span>{isDutch ? 'Bewerken' : 'Edit'}</span>
                          </button>
                          <button
                            className="btn-quick-log"
                            onClick={() => completeReminder(rem.id, true)}
                            title={isDutch ? 'Nu al loggen' : 'Log ahead of time'}
                          >
                            <Play size={14} />
                            <span>{isDutch ? 'Nu uitvoeren' : 'Run Now'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ALL SCHEDULES */}
          {activeTab === 'all' && (
            <div className="reminders-tab-content">
              <div className="reminders-toolbar-row">
                <span className="reminders-count-text">
                  {t('reminders.activeRemindersCount', { count: childReminders.length, plural: isDutch ? '' : (childReminders.length > 1 ? 's' : '') })}
                </span>
                <button
                  className="btn-add-schedule"
                  onClick={() => { resetForm(); setActiveTab('create'); }}
                >
                  <Plus size={15} />
                  <span>{t('reminders.addReminder')}</span>
                </button>
              </div>

              {childReminders.length === 0 ? (
                <div className="reminders-empty-state">
                  <div className="empty-state-icon">
                    <Calendar size={40} color="var(--color-terracotta)" />
                  </div>
                  <h3>{isDutch ? 'Nog geen herinneringen ingesteld' : 'No reminders configured yet'}</h3>
                  <p>{isDutch ? 'Stel vaste herinneringen in voor flesjes, medicatie, vitamines of routines.' : 'Set fixed reminders for bottles, vitamins, meds, or tummy time.'}</p>
                  <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.5rem' }}>
                    <button
                      className="btn-create-reminder-empty"
                      onClick={() => setActiveTab('presets')}
                    >
                      <Sparkles size={16} />
                      <span>{isDutch ? 'Kies uit sjablonen' : 'Pick a Preset'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="reminders-list-container">
                  {childReminders.map(rem => {
                    const actColor = getActivityColor(rem.activityType);
                    const summary = getCategorySummary(rem.activityType, rem.prefilledData, language);
                    const scheduleStr = formatReminderSchedule(rem, language);

                    return (
                      <div
                        key={rem.id}
                        className={`reminder-card-all ${rem.enabled ? '' : 'reminder-disabled'}`}
                        style={{ borderLeftColor: actColor }}
                      >
                        <div className="reminder-card-main">
                          <div
                            className="reminder-icon-box"
                            style={{ backgroundColor: `color-mix(in srgb, ${actColor} 15%, transparent)`, color: actColor }}
                          >
                            {getActivityIcon(rem.activityType)}
                          </div>
                          <div className="reminder-card-text">
                            <div className="reminder-title-row">
                              <span className="reminder-title">{rem.title || summary}</span>
                              <span className={`reminder-status-chip ${rem.enabled ? 'chip-active' : 'chip-paused'}`}>
                                {rem.enabled ? t('reminders.enabled') : t('reminders.disabled')}
                              </span>
                            </div>
                            <div className="reminder-subtitle-row">
                              {summary && rem.title && <span className="reminder-details-tag">{summary}</span>}
                              <span className="reminder-schedule-text">{scheduleStr}</span>
                            </div>
                            {rem.note && <div className="reminder-note-snippet">"{rem.note}"</div>}
                          </div>
                        </div>

                        <div className="reminder-row-controls">
                          {/* Enable/Disable switch */}
                          <button
                            className="btn-toggle-enabled"
                            onClick={() => toggleReminderEnabled(rem.id)}
                            title={rem.enabled ? t('reminders.disabled') : t('reminders.enabled')}
                          >
                            {rem.enabled ? (
                              <ToggleRight size={26} color="var(--status-green)" />
                            ) : (
                              <ToggleLeft size={26} color="var(--text-tertiary)" />
                            )}
                          </button>

                          <button
                            className="btn-icon-action"
                            onClick={() => startEdit(rem)}
                            title={t('reminders.editReminder')}
                          >
                            <Edit2 size={16} />
                          </button>

                          <button
                            className="btn-icon-action btn-danger-action"
                            onClick={() => {
                              if (window.confirm(t('reminders.deleteConfirm'))) {
                                deleteReminder(rem.id);
                              }
                            }}
                            title={isDutch ? 'Verwijderen' : 'Delete'}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PRESETS */}
          {activeTab === 'presets' && (
            <div className="reminders-tab-content">
              <div className="presets-grid">
                {presets.map(preset => {
                  const actColor = getActivityColor(preset.activityType);
                  return (
                    <div key={preset.id} className="preset-card">
                      <div className="preset-header">
                        <div
                          className="preset-icon-badge"
                          style={{ backgroundColor: `color-mix(in srgb, ${actColor} 15%, transparent)`, color: actColor }}
                        >
                          {getActivityIcon(preset.activityType)}
                        </div>
                        <div className="preset-info">
                          <h4 className="preset-title">{preset.title}</h4>
                          <span className="preset-schedule">
                            {formatReminderSchedule(preset, language)}
                          </span>
                        </div>
                      </div>

                      <p className="preset-note">
                        {preset.prefilledData?.note || getCategorySummary(preset.activityType, preset.prefilledData, language)}
                      </p>

                      <div className="preset-footer">
                        <button
                          className="btn-use-preset"
                          onClick={() => handleApplyPreset(preset)}
                        >
                          <Plus size={14} />
                          <span>{isDutch ? 'Sjabloon gebruiken' : 'Use Template'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: CREATE / EDIT FORM */}
          {activeTab === 'create' && (
            <form className="reminder-form" onSubmit={handleSaveForm}>
              <div className="form-section-title">
                {editingReminderId ? t('reminders.editReminder') : t('reminders.createReminder')}
              </div>

              {/* 1. Activity Type Selector */}
              <div className="form-group">
                <label className="form-label">{t('reminders.activityType')}</label>
                <div className="activity-type-picker">
                  {[
                    { id: 'HEALTH', label: isDutch ? '💊 Gezondheid & Vitamines' : '💊 Health & Vitamins' },
                    { id: 'BOTTLE', label: isDutch ? '🍼 Flesvoeding' : '🍼 Bottle' },
                    { id: 'ROUTINE', label: isDutch ? '🐢 Routine & Badje' : '🐢 Routine' },
                    { id: 'SOLIDS', label: isDutch ? '🥑 Vaste voeding' : '🥑 Solids' },
                    { id: 'BREAST', label: isDutch ? '🤱 Borstvoeding' : '🤱 Nursing' },
                    { id: 'PUMP', label: isDutch ? '🥛 Afkolven' : '🥛 Pump' },
                    { id: 'SLEEP', label: isDutch ? '💤 Slaap & Dutje' : '💤 Sleep' },
                    { id: 'DIAPER', label: isDutch ? '🧷 Luier' : '🧷 Diaper' },
                    { id: 'GROWTH', label: isDutch ? '📏 Groei meten' : '📏 Growth' },
                    { id: 'NOTE', label: isDutch ? '📝 Notitie' : '📝 Note' },
                  ].map(act => (
                    <button
                      key={act.id}
                      type="button"
                      className={`activity-choice-btn ${formActivityType === act.id ? 'selected' : ''}`}
                      onClick={() => setFormActivityType(act.id)}
                    >
                      {act.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Optional Title */}
              <div className="form-group">
                <label className="form-label">{t('reminders.reminderTitle')}</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={t('reminders.reminderTitlePlaceholder')}
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
              </div>

              {/* 3. Activity-Specific Pre-filled Options */}
              <div className="form-group prefill-options-box">
                <div className="prefill-header">
                  <span className="prefill-title">{t('reminders.prefillOptions')}</span>
                  <span className="prefill-help">{t('reminders.prefillHelp')}</span>
                </div>

                {/* Health Prefills */}
                {formActivityType === 'HEALTH' && (
                  <div className="prefill-fields-grid">
                    <div>
                      <label className="sub-label">{isDutch ? 'Medicijn / Vitamine naam' : 'Medicine / Vitamin Name'}</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder={isDutch ? 'bijv. Vitamine D (D-Cure), Perdolan' : 'e.g. Vitamin D Drops, Tylenol'}
                        value={prefilledData.medicineName || ''}
                        onChange={(e) => setPrefilledData(p => ({ ...p, medicineName: e.target.value, subType: 'MED' }))}
                      />
                    </div>
                    <div>
                      <label className="sub-label">{isDutch ? 'Dosering' : 'Dosage'}</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder={isDutch ? 'bijv. 5 druppels, 2.5 ml' : 'e.g. 5 drops, 2.5 ml'}
                        value={prefilledData.dosage || ''}
                        onChange={(e) => setPrefilledData(p => ({ ...p, dosage: e.target.value }))}
                      />
                    </div>
                  </div>
                )}

                {/* Bottle Prefills */}
                {formActivityType === 'BOTTLE' && (
                  <div className="prefill-fields-grid">
                    <div>
                      <label className="sub-label">{isDutch ? 'Hoeveelheid' : 'Volume'}</label>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                          type="number"
                          className="form-input"
                          placeholder={preferences?.volumeUnit === 'ml' ? '150' : '5'}
                          value={prefilledData.amount || ''}
                          onChange={(e) => setPrefilledData(p => ({ ...p, amount: e.target.value, unit: preferences?.volumeUnit || 'ml' }))}
                        />
                        <span style={{ alignSelf: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {preferences?.volumeUnit || 'ml'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="sub-label">{isDutch ? 'Type melk' : 'Milk Type'}</label>
                      <select
                        className="form-select"
                        value={prefilledData.milkType || 'FORMULA'}
                        onChange={(e) => setPrefilledData(p => ({ ...p, milkType: e.target.value }))}
                      >
                        <option value="FORMULA">{isDutch ? 'Flesvoeding / Poedermelk' : 'Formula'}</option>
                        <option value="BREAST_MILK">{isDutch ? 'Afgekolfde Moedermelk' : 'Pumped Breast Milk'}</option>
                      </select>
                    </div>
                    {prefilledData.milkType === 'FORMULA' && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label className="sub-label">{isDutch ? 'Merk poedermelk (optioneel)' : 'Formula Brand (optional)'}</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder={isDutch ? 'bijv. Nutrilon 1, Nan Pro...' : 'e.g. Enfamil, Similac...'}
                          value={prefilledData.formulaName || ''}
                          onChange={(e) => setPrefilledData(p => ({ ...p, formulaName: e.target.value }))}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Routine Prefills */}
                {formActivityType === 'ROUTINE' && (
                  <div className="prefill-fields-grid">
                    <div>
                      <label className="sub-label">{isDutch ? 'Routine activiteit' : 'Routine Activity'}</label>
                      <select
                        className="form-select"
                        value={prefilledData.routineName || 'TUMMYTIME'}
                        onChange={(e) => setPrefilledData(p => ({ ...p, routineName: e.target.value }))}
                      >
                        <option value="TUMMYTIME">🐢 {t('routineModal.tummyTime')}</option>
                        <option value="BATH">🛁 {t('routineModal.bath')}</option>
                        <option value="OUTDOOR">🌳 {t('routineModal.walk')}</option>
                        <option value="PLAY">🧸 {t('routineModal.play')}</option>
                        <option value="READ">📖 {t('routineModal.reading')}</option>
                        <option value="NAILTRIM">✂️ {t('routineModal.nailTrim')}</option>
                        <option value="MASSAGE">💆 {t('routineModal.massage')}</option>
                        <option value="SKINCARE">🧴 {t('routineModal.skincare')}</option>
                        <option value="TEETHING">🦷 {t('routineModal.teething')}</option>
                      </select>
                    </div>
                    <div>
                      <label className="sub-label">{isDutch ? 'Duur (minuten)' : 'Duration (minutes)'}</label>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="15"
                        value={prefilledData.durationMin || ''}
                        onChange={(e) => setPrefilledData(p => ({ ...p, durationMin: e.target.value }))}
                      />
                    </div>
                  </div>
                )}

                {/* Solids Prefills */}
                {formActivityType === 'SOLIDS' && (
                  <div className="prefill-fields-grid">
                    <div>
                      <label className="sub-label">{isDutch ? 'Voeding / Papje' : 'Food / Puree'}</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder={isDutch ? 'bijv. Wortelpapje, Banaan' : 'e.g. Sweet potato puree'}
                        value={prefilledData.food || ''}
                        onChange={(e) => setPrefilledData(p => ({ ...p, food: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="sub-label">{isDutch ? 'Maaltijd' : 'Meal'}</label>
                      <select
                        className="form-select"
                        value={prefilledData.mealType || 'Lunch'}
                        onChange={(e) => setPrefilledData(p => ({ ...p, mealType: e.target.value }))}
                      >
                        <option value="Breakfast">{isDutch ? 'Ontbijt' : 'Breakfast'}</option>
                        <option value="Lunch">{isDutch ? 'Groentepap / Lunch' : 'Lunch'}</option>
                        <option value="Snack">{isDutch ? 'Fruitpap / Vieruurtje' : 'Snack'}</option>
                        <option value="Dinner">{isDutch ? 'Avondmaal' : 'Dinner'}</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Diaper Prefills */}
                {formActivityType === 'DIAPER' && (
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={prefilledData.pee !== false}
                        onChange={(e) => setPrefilledData(p => ({ ...p, pee: e.target.checked }))}
                      />
                      <span>💧 {isDutch ? 'Plasluier' : 'Wet'}</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={Boolean(prefilledData.poop)}
                        onChange={(e) => setPrefilledData(p => ({ ...p, poop: e.target.checked }))}
                      />
                      <span>💩 {isDutch ? 'Stoelgang' : 'Dirty'}</span>
                    </label>
                  </div>
                )}

                {/* Breast Prefills */}
                {formActivityType === 'BREAST' && (
                  <div className="prefill-fields-grid">
                    <div>
                      <label className="sub-label">{isDutch ? 'Zijde' : 'Side'}</label>
                      <select
                        className="form-select"
                        value={prefilledData.side || 'BOTH'}
                        onChange={(e) => setPrefilledData(p => ({ ...p, side: e.target.value }))}
                      >
                        <option value="BOTH">{isDutch ? 'Beide kanten' : 'Both Sides'}</option>
                        <option value="LEFT">{isDutch ? 'Linkerborst' : 'Left Side'}</option>
                        <option value="RIGHT">{isDutch ? 'Rechterborst' : 'Right Side'}</option>
                      </select>
                    </div>
                    <div>
                      <label className="sub-label">{isDutch ? 'Verwachte duur (min)' : 'Duration (min)'}</label>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="15"
                        value={prefilledData.durationMinutes || ''}
                        onChange={(e) => setPrefilledData(p => ({ ...p, durationMinutes: e.target.value }))}
                      />
                    </div>
                  </div>
                )}

                {/* Pump Prefills */}
                {formActivityType === 'PUMP' && (
                  <div className="prefill-fields-grid">
                    <div>
                      <label className="sub-label">{isDutch ? 'Doelvolume' : 'Target Volume'}</label>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="120"
                        value={prefilledData.amount || ''}
                        onChange={(e) => setPrefilledData(p => ({ ...p, amount: e.target.value, unit: preferences?.volumeUnit || 'ml' }))}
                      />
                    </div>
                    <div>
                      <label className="sub-label">{isDutch ? 'Zijde' : 'Side'}</label>
                      <select
                        className="form-select"
                        value={prefilledData.side || 'BOTH'}
                        onChange={(e) => setPrefilledData(p => ({ ...p, side: e.target.value }))}
                      >
                        <option value="BOTH">{isDutch ? 'Dubbelzijdig' : 'Both Sides'}</option>
                        <option value="LEFT">{isDutch ? 'Enkelzijdig links' : 'Left Only'}</option>
                        <option value="RIGHT">{isDutch ? 'Enkelzijdig rechts' : 'Right Only'}</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Sleep Prefills */}
                {formActivityType === 'SLEEP' && (
                  <div>
                    <label className="sub-label">{isDutch ? 'Type slaap' : 'Sleep Type'}</label>
                    <select
                      className="form-select"
                      value={prefilledData.sleepType || 'NAP'}
                      onChange={(e) => setPrefilledData(p => ({ ...p, sleepType: e.target.value }))}
                    >
                      <option value="NAP">☀️ {isDutch ? 'Dutje overdag' : 'Daytime Nap'}</option>
                      <option value="NIGHT">🌙 {isDutch ? 'Nachtslaap' : 'Nighttime Sleep'}</option>
                    </select>
                  </div>
                )}
              </div>

              {/* 4. Recurrence Selector */}
              <div className="form-group">
                <label className="form-label">{t('reminders.recurrence')}</label>
                <div className="recurrence-type-grid">
                  <button
                    type="button"
                    className={`recurrence-btn ${formRecurrence === RECURRENCE_TYPES.DAILY ? 'selected' : ''}`}
                    onClick={() => setFormRecurrence(RECURRENCE_TYPES.DAILY)}
                  >
                    🔁 {t('reminders.recurrenceDaily')}
                  </button>

                  <button
                    type="button"
                    className={`recurrence-btn ${formRecurrence === RECURRENCE_TYPES.WEEKLY ? 'selected' : ''}`}
                    onClick={() => setFormRecurrence(RECURRENCE_TYPES.WEEKLY)}
                  >
                    📅 {t('reminders.recurrenceWeekly')}
                  </button>

                  <button
                    type="button"
                    className={`recurrence-btn ${formRecurrence === RECURRENCE_TYPES.MONTHLY ? 'selected' : ''}`}
                    onClick={() => setFormRecurrence(RECURRENCE_TYPES.MONTHLY)}
                  >
                    🗓️ {t('reminders.recurrenceMonthly')}
                  </button>

                  <button
                    type="button"
                    className={`recurrence-btn ${formRecurrence === RECURRENCE_TYPES.EVERY_X_HOURS ? 'selected' : ''}`}
                    onClick={() => setFormRecurrence(RECURRENCE_TYPES.EVERY_X_HOURS)}
                  >
                    ⏳ {t('reminders.recurrenceEveryXHours')}
                  </button>

                  <button
                    type="button"
                    className={`recurrence-btn ${formRecurrence === RECURRENCE_TYPES.ONCE ? 'selected' : ''}`}
                    onClick={() => setFormRecurrence(RECURRENCE_TYPES.ONCE)}
                  >
                    📌 {t('reminders.recurrenceOnce')}
                  </button>
                </div>
              </div>

              {/* Recurrence Specific Inputs */}
              {formRecurrence === RECURRENCE_TYPES.WEEKLY && (
                <div className="form-group">
                  <label className="form-label">{t('reminders.selectDaysOfWeek')}</label>
                  <div className="weekdays-selector">
                    {weekdaysList.map(d => {
                      const isSelected = formRecurrenceDays.includes(d.id);
                      return (
                        <button
                          key={d.id}
                          type="button"
                          className={`weekday-bubble ${isSelected ? 'selected' : ''}`}
                          onClick={() => toggleDaySelection(d.id)}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {formRecurrence === RECURRENCE_TYPES.MONTHLY && (
                <div className="form-group">
                  <label className="form-label">{t('reminders.dayOfMonth')}</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    className="form-input"
                    value={formDayOfMonth}
                    onChange={(e) => setFormDayOfMonth(Math.max(1, Math.min(31, Number(e.target.value) || 1)))}
                  />
                </div>
              )}

              {formRecurrence === RECURRENCE_TYPES.EVERY_X_HOURS && (
                <div className="form-group">
                  <label className="form-label">{t('reminders.intervalHours')}</label>
                  <div className="interval-buttons-row">
                    {[2, 3, 4, 6, 8].map(h => (
                      <button
                        key={h}
                        type="button"
                        className={`interval-btn ${formIntervalHours === h ? 'selected' : ''}`}
                        onClick={() => setFormIntervalHours(h)}
                      >
                        {h} {t('reminders.hours')}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {formRecurrence === RECURRENCE_TYPES.ONCE && (
                <div className="form-group">
                  <label className="form-label">{t('reminders.date')}</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                  />
                </div>
              )}

              {formRecurrence !== RECURRENCE_TYPES.EVERY_X_HOURS && (
                <div className="form-group">
                  <label className="form-label">{t('reminders.time')}</label>
                  <input
                    type="time"
                    className="form-input form-time-input"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                  />
                </div>
              )}

              {/* 5. Optional Note */}
              <div className="form-group">
                <label className="form-label">{isDutch ? 'Extra notitie / instructies' : 'Additional Notes / Instructions'}</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder={isDutch ? 'bijv. Geven na de ochtendvoeding' : 'e.g. Give after morning feeding'}
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                />
              </div>

              {/* Form Actions */}
              <div className="form-actions-row">
                <button
                  type="button"
                  className="btn-form-cancel"
                  onClick={() => { resetForm(); setActiveTab('all'); }}
                >
                  {isDutch ? 'Annuleren' : 'Cancel'}
                </button>
                <button type="submit" className="btn-form-save">
                  <Check size={16} />
                  <span>{editingReminderId ? t('reminders.saveReminder') : t('reminders.createReminder')}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
