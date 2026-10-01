import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { triggerHaptic } from '../../utils/haptics';
import {
  SlidersHorizontal,
  X,
  Check,
  RotateCcw,
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
  Utensils,
  Layers,
  ArrowUp,
  ArrowDown,
  LayoutGrid,
} from 'lucide-react';
import { PumpIcon } from '../icons/PumpIcon';

export function CustomizeQuickModal() {
  const {
    activeModal,
    modalInitialData,
    closeModal,
    preferences,
    setPreferences,
    language,
    t,
  } = useApp();

  const isDutch = language === 'nl';

  // Initial tab: 'status' or 'actions'
  const [activeTab, setActiveTab] = useState(() => {
    return modalInitialData?.tab === 'actions' ? 'actions' : 'status';
  });

  // Category Catalog with icons, labels, and descriptions
  const CATEGORY_CATALOG = [
    {
      id: 'FEEDS',
      label: isDutch ? 'Laatste Voeding (Alles)' : 'Latest Feed (All)',
      desc: isDutch ? 'Combineert borst, fles en vaste hapjes' : 'Combines breast, bottle and solids',
      icon: Utensils,
      color: 'var(--color-terracotta)',
      bg: 'var(--color-terracotta-light)',
      statusOnly: true,
    },
    {
      id: 'BREAST',
      label: isDutch ? 'Borstvoeding' : 'Nursing',
      desc: isDutch ? 'Sessieduur, linker-/rechterborst' : 'Duration, left/right breast',
      icon: Heart,
      color: 'var(--color-terracotta)',
      bg: 'var(--color-terracotta-light)',
    },
    {
      id: 'BOTTLE',
      label: isDutch ? 'Flesvoeding' : 'Bottle Feed',
      desc: isDutch ? 'Volume in ml/oz, soort melk' : 'Volume in ml/oz, milk type',
      icon: Milk,
      color: 'var(--color-caramel)',
      bg: 'var(--color-caramel-light)',
    },
    {
      id: 'SLEEP',
      label: isDutch ? 'Slaap' : 'Sleep',
      desc: isDutch ? 'Wakkertijd, dutjes en nachtslaap' : 'Wake windows, naps and night sleep',
      icon: Moon,
      color: 'var(--color-slate)',
      bg: 'var(--color-slate-light)',
    },
    {
      id: 'DIAPER',
      label: isDutch ? 'Pampers' : 'Diapers',
      desc: isDutch ? 'Plaspampers, stoelgang en verzorging' : 'Wet, dirty, stool details',
      icon: Sparkles,
      color: 'var(--color-caramel)',
      bg: 'var(--color-caramel-light)',
    },
    {
      id: 'PUMP',
      label: isDutch ? 'Afkolven' : 'Pumping',
      desc: isDutch ? 'Opbrengst per borst en kolfduur' : 'Output per side and duration',
      icon: PumpIcon,
      color: 'var(--color-berry)',
      bg: 'var(--color-berry-light)',
    },
    {
      id: 'SOLIDS',
      label: isDutch ? 'Vaste voeding' : 'Solids & Purees',
      desc: isDutch ? 'Hapjes, groenten/fruit en reacties' : 'Meals, baby foods and reactions',
      icon: Apple,
      color: 'var(--color-sage)',
      bg: 'var(--color-sage-light)',
    },
    {
      id: 'GROWTH',
      label: isDutch ? 'Groei & Metingen' : 'Growth & Length',
      desc: isDutch ? 'Gewicht, lengte en hoofdomtrek' : 'Weight, height and head circumference',
      icon: Ruler,
      color: 'var(--color-sage)',
      bg: 'var(--color-sage-light)',
    },
    {
      id: 'HEALTH',
      label: isDutch ? 'Gezondheid & Medicatie' : 'Health & Meds',
      desc: isDutch ? 'Koorts, medicijnen en doktersbezoek' : 'Temperature, meds and doctor visits',
      icon: Stethoscope,
      color: 'var(--status-red)',
      bg: 'var(--status-red-light)',
    },
    {
      id: 'ROUTINE',
      label: isDutch ? 'Routine & Spelen' : 'Routine & Play',
      desc: isDutch ? 'Buiktijd, badje, massage, wandelen' : 'Tummy time, bath, play, walks',
      icon: Clock,
      color: 'var(--color-slate)',
      bg: 'var(--color-slate-light)',
    },
    {
      id: 'NOTE',
      label: isDutch ? 'Dagboeknotities' : 'Journal Notes',
      desc: isDutch ? 'Vrije observaties en herinneringen' : 'Freeform observations and diary',
      icon: BookOpen,
      color: 'var(--color-terracotta)',
      bg: 'var(--color-terracotta-light)',
    },
    {
      id: 'MILESTONE',
      label: isDutch ? 'Mijlpalen' : 'Milestones & Firsts',
      desc: isDutch ? 'Eerste lachje, omrollen, eerste tandje' : 'First smile, rolling, first teeth',
      icon: Award,
      color: 'var(--color-mustard)',
      bg: 'var(--color-mustard-light)',
    },
  ];

  // Local state for editing
  const [selectedStatusCards, setSelectedStatusCards] = useState(() => {
    return preferences?.quickStatusCards || ['FEEDS', 'SLEEP', 'PUMP'];
  });

  const [selectedActionButtons, setSelectedActionButtons] = useState(() => {
    return preferences?.quickActionButtons || ['BREAST', 'BOTTLE', 'SLEEP', 'PUMP'];
  });

  if (activeModal !== 'CUSTOMIZE_QUICK') return null;

  // Toggle category for status cards
  const toggleStatusCard = (id) => {
    triggerHaptic('light', preferences?.haptics);
    setSelectedStatusCards((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 1) {
          alert(isDutch ? 'Kies minstens 1 statuskaart.' : 'Please select at least 1 status card.');
          return prev;
        }
        return prev.filter((item) => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Move status card up / down
  const moveStatusCard = (id, direction) => {
    triggerHaptic('light', preferences?.haptics);
    setSelectedStatusCards((prev) => {
      const idx = prev.indexOf(id);
      if (idx === -1) return prev;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const copy = [...prev];
      const [removed] = copy.splice(idx, 1);
      copy.splice(targetIdx, 0, removed);
      return copy;
    });
  };

  // Toggle category for action buttons
  const toggleActionButton = (id) => {
    triggerHaptic('light', preferences?.haptics);
    setSelectedActionButtons((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 1) {
          alert(isDutch ? 'Kies minstens 1 actieknop.' : 'Please select at least 1 action button.');
          return prev;
        }
        return prev.filter((item) => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Move action button left / right (up / down)
  const moveActionButton = (id, direction) => {
    triggerHaptic('light', preferences?.haptics);
    setSelectedActionButtons((prev) => {
      const idx = prev.indexOf(id);
      if (idx === -1) return prev;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const copy = [...prev];
      const [removed] = copy.splice(idx, 1);
      copy.splice(targetIdx, 0, removed);
      return copy;
    });
  };

  // Reset to defaults
  const handleResetDefaults = () => {
    triggerHaptic('medium', preferences?.haptics);
    if (activeTab === 'status') {
      setSelectedStatusCards(['FEEDS', 'SLEEP', 'PUMP']);
    } else {
      setSelectedActionButtons(['BREAST', 'BOTTLE', 'SLEEP', 'PUMP']);
    }
  };

  // Select all
  const handleSelectAll = () => {
    triggerHaptic('light', preferences?.haptics);
    if (activeTab === 'status') {
      setSelectedStatusCards(CATEGORY_CATALOG.map((c) => c.id));
    } else {
      setSelectedActionButtons(CATEGORY_CATALOG.filter((c) => !c.statusOnly).map((c) => c.id));
    }
  };

  // Save changes to preferences
  const handleSave = () => {
    triggerHaptic('success', preferences?.haptics);
    setPreferences((prev) => ({
      ...prev,
      quickStatusCards: selectedStatusCards,
      quickActionButtons: selectedActionButtons,
    }));
    closeModal();
  };

  const actionCategories = CATEGORY_CATALOG.filter((c) => !c.statusOnly);

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="customize-quick-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="customize-quick-header">
          <div className="customize-quick-title-wrap">
            <div className="customize-quick-icon-circle">
              <SlidersHorizontal size={20} />
            </div>
            <div>
              <h2 className="customize-quick-title">{t('customizeQuick.title')}</h2>
              <span className="customize-quick-subtitle">
                {activeTab === 'status'
                  ? t('customizeQuick.statusCardsCount', { count: selectedStatusCards.length })
                  : t('customizeQuick.actionsCount', { count: selectedActionButtons.length })}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="customize-quick-close"
            onClick={closeModal}
            aria-label={t('common.close')}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="customize-quick-tabs">
          <button
            type="button"
            className={`customize-tab-btn ${activeTab === 'status' ? 'active' : ''}`}
            onClick={() => {
              triggerHaptic('light', preferences?.haptics);
              setActiveTab('status');
            }}
          >
            <LayoutGrid size={15} />
            <span>{t('customizeQuick.tabStatus')}</span>
          </button>
          <button
            type="button"
            className={`customize-tab-btn ${activeTab === 'actions' ? 'active' : ''}`}
            onClick={() => {
              triggerHaptic('light', preferences?.haptics);
              setActiveTab('actions');
            }}
          >
            <Layers size={15} />
            <span>{t('customizeQuick.tabActions')}</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="customize-quick-body">
          <p className="customize-quick-desc">
            {activeTab === 'status' ? t('customizeQuick.statusDesc') : t('customizeQuick.actionsDesc')}
          </p>

          {/* Quick presets toolbar */}
          <div className="customize-quick-toolbar">
            <button
              type="button"
              className="customize-toolbar-btn"
              onClick={handleSelectAll}
            >
              {t('customizeQuick.selectAll')}
            </button>
            <button
              type="button"
              className="customize-toolbar-btn reset"
              onClick={handleResetDefaults}
            >
              <RotateCcw size={12} />
              <span>{t('customizeQuick.resetDefaults')}</span>
            </button>
          </div>

          {/* Category List for Status Cards */}
          {activeTab === 'status' && (
            <div className="customize-category-list">
              {/* Selected Categories in Order */}
              <div className="customize-list-header">
                <span>{isDutch ? 'Actief op dashboard (in volgorde)' : 'Active on dashboard (in order)'}</span>
              </div>

              {selectedStatusCards.map((catId, index) => {
                const cat = CATEGORY_CATALOG.find((c) => c.id === catId);
                if (!cat) return null;
                const Icon = cat.icon;
                return (
                  <div key={cat.id} className="customize-category-row selected">
                    <div className="customize-row-left" onClick={() => toggleStatusCard(cat.id)}>
                      <div className="customize-checkbox checked">
                        <Check size={14} />
                      </div>
                      <div className="customize-icon-circle" style={{ backgroundColor: cat.bg, color: cat.color }}>
                        <Icon size={16} />
                      </div>
                      <div className="customize-row-texts">
                        <span className="customize-row-title">{cat.label}</span>
                        <span className="customize-row-desc">{cat.desc}</span>
                      </div>
                    </div>

                    <div className="customize-order-controls">
                      <button
                        type="button"
                        className="customize-order-btn"
                        disabled={index === 0}
                        onClick={() => moveStatusCard(cat.id, 'up')}
                        title={isDutch ? 'Omhoog' : 'Move up'}
                        aria-label={isDutch ? 'Omhoog' : 'Move up'}
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        className="customize-order-btn"
                        disabled={index === selectedStatusCards.length - 1}
                        onClick={() => moveStatusCard(cat.id, 'down')}
                        title={isDutch ? 'Omlaag' : 'Move down'}
                        aria-label={isDutch ? 'Omlaag' : 'Move down'}
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Unselected Categories */}
              {CATEGORY_CATALOG.filter((c) => !selectedStatusCards.includes(c.id)).length > 0 && (
                <>
                  <div className="customize-list-header mt-4">
                    <span>{isDutch ? 'Beschikbare categorieën' : 'Available categories'}</span>
                  </div>
                  {CATEGORY_CATALOG.filter((c) => !selectedStatusCards.includes(c.id)).map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <div
                        key={cat.id}
                        className="customize-category-row unselected"
                        onClick={() => toggleStatusCard(cat.id)}
                      >
                        <div className="customize-row-left">
                          <div className="customize-checkbox" />
                          <div className="customize-icon-circle" style={{ backgroundColor: 'var(--bg-card-subtle)', color: 'var(--text-tertiary)' }}>
                            <Icon size={16} />
                          </div>
                          <div className="customize-row-texts">
                            <span className="customize-row-title">{cat.label}</span>
                            <span className="customize-row-desc">{cat.desc}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}

          {/* Category List for Action Dock Buttons */}
          {activeTab === 'actions' && (
            <div className="customize-category-list">
              {/* Selected Action Buttons */}
              <div className="customize-list-header">
                <span>{isDutch ? 'Actief in onderste dock (in volgorde)' : 'Active in bottom dock (in order)'}</span>
              </div>

              {selectedActionButtons.map((catId, index) => {
                const cat = actionCategories.find((c) => c.id === catId);
                if (!cat) return null;
                const Icon = cat.icon;
                return (
                  <div key={cat.id} className="customize-category-row selected">
                    <div className="customize-row-left" onClick={() => toggleActionButton(cat.id)}>
                      <div className="customize-checkbox checked">
                        <Check size={14} />
                      </div>
                      <div className="customize-icon-circle" style={{ backgroundColor: cat.bg, color: cat.color }}>
                        <Icon size={16} />
                      </div>
                      <div className="customize-row-texts">
                        <span className="customize-row-title">{cat.label}</span>
                        <span className="customize-row-desc">{cat.desc}</span>
                      </div>
                    </div>

                    <div className="customize-order-controls">
                      <button
                        type="button"
                        className="customize-order-btn"
                        disabled={index === 0}
                        onClick={() => moveActionButton(cat.id, 'up')}
                        title={isDutch ? 'Naar links / Omhoog' : 'Move left'}
                        aria-label={isDutch ? 'Naar links / Omhoog' : 'Move left'}
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        className="customize-order-btn"
                        disabled={index === selectedActionButtons.length - 1}
                        onClick={() => moveActionButton(cat.id, 'down')}
                        title={isDutch ? 'Naar rechts / Omlaag' : 'Move right'}
                        aria-label={isDutch ? 'Naar rechts / Omlaag' : 'Move right'}
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Unselected Action Buttons */}
              {actionCategories.filter((c) => !selectedActionButtons.includes(c.id)).length > 0 && (
                <>
                  <div className="customize-list-header mt-4">
                    <span>{isDutch ? 'Beschikbaar onder "+ Meer"' : 'Available under "+ More"'}</span>
                  </div>
                  {actionCategories
                    .filter((c) => !selectedActionButtons.includes(c.id))
                    .map((cat) => {
                      const Icon = cat.icon;
                      return (
                        <div
                          key={cat.id}
                          className="customize-category-row unselected"
                          onClick={() => toggleActionButton(cat.id)}
                        >
                          <div className="customize-row-left">
                            <div className="customize-checkbox" />
                            <div className="customize-icon-circle" style={{ backgroundColor: 'var(--bg-card-subtle)', color: 'var(--text-tertiary)' }}>
                              <Icon size={16} />
                            </div>
                            <div className="customize-row-texts">
                              <span className="customize-row-title">{cat.label}</span>
                              <span className="customize-row-desc">{cat.desc}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="customize-quick-footer">
          <button
            type="button"
            className="customize-footer-btn cancel"
            onClick={closeModal}
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="customize-footer-btn save"
            onClick={handleSave}
          >
            <Check size={16} />
            <span>{t('customizeQuick.save')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
