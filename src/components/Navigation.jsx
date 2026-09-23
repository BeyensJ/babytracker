import React from 'react';
import { Home, Calendar, BarChart2, Settings } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { triggerHaptic } from '../utils/haptics';

export function Navigation({ activeTab, onTabChange }) {
  const { preferences, t } = useApp();
  const tabs = [
    { id: 'today', label: t('summary.today'), icon: Home },
    { id: 'calendar', label: t('nav.calendar'), icon: Calendar },
    { id: 'trends', label: t('nav.trends'), icon: BarChart2 },
    { id: 'settings', label: t('nav.settings'), icon: Settings },
  ];

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-inner">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => {
                if (!isActive) triggerHaptic('light', preferences?.haptics);
                onTabChange(tab.id);
              }}
              id={`nav-tab-${tab.id}`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.3 : 1.8} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
