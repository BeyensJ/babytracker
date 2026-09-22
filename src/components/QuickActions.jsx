import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
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
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export function QuickActions() {
  const { openModal } = useApp();
  const [showMore, setShowMore] = useState(false);

  const primaryActions = [
    { id: 'BREAST', label: 'Breast', icon: Heart, className: 'breast' },
    { id: 'BOTTLE', label: 'Bottle', icon: Milk, className: 'bottle' },
    { id: 'SLEEP', label: 'Sleep', icon: Moon, className: 'sleep' },
    { id: 'DIAPER', label: 'Diaper', icon: Sparkles, className: 'diaper' },
    { id: 'PUMP', label: 'Pump', icon: Pipette, className: 'pump' },
  ];

  const secondaryActions = [
    { id: 'SOLIDS', label: 'Solids', icon: Apple, className: 'solids' },
    { id: 'GROWTH', label: 'Growth', icon: Ruler, className: 'growth' },
    { id: 'HEALTH', label: 'Health', icon: Stethoscope, className: 'health' },
    { id: 'ROUTINE', label: 'Routine', icon: Clock, className: 'routine' },
    { id: 'NOTE', label: 'Notes', icon: BookOpen, className: 'notes' },
  ];

  return (
    <div className="quick-actions-section">
      <div className="section-label">
        <span>Log Activity</span>
        <button
          className="toggle-more-btn"
          onClick={() => setShowMore(!showMore)}
          aria-label="Toggle more tracking options"
        >
          {showMore ? 'Show Less' : 'More'}
          {showMore ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>

      {/* Primary 5 Activities */}
      <div className="quick-actions-grid">
        {primaryActions.map(act => {
          const Icon = act.icon;
          return (
            <button
              key={act.id}
              className={`action-card ${act.className}`}
              onClick={() => openModal(act.id)}
              id={`log-btn-${act.id.toLowerCase()}`}
            >
              <div className="action-icon-wrap">
                <Icon size={20} />
              </div>
              <span className="action-label">{act.label}</span>
            </button>
          );
        })}
      </div>

      {/* Secondary 5 Activities (Solids, Growth, Health, Routine, Notes) */}
      {showMore && (
        <div className="quick-actions-grid" style={{ animation: 'slideInDown 0.2s ease-out' }}>
          {secondaryActions.map(act => {
            const Icon = act.icon;
            return (
              <button
                key={act.id}
                className={`action-card ${act.className}`}
                onClick={() => openModal(act.id)}
                id={`log-btn-${act.id.toLowerCase()}`}
              >
                <div className="action-icon-wrap">
                  <Icon size={20} />
                </div>
                <span className="action-label">{act.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
