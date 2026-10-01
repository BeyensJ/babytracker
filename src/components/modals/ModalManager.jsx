import React from 'react';
import { useApp } from '../../context/AppContext';
import { BreastfeedModal } from './BreastfeedModal';
import { BottleModal } from './BottleModal';
import { SleepModal } from './SleepModal';
import { DiaperModal } from './DiaperModal';
import { PumpModal } from './PumpModal';
import { SolidsModal } from './SolidsModal';
import { GrowthModal } from './GrowthModal';
import { HealthModal } from './HealthModal';
import { RoutineModal } from './RoutineModal';
import { NoteModal } from './NoteModal';
import { ChildSettingsModal } from './ChildSettingsModal';
import { ImportPreviewModal } from './ImportPreviewModal';
import { CaregiverModal } from './CaregiverModal';
import { ChangePasswordModal } from './ChangePasswordModal';
import { ServerSetupModal } from './ServerSetupModal';
import { EventDetailModal } from './EventDetailModal';
import { CustomizeQuickModal } from './CustomizeQuickModal';

export function ModalManager() {
  const { activeModal, closeModal } = useApp();

  if (!activeModal) return null;

  return (
    <>
      {activeModal === 'EVENT_DETAIL' && <EventDetailModal />}
      {activeModal === 'CUSTOMIZE_QUICK' && <CustomizeQuickModal />}
      {activeModal === 'BREAST' && <BreastfeedModal />}
      {activeModal === 'BOTTLE' && <BottleModal />}
      {activeModal === 'SLEEP' && <SleepModal />}
      {activeModal === 'DIAPER' && <DiaperModal />}
      {activeModal === 'PUMP' && <PumpModal />}
      {activeModal === 'SOLIDS' && <SolidsModal />}
      {activeModal === 'GROWTH' && <GrowthModal />}
      {activeModal === 'HEALTH' && <HealthModal />}
      {activeModal === 'ROUTINE' && <RoutineModal />}
      {(activeModal === 'NOTE' || activeModal === 'MILESTONE') && <NoteModal />}
      {activeModal === 'CHILD_SETTINGS' && <ChildSettingsModal />}
      {activeModal === 'IMPORT_PREVIEW' && <ImportPreviewModal />}
      {activeModal === 'CAREGIVER' && <CaregiverModal />}
      {activeModal === 'CHANGE_PASSWORD' && <ChangePasswordModal isOpen={true} onClose={closeModal} />}
      {activeModal === 'SERVER_SETUP' && <ServerSetupModal isOpen={true} onClose={closeModal} />}
    </>
  );
}
