import React from 'react';
import { useApp } from '../../context/AppContext';
import { SickModeBanner } from '../SickModeBanner';
import { RemindersDueBanner } from '../RemindersDueBanner';
import { QuickStatusBanner } from '../QuickStatusBanner';
import { ActiveTimersDock } from '../ActiveTimersDock';
import { QuickActions } from '../QuickActions';
import { TimelineFeed } from '../TimelineFeed';
import { ZenTodayView } from './ZenTodayView';

export function TodayView() {
  const { isZenMode } = useApp();

  if (isZenMode) {
    return <ZenTodayView />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <SickModeBanner />
      <RemindersDueBanner />
      <QuickStatusBanner />
      <ActiveTimersDock />
      <QuickActions />
      <TimelineFeed limitDays={3} />
    </div>
  );
}
