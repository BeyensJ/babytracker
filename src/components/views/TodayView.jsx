import React from 'react';
import { RemindersDueBanner } from '../RemindersDueBanner';
import { QuickStatusBanner } from '../QuickStatusBanner';
import { ActiveTimersDock } from '../ActiveTimersDock';
import { QuickActions } from '../QuickActions';
import { TimelineFeed } from '../TimelineFeed';

export function TodayView() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <RemindersDueBanner />
      <QuickStatusBanner />
      <ActiveTimersDock />
      <QuickActions />
      <TimelineFeed limitDays={3} />
    </div>
  );
}
