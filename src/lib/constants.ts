import { CONFIG } from '@/config';

export const QUARTER_START = new Date(CONFIG.quarter.startDate);
export const QUARTER_END   = new Date(CONFIG.quarter.endDate);
export const TOTAL_WEEKS   = CONFIG.quarter.totalWeeks;

function getQuarterWeekAnchor(): Date {
  const d = new Date(QUARTER_START);
  const day = d.getDay();
  const offset = day === 0 ? -6 : -(day - 1);
  d.setDate(d.getDate() + offset);
  return d;
}
const QUARTER_WEEK_ANCHOR = getQuarterWeekAnchor();

export const DEPARTMENTS = CONFIG.departments.map((d) => d.name);
export type Department = string;

export const DEPARTMENT_COLORS: Record<string, string> = Object.fromEntries(
  CONFIG.departments.map((d) => [d.name, d.color])
);

// Kept for API compatibility; unused in template (Tailwind can't purge dynamic class names)
export const DEPARTMENT_BG_CLASSES: Record<string, string> = {};

export function getCurrentWeekNumber(): number {
  const now = new Date();
  const diffMs = now.getTime() - QUARTER_WEEK_ANCHOR.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const week = Math.floor(diffDays / 7) + 1;
  return Math.max(1, Math.min(week, TOTAL_WEEKS));
}

export function getWeekDateRange(weekNum: number): { start: Date; end: Date } {
  const start = new Date(QUARTER_WEEK_ANCHOR);
  start.setDate(start.getDate() + (weekNum - 1) * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start, end };
}

export function getWeekDateRangeStrings(weekNum: number): { startStr: string; endStr: string } {
  const { start, end } = getWeekDateRange(weekNum);
  return {
    startStr: start.toISOString().split('T')[0],
    endStr:   end.toISOString().split('T')[0],
  };
}

export function getActiveMonth(): string {
  const week = getCurrentWeekNumber();
  const [m1, m2, m3] = CONFIG.quarter.months;
  if (week <= 4) return m1;
  if (week <= 9) return m2;
  return m3;
}

export function getMonthForWeek(w: number): string {
  const [m1, m2, m3] = CONFIG.quarter.months;
  if (w <= 4) return m1;
  if (w <= 9) return m2;
  return m3;
}

export function getQuarterProgress(): number {
  const now = new Date();
  const total   = QUARTER_END.getTime() - QUARTER_START.getTime();
  const elapsed = now.getTime() - QUARTER_START.getTime();
  return Math.max(0, Math.min(100, (elapsed / total) * 100));
}

export function getTodayFormatted(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

export function getTodayIso(): string {
  return new Date().toISOString().split('T')[0];
}

export function getDayOfWeek(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long' });
}

export function getDaysRemainingInWeek(): number {
  const dayIndex = new Date().getDay();
  if (dayIndex === 0) return 0;
  return Math.max(0, 6 - dayIndex);
}

export function getWeekDays(): { label: string; date: Date; iso: string; dayName: string; status: 'past' | 'today' | 'upcoming' }[] {
  const now = new Date();
  const todayIso = now.toISOString().split('T')[0];
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : -(dayOfWeek - 1);
  const monday = new Date(now);
  monday.setDate(monday.getDate() + mondayOffset);
  const days: ReturnType<typeof getWeekDays> = [];
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  for (let i = 0; i < 6; i++) {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().split('T')[0];
    const status = iso < todayIso ? 'past' : iso === todayIso ? 'today' : 'upcoming';
    days.push({ label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), date: d, iso, dayName: dayNames[i], status });
  }
  return days;
}

export const MANUAL_STATUSES = ['not_started', 'in_progress', 'at_risk', 'blocked', 'complete'] as const;
export type ManualStatus = typeof MANUAL_STATUSES[number];

export const STATUS_CONFIG: Record<ManualStatus, { label: string; emoji: string; color: string; bgClass: string }> = {
  not_started: { label: 'Not Started', emoji: '⚪', color: 'hsl(220, 10%, 60%)', bgClass: 'bg-gray-400' },
  in_progress:  { label: 'In Progress', emoji: '🔵', color: 'hsl(220, 70%, 50%)', bgClass: 'bg-blue-500' },
  at_risk:      { label: 'At Risk',     emoji: '🟡', color: 'hsl(38, 92%, 50%)',  bgClass: 'bg-yellow-500' },
  blocked:      { label: 'Blocked',     emoji: '🔴', color: 'hsl(0, 72%, 51%)',   bgClass: 'bg-red-500' },
  complete:     { label: 'Complete',    emoji: '🟢', color: 'hsl(142, 71%, 45%)', bgClass: 'bg-green-500' },
};

export function getStatusColor(status: string | null): string {
  const cfg = STATUS_CONFIG[status as ManualStatus];
  if (cfg) return cfg.color;
  switch (status) {
    case 'green':  return 'hsl(142, 71%, 45%)';
    case 'yellow': return 'hsl(38, 92%, 50%)';
    case 'red':    return 'hsl(0, 72%, 51%)';
    default:       return 'hsl(220, 10%, 60%)';
  }
}

export function getStatusEmoji(status: string | null): string {
  const cfg = STATUS_CONFIG[status as ManualStatus];
  if (cfg) return cfg.emoji;
  switch (status) {
    case 'green':  return '🟢';
    case 'yellow': return '🟡';
    case 'red':    return '🔴';
    default:       return '⚪';
  }
}

export function getStatusLabel(status: string | null): string {
  const cfg = STATUS_CONFIG[status as ManualStatus];
  return cfg?.label || (status || 'Unknown');
}
