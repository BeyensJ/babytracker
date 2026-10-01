import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { triggerHaptic } from '../utils/haptics';
import {
  Heart,
  Milk,
  Moon,
  Sparkles,
  Apple,
  Ruler,
  Stethoscope,
  Clock,
  BookOpen,
  Award,
  Plus,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import { PumpIcon } from './icons/PumpIcon';

export function QuickActions() {
  const { openModal, preferences, language, t } = useApp();
  const [showMoreModal, setShowMoreModal] = useState(false);
  const isDutch = language === 'nl';

  // Master catalog of all loggable categories
  const ALL_ACTIONS = [
    {
      id: 'BREAST',
      label: t('quickActions.breast') || (isDutch ? 'Borst' : 'Nursing'),
      icon: Heart,
      type: 'breast',
      desc: isDutch ? 'Linker- en rechterborst timer' : 'Left and right breast timer',
    },
    {
      id: 'BOTTLE',
      label: t('quickActions.bottle') || (isDutch ? 'Flesje' : 'Bottle'),
      icon: Milk,
      type: 'bottle',
      desc: isDutch ? 'Afgekolfde melk of kunstvoeding' : 'Expressed milk or formula',
    },
    {
      id: 'SLEEP',
      label: t('quickActions.sleep') || (isDutch ? 'Slaap' : 'Sleep'),
      icon: Moon,
      type: 'sleep',
      desc: isDutch ? 'Dutjes en nachtslaap timer' : 'Naps and night sleep timer',
    },
    {
      id: 'PUMP',
      label: t('quickActions.pump') || (isDutch ? 'Afkolven' : 'Pump'),
      icon: PumpIcon,
      type: 'pump',
      desc: isDutch ? 'Moedermelk afkolven & opbrengst' : 'Express milk & log volume',
    },
    {
      id: 'DIAPER',
      label: t('quickActions.diaperLabel') || (isDutch ? 'Pamper' : 'Diaper'),
      icon: Sparkles,
      type: 'diaper',
      desc: isDutch ? 'Nat, kaka en verzorging' : 'Wet, dirty and care',
    },
    {
      id: 'SOLIDS',
      label: t('quickActions.solidsLabel') || (isDutch ? 'Vaste voeding' : 'Solids'),
      icon: Apple,
      type: 'solids',
      desc: isDutch ? 'Hapjes, fruit en maaltijden' : 'Baby food, purees and meals',
    },
    {
      id: 'GROWTH',
      label: t('quickActions.growthLabel') || (isDutch ? 'Groei' : 'Growth'),
      icon: Ruler,
      type: 'growth',
      desc: isDutch ? 'Gewicht, lengte en hoofdomtrek' : 'Weight, length and head size',
    },
    {
      id: 'HEALTH',
      label: t('quickActions.healthLabel') || (isDutch ? 'Gezondheid' : 'Health'),
      icon: Stethoscope,
      type: 'health',
      desc: isDutch ? 'Temperatuur, medicijnen en dokter' : 'Temperature, meds and doctor',
    },
    {
      id: 'ROUTINE',
      label: t('quickActions.routineLabel') || (isDutch ? 'Routine' : 'Routine'),
      icon: Clock,
      type: 'routine',
      desc: isDutch ? 'Buiktijd, badje en wandelen' : 'Tummy time, bath and walks',
    },
    {
      id: 'NOTE',
      label: t('quickActions.noteLabel') || (isDutch ? 'Notitie' : 'Note'),
      icon: BookOpen,
      type: 'note',
      desc: isDutch ? 'Dagboeknotities en herinneringen' : 'Journal notes and observations',
    },
    {
      id: 'MILESTONE',
      label: isDutch ? 'Mijlpaal' : 'Milestone',
      icon: Award,
      type: 'milestone',
      desc: isDutch ? 'Eerste keren en ontwikkelingen 🎉' : 'Baby firsts and milestone moments 🎉',
    },
  ];

  // User-configured primary dock actions
  const selectedActionIds = preferences?.quickActionButtons && preferences.quickActionButtons.length > 0
    ? preferences.quickActionButtons
    : ['BREAST', 'BOTTLE', 'SLEEP', 'PUMP'];

  const primaryActions = selectedActionIds
    .map((id) => ALL_ACTIONS.find((a) => a.id === id))
    .filter(Boolean);

  // Remaining actions that appear under "+ More"
  const moreActions = ALL_ACTIONS.filter((a) => !selectedActionIds.includes(a.id));

  const handleOpenCustomize = (e) => {
    e.stopPropagation();
    triggerHaptic('light', preferences?.haptics);
    setShowMoreModal(false);
    openModal('CUSTOMIZE_QUICK', { tab: 'actions' });
  };

  return (
    <div className="quick-actions-strip-wrap">
      <div className="quick-actions-header">
        <span className="quick-actions-title">{t('quickActions.moreTitle')}</span>
        <button
          type="button"
          className="quick-actions-customize-btn"
          onClick={handleOpenCustomize}
          title={isDutch ? 'Snelle acties aanpassen' : 'Customize quick action dock'}
          aria-label={isDutch ? 'Snelle acties aanpassen' : 'Customize quick action dock'}
        >
          <SlidersHorizontal size={13} />
          <span>{isDutch ? 'Aanpassen' : 'Customize'}</span>
        </button>
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

        {/* More Actions Button (shown if there are remaining actions or to customize) */}
        {moreActions.length > 0 && (
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
        )}
      </div>

      {/* Bottom Sheet / Popover for Additional Logging */}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div className="more-sheet-title">{t('quickActions.moreTitle')}</div>
                <button
                  type="button"
                  className="more-sheet-edit-pill"
                  onClick={handleOpenCustomize}
                >
                  <SlidersHorizontal size={12} />
                  <span>{isDutch ? 'Knoppen kiezen' : 'Edit dock'}</span>
                </button>
              </div>
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
