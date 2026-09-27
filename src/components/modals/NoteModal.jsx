import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { BookOpen, X, Award } from 'lucide-react';
import confetti from 'canvas-confetti';

export function NoteModal() {
  const { activeModal, modalInitialData, closeModal, addEvent, updateEvent, t, language } = useApp();

  const isEditing = Boolean(modalInitialData && modalInitialData.id);

  const [isMilestone, setIsMilestone] = useState(() => {
    return modalInitialData?.type === 'MILESTONE' || Boolean(modalInitialData?.details?.milestoneName);
  });
  const [milestoneName, setMilestoneName] = useState(() => modalInitialData?.details?.milestoneName || '');
  const [note, setNote] = useState(() => modalInitialData?.note || '');
  const [timeStr, setTimeStr] = useState(() => {
    const d = new Date(modalInitialData?.beginDt || Date.now());
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  if (activeModal !== 'NOTE' && activeModal !== 'MILESTONE') return null;

  const milestoneSuggestions = language === 'nl' ? [
    'Eerste echte glimlach 😊',
    'Omgerold van buik naar rug 🤸',
    'Eerste schaterlachje 😂',
    'Volgt voorwerpen met de oogjes 👀',
    'Houdt hoofdje mooi stabiel omhoog 👶',
    'Grijpt doelbewust naar speelgoed 🧸',
  ] : [
    'First Real Social Smile 😊',
    'Rolled Over Belly to Back 🤸',
    'First Chuckle / Laugh 😂',
    'Tracking Objects With Eyes 👀',
    'Holding Head High Steady 👶',
    'Reaching For Toys 🧸',
  ];

  const handleSave = (e) => {
    e.preventDefault();
    const [h, m] = timeStr.split(':').map(Number);
    const dateObj = new Date(modalInitialData?.beginDt || Date.now());
    dateObj.setHours(h, m, 0, 0);
    const beginDt = dateObj.getTime();

    if (isMilestone && !isEditing) {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch {}
    }

    const eventPayload = {
      type: isMilestone ? 'MILESTONE' : 'NOTE',
      beginDt,
      endDt: null,
      durationMs: 0,
      details: {
        milestoneName: isMilestone ? (milestoneName.trim() || (language === 'nl' ? 'Mijlpaal in ontwikkeling' : 'Developmental Milestone')) : '',
      },
      note: note.trim(),
    };

    if (isEditing) {
      updateEvent(modalInitialData.id, eventPayload);
    } else {
      addEvent(eventPayload);
    }

    closeModal();
  };

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-title-icon" style={{ backgroundColor: 'var(--bg-card-subtle)', color: 'var(--text-secondary)' }}>
              {isMilestone ? <Award size={18} color="var(--color-terracotta)" /> : <BookOpen size={18} />}
            </div>
            <h2>{isEditing ? (language === 'nl' ? 'Notitie bewerken' : 'Edit Entry') : isMilestone ? (language === 'nl' ? 'Mijlpaal vieren 🎉' : 'Celebrate Milestone') : (language === 'nl' ? 'Notitie opslaan' : 'Journal Note')}</h2>
          </div>
          <button onClick={closeModal} style={{ color: 'var(--text-tertiary)' }} aria-label={t('common.close')}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-body">
            {/* Milestone Toggle */}
            <div style={{ backgroundColor: 'var(--bg-card-subtle)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Award size={18} color="var(--color-terracotta)" />
                <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{language === 'nl' ? 'Aanduiden als ontwikkelingsmijlpaal' : 'Mark as Developmental Milestone'}</span>
              </div>
              <input
                type="checkbox"
                checked={isMilestone}
                onChange={e => setIsMilestone(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: 'var(--color-terracotta)' }}
              />
            </div>

            {/* Milestone Name & Suggestions */}
            {isMilestone && (
              <>
                <div className="form-group">
                  <label className="form-label">{language === 'nl' ? 'Titel van de mijlpaal' : 'Milestone Title'}</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={language === 'nl' ? 'bv. Eerste keer omgerold, eerste schaterlach...' : 'e.g. First time rolling over, first giggle'}
                    value={milestoneName}
                    onChange={e => setMilestoneName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{language === 'nl' ? 'Ideeën voor mijlpalen' : 'Milestone Ideas'}</label>
                  <div className="chip-grid">
                    {milestoneSuggestions.map(s => (
                      <button
                        key={s}
                        type="button"
                        className={`chip-btn ${milestoneName === s ? 'selected' : ''}`}
                        onClick={() => setMilestoneName(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Note text */}
            <div className="form-group">
              <label className="form-label">{isMilestone ? (language === 'nl' ? 'Herinnering & details' : 'Memory & Details') : (language === 'nl' ? 'Notitie / Dagboekbericht' : 'Journal Entry')}</label>
              <textarea
                className="form-textarea"
                rows="4"
                placeholder={language === 'nl' ? 'Schrijf een mooie herinnering, observatie of gedachte neer...' : 'Write a heartwarming memory, symptom observation, or parenting thought...'}
                value={note}
                onChange={e => setNote(e.target.value)}
                required={!isMilestone}
              />
            </div>

            {/* Time */}
            <div className="form-group">
              <label className="form-label">{t('common.time')}</label>
              <input
                type="time"
                className="form-input"
                value={timeStr}
                onChange={e => setTimeStr(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="submit" className="btn-primary">
              {isEditing ? t('common.save') : isMilestone ? (language === 'nl' ? 'Mijlpaal opslaan' : 'Save Milestone') : t('noteModal.submitAdd')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
