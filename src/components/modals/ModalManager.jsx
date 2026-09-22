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

export function ModalManager() {
  const { activeModal, closeModal } = useApp();

  if (!activeModal) return null;

  return (
    <>
      <BreastfeedModal />
      <BottleModal />
      <SleepModal />
      <DiaperModal />
      <PumpModal />
      <SolidsModal />
      <GrowthModal />
      <HealthModal />
      <RoutineModal />
      <NoteModal />
      <ChildSettingsModal />
      <ImportPreviewModal />
      <CaregiverModal />
      <ChangePasswordModal isOpen={activeModal === 'CHANGE_PASSWORD'} onClose={closeModal} />
    </>
  );
}
