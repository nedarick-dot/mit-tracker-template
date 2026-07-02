import { getWeekDays, getCurrentWeekNumber, getDaysRemainingInWeek } from '@/lib/constants';
import { cn } from '@/lib/utils';

export default function WeekDayStrip({ compact = false }: { compact?: boolean }) {
  const days = getWeekDays();
  const remaining = getDaysRemainingInWeek();

  return (
    <div className="flex items-center gap-1">
      {days.map((d) => (
        <div
          key={d.iso}
          className={cn(
            'flex flex-col items-center rounded-md px-2 py-1 text-xs transition-colors',
            d.status === 'today' && 'bg-primary text-primary-foreground font-bold ring-2 ring-primary/30',
            d.status === 'past' && 'bg-muted text-muted-foreground',
            d.status === 'upcoming' && 'bg-accent/40 text-accent-foreground',
          )}
        >
          <span className="text-[10px] leading-tight">{d.dayName.slice(0, 3)}</span>
          {!compact && <span className="text-[10px] leading-tight">{d.label}</span>}
        </div>
      ))}
      <span className="ml-2 text-[10px] text-muted-foreground whitespace-nowrap">
        {remaining === 0 ? 'Last workday' : `${remaining} day${remaining !== 1 ? 's' : ''} left`}
      </span>
    </div>
  );
}
