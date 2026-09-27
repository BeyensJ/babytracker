import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Apple, X } from 'lucide-react';

export function SolidsModal() {
  const { activeModal, modalInitialData, closeModal, addEvent, updateEvent, t, language } = useApp();

  const isEditing = Boolean(modalInitialData && modalInitialData.id);

  const [food, setFood] = useState(() => modalInitialData?.details?.food || '');
  const [mealType, setMealType] = useState(() => modalInitialData?.details?.mealType || 'Breakfast');
  const [reaction, setReaction] = useState(() => modalInitialData?.details?.reaction || 'liked');
  const [note, setNote] = useState(modalInitialData?.note || '');
  const [timeStr, setTimeStr] = useState(() => {
    const d = new Date(modalInitialData?.beginDt || Date.now());
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  if (activeModal !== 'SOLIDS') return null;

  const mealTypes = language === 'nl' ? [
    { id: 'Breakfast', label: 'Ontbijt' },
    { id: 'Lunch', label: 'Groentepap / Lunch' },
    { id: 'Snack', label: 'Fruitpap / Vieruurtje' },
    { id: 'Dinner', label: 'Avondmaal' }
  ] : [
    { id: 'Breakfast', label: 'Breakfast' },
    { id: 'Lunch', label: 'Lunch' },
    { id: 'Snack', label: 'Snack' },
    { id: 'Dinner', label: 'Dinner' }
  ];

  const reactions = language === 'nl' ? [
    { id: 'loved', label: '😍 Vond het heerlijk' },
    { id: 'liked', label: '😊 Goed gegeten' },
    { id: 'neutral', label: '😐 Geproefd' },
    { id: 'disliked', label: '😣 Geweigerd' },
    { id: 'allergic', label: '⚠️ Reactie / Uitslag' },
  ] : [
    { id: 'loved', label: '😍 Loved it' },
    { id: 'liked', label: '😊 Liked' },
    { id: 'neutral', label: '😐 Neutral' },
    { id: 'disliked', label: '😣 Disliked' },
    { id: 'allergic', label: '⚠️ Reaction / Rash' },
  ];

  const commonFoods = language === 'nl' ? [
    'Groentepap (wortel/aardappel)',
    'Fruitpap (banaan/appel)',
    'Wortelpuree',
    'Pompoenpuree',
    'Avocadomoes',
    'Bananenpuree'
  ] : [
    'Avocado puree',
    'Banana mash',
    'Sweet potato',
    'Oatmeal cereal',
    'Steamed carrots',
    'Apple puree'
  ];

  const handleSave = (e) => {
    e.preventDefault();
    const [h, m] = timeStr.split(':').map(Number);
    const dateObj = new Date(modalInitialData?.beginDt || Date.now());
    dateObj.setHours(h, m, 0, 0);
    const beginDt = dateObj.getTime();

    const eventPayload = {
      type: 'SOLIDS',
      beginDt,
      endDt: null,
      durationMs: 0,
      details: {
        food: food.trim() || (language === 'nl' ? 'Vaste voeding' : 'Solid Food'),
        mealType,
        reaction,
      },
      note,
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
            <div className="modal-title-icon" style={{ backgroundColor: 'var(--color-terracotta-light)', color: 'var(--color-terracotta)' }}>
              <Apple size={18} />
            </div>
            <h2>{isEditing ? t('solidsModal.titleEdit') : t('solidsModal.titleAdd')}</h2>
          </div>
          <button onClick={closeModal} style={{ color: 'var(--text-tertiary)' }} aria-label={t('common.close')}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-body">
            {/* Meal Type */}
            <div className="form-group">
              <label className="form-label">{language === 'nl' ? 'Maaltijd' : 'Meal'}</label>
              <div className="segmented-control">
                {mealTypes.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    className={`segmented-btn ${mealType === m.id ? 'active' : ''}`}
                    onClick={() => setMealType(m.id)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Food Name */}
            <div className="form-group">
              <label className="form-label">{t('solidsModal.foodType')}</label>
              <input
                type="text"
                className="form-input"
                placeholder={language === 'nl' ? 'bv. Wortel-aardappelpapje met olijfolie' : 'e.g. Mashed avocado with breast milk'}
                value={food}
                onChange={e => setFood(e.target.value)}
                required
              />
            </div>

            {/* Quick Food Suggestions */}
            <div className="form-group">
              <div className="chip-grid">
                {commonFoods.slice(0, 4).map(f => (
                  <button
                    key={f}
                    type="button"
                    className={`chip-btn ${food === f ? 'selected' : ''}`}
                    onClick={() => setFood(f)}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Reaction */}
            <div className="form-group">
              <label className="form-label">{t('solidsModal.reaction')}</label>
              <div className="chip-grid">
                {reactions.map(r => (
                  <button
                    key={r.id}
                    type="button"
                    className={`chip-btn ${reaction === r.id ? 'selected' : ''}`}
                    onClick={() => setReaction(r.id)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Time & Notes */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '0.65rem' }}>
              <div className="form-group">
                <label className="form-label">{t('common.time')}</label>
                <input
                  type="time"
                  className="form-input"
                  value={timeStr}
                  onChange={e => setTimeStr(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('common.notes')}</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={language === 'nl' ? 'bv. 150g gelepeld...' : 'e.g. 2 tbsp, good appetite...'}
                  value={note}
                  onChange={e => setNote(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="submit" className="btn-primary" style={{ backgroundColor: 'var(--color-terracotta)' }}>
              {isEditing ? t('solidsModal.submitEdit') : t('solidsModal.submitAdd')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
