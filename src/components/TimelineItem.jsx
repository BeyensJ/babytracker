import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatTime, formatDurationMs, formatVolume, formatWeight, formatLength, formatTemp } from '../utils/formatters';
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
  Award,
  MoreVertical,
  Edit2,
  Trash2,
  User,
} from 'lucide-react';

export function TimelineItem({ event }) {
  const { preferences, deleteEvent, openModal } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);

  const det = event.details || {};
  const isMetric = preferences.weightUnit === 'kg';

  // Config by category
  const getConfig = () => {
    switch (event.type) {
      case 'BREAST': {
        const chips = [];
        const side = (det.side || '').toUpperCase();
        if (side === 'BOTH' || (det.leftDurationMs > 0 && det.rightDurationMs > 0)) {
          chips.push(`Both Sides (L: ${formatDurationMs(det.leftDurationMs)}, R: ${formatDurationMs(det.rightDurationMs)})`);
        } else if (side.includes('LEFT') || det.leftDurationMs > 0) {
          const dur = det.leftDurationMs || event.durationMs;
          chips.push(dur ? `Left · ${formatDurationMs(dur)}` : 'Left Side');
        } else if (side.includes('RIGHT') || det.rightDurationMs > 0) {
          const dur = det.rightDurationMs || event.durationMs;
          chips.push(dur ? `Right · ${formatDurationMs(dur)}` : 'Right Side');
        } else {
          chips.push(formatDurationMs(event.durationMs) || 'Nursing');
        }
        return {
          icon: Heart,
          badgeClass: 'feed',
          title: 'Breastfeed',
          chips,
        };
      }
      case 'BOTTLE':
        return {
          icon: Milk,
          badgeClass: 'feed',
          title: 'Bottle Feed',
          chips: [
            det.volumeFloz ? formatVolume(det.volumeFloz, preferences.volumeUnit) : '',
            det.milkType === 'FORMULA' ? (det.formulaName || 'Formula') : 'Breast Milk',
          ].filter(Boolean),
        };
      case 'COMBO':
        return {
          icon: Heart,
          badgeClass: 'feed',
          title: 'Combo Feed',
          chips: [
            det.volumeFloz ? formatVolume(det.volumeFloz, preferences.volumeUnit) : '',
            formatDurationMs(event.durationMs),
          ].filter(Boolean),
        };
      case 'SOLIDS':
        return {
          icon: Apple,
          badgeClass: 'feed',
          title: 'Solid Food',
          chips: [det.food || 'Meal', det.reaction ? `Reaction: ${det.reaction}` : ''].filter(Boolean),
        };
      case 'SLEEP': {
        const isOngoing = !event.durationMs && !event.endDt;
        return {
          icon: Moon,
          badgeClass: 'sleep',
          title: det.sleepType === 'NIGHT' ? 'Night Sleep' : 'Nap',
          chips: [isOngoing ? 'Sleeping now...' : formatDurationMs(event.durationMs || (event.endDt - event.beginDt))],
        };
      }
      case 'DIAPER': {
        const parts = [];
        if (det.pee) parts.push('Wet');
        if (det.poop) parts.push('Dirty');
        if (det.dry) parts.push('Dry');

        const formatDesc = (str) => {
          if (!str) return '';
          return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('-');
        };

        const colorDesc = formatDesc(det.color);
        const textureDesc = formatDesc(det.texture);
        const colorTexture = [colorDesc, textureDesc].filter(Boolean).join(', ');

        return {
          icon: Sparkles,
          badgeClass: 'diaper',
          title: 'Diaper Change',
          chips: [
            parts.length > 0 ? parts.join('/') : 'Diaper',
            colorTexture ? `(${colorTexture})` : '',
            det.blowout ? '⚠️ Blowout' : '',
            det.rash ? 'Rash' : '',
          ].filter(Boolean),
        };
      }
      case 'PUMP':
        return {
          icon: Pipette,
          badgeClass: 'pump',
          title: 'Pumping',
          chips: [
            det.totalFloz
              ? formatVolume(det.totalFloz, preferences.volumeUnit)
              : det.leftFloz || det.rightFloz
              ? `L: ${det.leftFloz || 0}oz | R: ${det.rightFloz || 0}oz`
              : '',
            formatDurationMs(event.durationMs),
          ].filter(Boolean),
        };
      case 'GROWTH': {
        const chips = [];
        let title = 'Growth Check';
        const hasWeight = det.weightKg || det.weightLb;
        const hasHeight = det.heightCm || det.heightIn;
        const hasHead = det.headCm || det.headIn;

        if (hasWeight && !hasHeight && !hasHead) title = 'Weight Check';
        else if (hasHead && !hasWeight && !hasHeight) title = 'Head Circumference';

        if (det.weightKg && isMetric) chips.push(`${det.weightKg} kg`);
        else if (det.weightLb) chips.push(formatWeight(det.weightLb, preferences.weightUnit));

        if (det.heightCm && preferences.lengthUnit === 'cm') chips.push(`${det.heightCm} cm`);
        else if (det.heightIn) chips.push(formatLength(det.heightIn, preferences.lengthUnit));

        if (det.headCm && preferences.lengthUnit === 'cm') chips.push(`Head: ${det.headCm} cm`);
        else if (det.headIn) chips.push(`Head: ${formatLength(det.headIn, preferences.lengthUnit)}`);

        return {
          icon: Ruler,
          badgeClass: 'grow',
          title,
          chips,
        };
      }
      case 'HEALTH': {
        const chips = [];
        let title = 'Health & Meds';
        if (det.medicineName) {
          title = 'Medication';
          chips.push(det.medicineName);
          if (det.dosage) chips.push(det.dosage);
        } else if (det.temperatureC || det.temperatureF) {
          title = 'Temperature Check';
          if (det.temperatureC && preferences.tempUnit === 'C') chips.push(`${det.temperatureC}°C`);
          else if (det.temperatureF) chips.push(formatTemp(det.temperatureF, preferences.tempUnit));
        } else if (det.doctorName) {
          title = 'Doctor Visit';
          chips.push(det.doctorName);
        } else if (det.vaccineName) {
          title = 'Vaccine';
          chips.push(det.vaccineName);
        } else if (event.note) {
          title = 'Health / Checkup Note';
        }

        return {
          icon: Stethoscope,
          badgeClass: 'health',
          title,
          chips,
        };
      }
      case 'ROUTINE':
        return {
          icon: Clock,
          badgeClass: 'routine',
          title: det.routineName || 'Routine',
          chips: [formatDurationMs(event.durationMs)],
        };
      case 'MILESTONE': {
        const isFirst = det.isBabyFirst;
        return {
          icon: Award,
          badgeClass: 'note',
          title: det.milestoneName || (isFirst ? 'Baby First' : 'Milestone'),
          chips: [isFirst ? '🌟 Baby First' : '🏆 Milestone'],
        };
      }
      case 'NOTE':
      default:
        return {
          icon: BookOpen,
          badgeClass: 'note',
          title: 'Journal Note',
          chips: [],
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  const handleEdit = () => {
    setMenuOpen(false);
    openModal(event.type, event);
  };

  const handleDelete = () => {
    setMenuOpen(false);
    if (window.confirm('Delete this logged activity?')) {
      deleteEvent(event.id);
    }
  };

  return (
    <div className="timeline-item-card">
      <div className="timeline-item-left">
        <div className={`item-badge-icon ${config.badgeClass}`}>
          <Icon size={18} />
        </div>

        <div className="item-content">
          <div className="item-title-row">
            <span className="item-title">{config.title}</span>
            {config.chips.map((chip, idx) => (
              <span key={idx} className="item-details-chip">
                {chip}
              </span>
            ))}
          </div>

          {event.note && <div className="item-note">"{event.note}"</div>}

          {det.caregiver && (
            <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <User size={11} />
              Logged by {det.caregiver}
            </div>
          )}
        </div>
      </div>

      <div className="timeline-item-right">
        <span className="item-time">{formatTime(event.beginDt)}</span>

        <div style={{ position: 'relative' }}>
          <button
            className="item-menu-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Activity menu"
          >
            <MoreVertical size={16} />
          </button>

          {menuOpen && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 30 }}
                onClick={() => setMenuOpen(false)}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                  border: '1px solid var(--border-subtle)',
                  padding: '0.35rem',
                  zIndex: 35,
                  minWidth: 120,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.2rem',
                }}
              >
                <button
                  onClick={handleEdit}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.45rem 0.65rem',
                    fontSize: '0.8rem',
                    color: 'var(--text-primary)',
                    borderRadius: 'var(--radius-sm)',
                    width: '100%',
                    textAlign: 'left',
                  }}
                >
                  <Edit2 size={13} />
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.45rem 0.65rem',
                    fontSize: '0.8rem',
                    color: 'var(--status-red)',
                    borderRadius: 'var(--radius-sm)',
                    width: '100%',
                    textAlign: 'left',
                  }}
                >
                  <Trash2 size={13} />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
