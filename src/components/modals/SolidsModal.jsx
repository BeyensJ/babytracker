import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Apple, X } from 'lucide-react';

export function SolidsModal() {
  const { activeModal, modalInitialData, closeModal, addEvent, updateEvent } = useApp();

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

  const reactions = [
    { id: 'loved', label: '😍 Loved it' },
    { id: 'liked', label: '😊 Liked' },
    { id: 'neutral', label: '😐 Neutral' },
    { id: 'disliked', label: '😣 Disliked' },
    { id: 'allergic', label: '⚠️ Reaction / Rash' },
  ];

  const commonFoods = ['Avocado puree', 'Banana mash', 'Sweet potato', 'Oatmeal cereal', 'Steamed carrots', 'Apple puree'];

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
        food: food.trim() || 'Solid Food',
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
            <h2>{isEditing ? 'Edit Solid Feed' : 'Log Solid Food'}</h2>
          </div>
          <button onClick={closeModal} style={{ color: 'var(--text-tertiary)' }} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-body">
            {/* Meal Type */}
            <div className="form-group">
              <label className="form-label">Meal</label>
              <div className="segmented-control">
                {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map(m => (
                  <button
                    key={m}
                    type="button"
                    className={`segmented-btn ${mealType === m ? 'active' : ''}`}
                    onClick={() => setMealType(m)}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Food Name */}
            <div className="form-group">
              <label className="form-label">Food</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Mashed avocado with breast milk"
                value={food}
                onChange={e => setFood(e.target.value)}
                required
              />
            </div>

            {/* Quick Food Suggestions */}
            <div className="form-group">
              <label className="form-label">Quick Suggestions</label>
              <div className="chip-grid">
                {commonFoods.map(f => (
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
              <label className="form-label">Baby's Reaction</label>
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

            {/* Time */}
            <div className="form-group">
              <label className="form-label">Time</label>
              <input
                type="time"
                className="form-input"
                value={timeStr}
                onChange={e => setTimeStr(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div className="form-group">
              <label className="form-label">Notes (optional)</label>
              <textarea
                className="form-textarea"
                rows="2"
                placeholder="Ate about 2 tablespoons, great interest..."
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {isEditing ? 'Save Changes' : 'Log Food'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
