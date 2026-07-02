import { Link } from 'react-router-dom';
import { useDepartmentMits, useDailyInputs, useAllBlockers, useMonthlyMilestones } from '@/hooks/use-mit-data';
import { useDepartmentPreference } from '@/hooks/use-department-preference';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DEPARTMENTS, DEPARTMENT_COLORS, getStatusColor, getStatusLabel,
  getCurrentWeekNumber, getWeekDateRangeStrings, getActiveMonth,
  type Department,
} from '@/lib/constants';
import { CheckCircle2, Clock, ChevronRight, PenLine, ShieldAlert, AlertTriangle } from 'lucide-react';

function DeptPicker({ onSelect }: { onSelect: (d: Department) => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Which team are you on?</h1>
        <p className="text-sm text-muted-foreground mt-1">We'll show your MITs and check-in status every time you log in.</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-lg">
        {DEPARTMENTS.map((d) => (
          <button
            key={d}
            onClick={() => onSelect(d)}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:border-foreground/30 hover:bg-muted/40 transition-all group"
          >
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: DEPARTMENT_COLORS[d as Department] }}
            />
            <span className="text-sm font-medium">{d}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function MyWork() {
  const { dept, setDept } = useDepartmentPreference();
  const weekNumber = getCurrentWeekNumber();
  const activeMonth = getActiveMonth();
  const { startStr, endStr } = getWeekDateRangeStrings(weekNumber);

  const { data: myMits, isLoading: mitsLoading } = useDepartmentMits(dept ?? undefined);
  const { data: allInputs, isLoading: inputsLoading } = useDailyInputs();
  const { data: allBlockers } = useAllBlockers(['open', 'in_progress']);
  const { data: allMilestones } = useMonthlyMilestones();

  if (!dept) return <DeptPicker onSelect={setDept} />;

  const myMitIds = new Set((myMits || []).map((m) => m.id));
  const color = DEPARTMENT_COLORS[dept as Department];

  // This week's check-ins for my MITs
  const thisWeekInputs = (allInputs || []).filter(
    (i) => i.input_date >= startStr && i.input_date <= endStr && myMitIds.has(i.department_mit_id)
  );
  const mitsCheckedIn = new Set(thisWeekInputs.map((i) => i.department_mit_id));
  const checkedInCount = mitsCheckedIn.size;
  const totalMits = myMits?.length || 0;
  const allCheckedIn = checkedInCount === totalMits && totalMits > 0;

  // My open blockers
  const myBlockers = (allBlockers || []).filter(
    (b) => b.department_mits?.department === dept
  );

  // Active month milestone for my MITs
  const myMilestones = (allMilestones || []).filter(
    (ms) => ms.month === activeMonth && myMitIds.has(ms.department_mit_id)
  );

  const isLoading = mitsLoading || inputsLoading;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{dept}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Week {weekNumber} of 13 · {activeMonth} milestone active
            </p>
          </div>
        </div>
        <button
          onClick={() => setDept(null)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Switch team
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : (
        <>
          {/* ── Check-in status ── */}
          <Card className={allCheckedIn ? 'border-emerald-200 dark:border-emerald-900' : 'border-amber-200 dark:border-amber-900'}>
            <CardContent className="py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {allCheckedIn ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                ) : (
                  <Clock className="h-5 w-5 text-amber-500 shrink-0" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {allCheckedIn
                      ? 'All MITs checked in this week'
                      : `${checkedInCount} of ${totalMits} MITs checked in`}
                  </p>
                  <p className="text-xs text-muted-foreground">Week {weekNumber}</p>
                </div>
              </div>
              <Link to="/checkin">
                <Button size="sm" variant={allCheckedIn ? 'outline' : 'default'} className="gap-1.5 shrink-0">
                  <PenLine className="h-3.5 w-3.5" />
                  {allCheckedIn ? 'Add update' : 'Check in now'}
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* ── My MITs ── */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3">
              My MITs
            </h2>
            {(myMits || []).length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground text-sm">
                  No MITs assigned to {dept} yet.
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-0 pb-0 divide-y divide-border/60">
                  {myMits!.map((m) => {
                    const hasInput = mitsCheckedIn.has(m.id);
                    const latestInput = thisWeekInputs.find((i) => i.department_mit_id === m.id);
                    return (
                      <Link key={m.id} to={`/mit/${m.id}`}>
                        <div className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 transition-colors group">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: getStatusColor(m.current_status) }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{m.title}</p>
                            {latestInput && (
                              <p className="text-xs text-muted-foreground truncate">{latestInput.update_text}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline" className="text-xs">{getStatusLabel(m.current_status)}</Badge>
                            {hasInput ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <Clock className="h-3.5 w-3.5 text-muted-foreground/40" />
                            )}
                            <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </div>

          {/* ── Active milestone ── */}
          {myMilestones.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                {activeMonth} Milestones
              </h2>
              <Card>
                <CardContent className="pt-0 pb-0 divide-y divide-border/60">
                  {myMilestones.map((ms) => {
                    const mit = (myMits || []).find((m) => m.id === ms.department_mit_id);
                    return (
                      <div key={ms.id} className="flex items-center gap-3 px-4 py-3">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: ms.status === 'complete' ? 'hsl(142 71% 38%)' : 'hsl(38 92% 46%)' }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">{mit?.title}</p>
                          <p className="text-sm">{ms.description}</p>
                        </div>
                        {ms.status === 'complete' && (
                          <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300 shrink-0">Done</Badge>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Open blockers ── */}
          {myBlockers.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                Open Blockers
              </h2>
              <Card>
                <CardContent className="pt-0 pb-0 divide-y divide-border/60">
                  {myBlockers.map((b) => (
                    <div key={b.id} className="flex items-start gap-3 px-4 py-3">
                      <ShieldAlert className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">{b.department_mits?.title}</p>
                        <p className="text-sm">{b.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">Reported by {b.reported_by}</p>
                      </div>
                      <Badge variant="destructive" className="text-[10px] shrink-0">{b.severity}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Link to="/blockers" className="text-xs text-muted-foreground hover:text-foreground transition-colors mt-2 block text-right">
                Manage blockers →
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
