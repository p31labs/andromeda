 *
 * Design: 16px min font, 48px touch targets, dark theme with Phosphor Green (var(--color-phosphor)) accents
import type {
  BONDINGActivity,
  WebhookEvent,
  TimeLimit,
  TimeSchedule,
  Child
} from '../types/parent';

// Use the same color constants as the main app (adjusted for var(--color-phosphor) phosphor)
const COLORS = {
  phosphorus: 'var(--color-phosphor)',
  phosphorusDim: 'var(--color-phosphor)99',
      <span style={{
        fontSize: '18px',
function TimeControlCard({
  child,
  settings,
  onSetLimit,
  onPause,

  const usagePercent = Math.min((settings.usedToday / settings.dailyLimit) * 100, 100);
  const isOverLimit = settings.usedToday >= settings.dailyLimit;

  const timeLimits: TimeLimit[] = [15, 30, 60, 120];

        <h3 style={{
          color: COLORS.text,
          fontSize: '18px',
          background: settings.isPaused
            ? COLORS.coral + '33'
          <span style={{
            color: isOverLimit ? COLORS.coral : COLORS.textDim
            background: isOverLimit
              ? COLORS.coral
                background: settings.dailyLimit === limit
                  ? COLORS.phosphorus + '33'

          background: settings.isPaused
            ? COLORS.phosphorus + '22'
      <span style={{
        fontSize: '18px',
            P31 Parent Dashboard • ages 6-80 accessible • Phosphor Green var(--color-phosphor)
// ParentDashboard is exported as default at the function declaration
