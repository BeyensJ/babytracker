import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { triggerHaptic } from '../utils/haptics';
import {
  Heart,
  Milk,
  Moon,
  Sparkles,
  Pipette,
  Apple,
  Ruler,
  Stethoscope,
  Clock,
  BookOpen,
  Plus,
  X,
} from 'lucide-react';

export function QuickActions() {
  const { openModal, preferences, t } = useApp();
  const [showMoreModal, setShowMoreModal] = useState(false);

  const primaryActions = [
    { id: 'BREAST', label: t('quickActions.breast'), icon: Heart, type: 'breast' },
    { id: 'BOTTLE', label: t('quickActions.bottle'), icon: Milk, type: 'bottle' },
    { id: 'SLEEP', label: t('quickActions.sleep'), icon: Moon, type: 'sleep' },
    { id: 'DIAPER', label: t('quickActions.diaper'), icon: Sparkles, type: 'diaper' },
  ];

  const moreActions = [
    { id: 'PUMP', label: t('quickActions.pumpLabel'), icon: Pipette, desc: t('quickActions.pumpDesc') },
    { id: 'SOLIDS', label: t('quickActions.solidsLabel'), icon: Apple, desc: t('quickActions.solidsDesc') },
    { id: 'GROWTH', label: t('quickActions.growthLabel'), icon: Ruler, desc: t('quickActions.growthDesc') },
    { id: 'HEALTH', label: t('quickActions.healthLabel'), icon: Stethoscope, desc: t('quickActions.healthDesc') },
    { id: 'ROUTINE', label: t('quickActions.routineLabel'), icon: Clock, desc: t('quickActions.routineDesc') },
    { id: 'NOTE', label: t('quickActions.noteLabel'), icon: BookOpen, desc: t('quickActions.noteDesc') },
  ];

  return (
    <div className="quick-actions-strip-wrap">
      <div className="quick-actions-header">
        <span className="quick-actions-title">{t('quickActions.moreTitle')}</span>
      </div>

      <div className="quick-actions-dock">
        {primaryActions.map((act) => {
          const Icon = act.icon;
          return (
            <button
              key={act.id}
              className={`dock-action-btn ${act.type}`}
              onClick={() => openModal(act.id)}
              id={`log-btn-${act.id.toLowerCase()}`}
            >
              <div className={`dock-icon-circle ${act.type}`}>
                <Icon size={22} />
              </div>
              <span className="dock-btn-label">{act.label}</span>
            </button>
          );
        })}

        {/* More Actions Button */}
        <button
          type="button"
          className="dock-action-btn more"
          onClick={() => {
            triggerHaptic('light', preferences?.haptics);
            setShowMoreModal(true);
          }}
          id="log-btn-more"
          aria-label={t('quickActions.moreTitle')}
        >
          <div className="dock-icon-circle more">
            <Plus size={22} />
          </div>
          <span className="dock-btn-label">{t('quickActions.more')}</span>
        </button>
      </div>

      {/* Clean Bottom Sheet / Popover for Additional Logging */}
      {showMoreModal && (
        <div
          className="modal-overlay"
          onClick={() => {
            triggerHaptic('light', preferences?.haptics);
            setShowMoreModal(false);
          }}
        >
          <div className="more-sheet-card" onClick={(e) => e.stopPropagation()}>
            <div className="more-sheet-header">
              <div className="more-sheet-title">{t('quickActions.moreTitle')}</div>
              <button
                type="button"
                className="more-sheet-close"
                onClick={() => {
                  triggerHaptic('light', preferences?.haptics);
                  setShowMoreModal(false);
                }}
                aria-label={t('common.close')}
              >
                <X size={20} />
              </button>
            </div>

            <div className="more-sheet-grid">
              {moreActions.map((act) => {
                const Icon = act.icon;
                return (
                  <button
                    key={act.id}
                    type="button"
                    className="more-sheet-item"
                    onClick={() => {
                      setShowMoreModal(false);
                      openModal(act.id);
                    }}
                    id={`log-more-${act.id.toLowerCase()}`}
                  >
                    <div className="more-sheet-icon">
                      <Icon size={20} />
                    </div>
                    <div className="more-sheet-text">
                      <div className="more-sheet-label">{act.label}</div>
                      <div className="more-sheet-desc">{act.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
