import { createLucideIcon } from 'lucide-react';

/**
 * Custom Breast Pump icon crafted to match Lucide React's design system:
 * - 24x24 viewBox, stroke-width 2, rounded caps and joins
 * - Flange funnel on left, suction diaphragm unit on top, milk collection bottle with wave
 */
export const PumpIcon = createLucideIcon('Pump', [
  ['path', { d: 'M3 4.5a6.5 6.5 0 0 1 0 7', key: 'pump-flange-rim' }],
  ['path', { d: 'M3 5l7.5 2.5', key: 'pump-flange-top' }],
  ['path', { d: 'M3 11l7.5-1.5', key: 'pump-flange-bot' }],
  ['path', { d: 'M10.5 9.5V4.5a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2.5v4.5', key: 'pump-motor' }],
  ['path', { d: 'M8 11h11', key: 'pump-collar' }],
  ['path', { d: 'M9.5 11v7a2.5 2.5 0 0 0 2.5 2.5h3a2.5 2.5 0 0 0 2.5-2.5v-7', key: 'pump-bottle' }],
  ['path', { d: 'M9.5 15.5a4 4 0 0 1 4 0 4 4 0 0 0 4 0', key: 'pump-wave' }],
]);

export default PumpIcon;
