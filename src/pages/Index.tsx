import { useEffect, useRef } from 'react';
import { CONFIG } from '@/config';
import { useDepartmentMits, useExecutiveSnapshots, useWeeklyRollups, useBlockers, useDailyInputs, useMonthlyMilestones, useTeamLeads } from '@/hooks/use-mit-data';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import {
  getCurrentWeekNumber,
  getQuarterProgress,
  getActiveMonth,
  getStatusColor,
  getWeekDateRangeStrings,
  DEPARTMENTS,
  DEPARTMENT_COLORS,
  type Department,
} from '@/lib/constants';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, ChevronRight, TrendingUp, CheckCircle2, Clock,
  CalendarCheck, ArrowUp, ArrowDown, Minus,
} from 'lucide-react';

function StatChip({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: 'green' | 'yellow' | 'red' | 'default';
}) {
  const colorMap = {
    green: 'text-emerald-600 dark:text-emerald-400',
    yellow: 'text-amber-600 dark:text-amber-400',
    red: 'text-red-600 dark:text-red-400',
    default: 'text-foreground',
  };
  return (
    <div className="flex flex-col gap-0.5">
      <span className={`text-2xl font-semibold tabular-nums tracking-tight ${colorMap[accent ?? 'default']}`}>
        {value}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function MitDot({ mit }: { mit: { id: string; current_status: string | null; title: string } }) {
  return (
    <Link to={`/mit/${mit.id}`}>
      <span
        className="block h-3.5 w-3.5 rounded-sm hover:ring-2 ring-foreground/25 transition-all cursor-pointer shrink-0"
        style={{ backgroundColor: getStatusColor(mit.current_status) }}
        title={`${mit.title} · ${mit.current_status ?? 'not started'}`}
      />
    </Link>
  );
}

function TrendLine({ trend, summary }: { trend: 'up' | 'flat' | 'down' | null; summary: string }) {
  if (!trend) return null;
  const icon = trend === 'up'
    ? <ArrowUp className="h-3 w-3 text-emerald-500 shrink-0" />
    : trend === 'down'
    ? <ArrowDown className="h-3 w-3 text-red-500 shrink-0" />
    : <Minus className="h-3 w-3 text-muted-foreground/40 shrink-0" />;
  return (
    <div className="flex items-start gap-1 mt-0.5 pl-4">
      <span className="mt-0.5">{icon}</span>
      <span className="text-[11px] text-muted-foreground leading-tight line-clamp-2">{summary || 'No change week-over-week'}</span>
    </div>
  );
}

const STATUS_SCORE: Record<string, number> = {
  complete: 3,
  in_progress: 2,
  at_risk: 1,
  not_started: 1,
  blocked: 0,
};

const TRACK_DEPTS = DEPARTMENTS.filter((d) => d !== 'Operations');

function CheckInPulse({ weekNumber, checkedInDepts }: { weekNumber: number; checkedInDepts: Set<string> }) {
  const now = new Date();
  const utcDay = now.getUTCDay();
  const utcHour = now.getUTCHours();
  const dmsSent = utcDay === 6 || utcDay === 0 || (utcDay === 1 && utcHour < 13);
  const allIn = TRACK_DEPTS.every((d) => checkedInDepts.has(d));
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
          Week {weekNumber} Check-ins
        </h2>
        {allIn && (
          <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> All in
          </span>
        )}
      </div>
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="divide-y divide-border/50">
            {TRACK_DEPTS.map((dept) => {
              const submitted = checkedInDepts.has(dept);
              const deptColor = DEPARTMENT_COLORS[dept as Department] ?? '#6b7280';
              return (
                <div key={dept} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2.5">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: deptColor }} />
                    <span className="text-sm font-medium">{dept}</span>
                  </div>
                  {submitted ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Submitted
                    </span>
                  ) : dmsSent ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                      <Clock className="h-3.5 w-3.5" /> Message out
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Pending</span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Dashboard() {
  const { data: deptMits, isLoading: deptLoading } = useDepartmentMits();
  const { data: allMilestones } = useMonthlyMilestones();
  const { data: snapshots } = useExecutiveSnapshots();
  const { data: rollups } = useWeeklyRollups();
  const { data: dailyInputs } = useDailyInputs();
  const { data: openBlockers } = useBlockers(undefined, 'open');
  const { data: teamLeads } = useTeamLeads();
  const queryClient = useQueryClient();
  const autoGenAttempted = useRef<number | null>(null);
  const rollupRefreshAttempted = useRef<string | null>(null);

  const navigate = useNavigate();
  const weekNumber = getCurrentWeekNumber();
  const previousWeek = Math.max(1, weekNumber - 1);
  const progress = getQuarterProgress();
  const activeMonth = getActiveMonth();

  const targetWeek = (() => {
    if (!rollups || rollups.length === 0) return previousWeek;
    const weeksWithRollups = Array.from(new Set(rollups.map((r) => r.week_number)))
      .filter((w) => w <= previousWeek)
      .sort((a, b) => b - a);
    return weeksWithRollups[0] ?? previousWeek;
  })();

  const targetSnapshot = snapshots?.find((s) => s.week_number === targetWeek);

  const staleRollupSignature = (() => {
    if (!dailyInputs || !deptMits || !rollups) return null;
    const { startStr, endStr } = getWeekDateRangeStrings(targetWeek);
    const rollupByDept = new Map<string, (typeof rollups)[number]>();
    rollups
      .filter((r) => r.week_number === targetWeek && r.department)
      .forEach((r) => {
        const current = rollupByDept.get(r.department!);
        if (!current || new Date(r.generated_at).getTime() > new Date(current.generated_at).getTime()) {
          rollupByDept.set(r.department!, r);
        }
      });
    const mitDept = new Map(deptMits.map((m) => [m.id, m.department]));
    const staleDepartments = new Set<string>();
    dailyInputs
      .filter((i) => i.input_date >= startStr && i.input_date <= endStr)
      .forEach((i) => {
        const dept = mitDept.get(i.department_mit_id);
        if (!dept) return;
        const rollup = rollupByDept.get(dept);
        if (!rollup || new Date(i.created_at).getTime() > new Date(rollup.generated_at).getTime()) {
          staleDepartments.add(dept);
        }
      });
    return staleDepartments.size > 0 ? `${targetWeek}:${Array.from(staleDepartments).sort().join(',')}` : null;
  })();

  useEffect(() => {
    if (!rollups) return;
    if (weekNumber <= 1) return;
    if (staleRollupSignature) return;
    if (targetSnapshot) return;
    if (autoGenAttempted.current === targetWeek) return;
    const priorWeekRollups = rollups.filter((r) => r.week_number === targetWeek);
    if (priorWeekRollups.length === 0) return;
    autoGenAttempted.current = targetWeek;
    supabase.functions
      .invoke('generate-executive-snapshot', { body: { week_number: targetWeek } })
      .then(({ error }) => {
        if (!error) queryClient.invalidateQueries({ queryKey: ['executive_rollup_snapshots'] });
      });
  }, [rollups, weekNumber, targetWeek, targetSnapshot, staleRollupSignature, queryClient]);

  useEffect(() => {
    if (!staleRollupSignature) return;
    if (rollupRefreshAttempted.current === staleRollupSignature) return;
    rollupRefreshAttempted.current = staleRollupSignature;
    supabase.functions
      .invoke('generate-rollup', { body: { week_number: targetWeek } })
      .then(async ({ error }) => {
        if (error) return;
        await supabase.functions.invoke('generate-executive-snapshot', { body: { week_number: targetWeek } });
        queryClient.invalidateQueries({ queryKey: ['weekly_rollups'] });
        queryClient.invalidateQueries({ queryKey: ['executive_rollup_snapshots'] });
      });
  }, [staleRollupSignature, targetWeek, queryClient]);

  if (deptLoading) {
    return (
      <div className="space-y-6 max-w-5xl">
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  // ── Check-in participation for current week ───────────────────
  const { startStr: weekStart, endStr: weekEnd } = getWeekDateRangeStrings(weekNumber);
  const mitToDept = new Map((deptMits || []).map((m) => [m.id, m.department]));
  const thisWeekInputs = (dailyInputs || []).filter(
    (i) => i.input_date >= weekStart && i.input_date <= weekEnd
  );
  const checkedInDepts = new Set<string>();
  const lastInputByDept: Record<string, typeof thisWeekInputs[0]> = {};
  thisWeekInputs.forEach((i) => {
    const dept = mitToDept.get(i.department_mit_id);
    if (!dept) return;
    checkedInDepts.add(dept);
    if (!lastInputByDept[dept] || i.input_date > lastInputByDept[dept].input_date) {
      lastInputByDept[dept] = i;
    }
  });

  // ── MIT stats ─────────────────────────────────────────────────
  const totalMits = deptMits?.length || 0;
  const completeMits = deptMits?.filter((d) => d.current_status === 'complete').length || 0;
  const atRiskMits = deptMits?.filter((d) => d.current_status === 'at_risk').length || 0;
  const blockedMits = deptMits?.filter((d) => d.current_status === 'blocked').length || 0;

  // ── Milestone review banner ───────────────────────────────────
  const isMonthEndWeek = weekNumber === 4 || weekNumber === 9 || weekNumber === 13;
  const mitMap = new Map((deptMits || []).map((m) => [m.id, { title: m.title, department: m.department, id: m.id }]));
  const monthMilestones = (allMilestones || []).filter((m) => m.month === activeMonth);
  const completedMilestones = monthMilestones.filter((m) => m.status === 'complete');

  // ── Latest executive snapshot ─────────────────────────────────
  const latestSnap = snapshots && snapshots.length > 0
    ? [...snapshots].sort((a, b) => b.week_number - a.week_number)[0]
    : null;

  // ── Week-over-week dept trends + summary ─────────────────────
  const avgStatusScore = (statuses: (string | null)[]): number | null => {
    const scored = statuses.map((s) => STATUS_SCORE[s ?? ''] ?? null).filter((n): n is number => n !== null);
    return scored.length > 0 ? scored.reduce((a, b) => a + b, 0) / scored.length : null;
  };

  const deptAnalysis: Record<string, { trend: 'up' | 'flat' | 'down' | null; summary: string }> = {};
  DEPARTMENTS.forEach((dept) => {
    const deptMitList = (deptMits || []).filter((d) => d.department === dept);
    const deptRollups = (rollups || [])
      .filter((r) => r.department === dept)
      .sort((a, b) => b.week_number - a.week_number);

    // Current live average score for this dept
    const currentAvg = avgStatusScore(deptMitList.map((m) => m.current_status));

    if (deptRollups.length === 0 || currentAvg === null) {
      deptAnalysis[dept] = { trend: null, summary: '' };
      return;
    }

    const latestRollup = deptRollups[0];
    const latestSA = latestRollup.status_assessment as Record<string, unknown> | null;
    const lookBack = latestSA?.look_back as string | undefined;

    // Compute rollup's average score from its mit_status map (no title matching needed)
    const mitStatusMap = (latestSA?.mit_status ?? {}) as Record<string, string>;
    const rollupValues = Object.values(mitStatusMap);
    const rollupAvg = rollupValues.length > 0
      ? avgStatusScore(rollupValues)
      : null;

    // If we have two rollup weeks, compare them; otherwise compare rollup vs current live
    let baseAvg: number | null = null;
    if (deptRollups.length >= 2) {
      const prevSA = deptRollups[1].status_assessment as Record<string, unknown> | null;
      const prevMap = (prevSA?.mit_status ?? {}) as Record<string, string>;
      baseAvg = avgStatusScore(Object.values(prevMap));
      // In this mode, "current" is the latest rollup snapshot
      const delta = rollupAvg !== null && baseAvg !== null ? rollupAvg - baseAvg : null;
      const trend: 'up' | 'flat' | 'down' | null = delta === null ? null
        : delta > 0.3 ? 'up' : delta < -0.3 ? 'down' : 'flat';
      const summary = buildSummary(lookBack, trend);
      deptAnalysis[dept] = { trend, summary };
    } else {
      // Single rollup: compare rollup snapshot vs current live status
      baseAvg = rollupAvg;
      const delta = baseAvg !== null ? currentAvg - baseAvg : null;
      const trend: 'up' | 'flat' | 'down' | null = delta === null ? 'flat'
        : delta > 0.3 ? 'up' : delta < -0.3 ? 'down' : 'flat';
      const summary = buildSummary(lookBack, trend);
      deptAnalysis[dept] = { trend, summary };
    }
  });

  function buildSummary(lookBack: string | undefined, trend: 'up' | 'flat' | 'down' | null): string {
    if (lookBack) {
      const first = lookBack.split(/\.\s/)[0].replace(/\.$/, '');
      return first.length > 90 ? first.slice(0, 87) + '...' : first;
    }
    if (trend === 'up') return 'Improving vs last week';
    if (trend === 'down') return 'Declining vs last week';
    return 'Holding steady';
  }

  // ── Q3 Outlook ───────────────────────────────────────────────
  const mitsForOutlook = deptMits || [];
  type Verdict = { id: string; title: string; department: string; reason: string };
  const atRiskList: Verdict[] = [];
  let onTrackCount = 0;
  mitsForOutlook.forEach((m) => {
    if (m.current_status === 'complete') return;
    const isBlocked = m.current_status === 'blocked';
    const isAtRisk = m.current_status === 'at_risk';
    const isStalled = m.current_status === 'not_started' && weekNumber >= 3;
    if (isBlocked || isAtRisk || isStalled) {
      atRiskList.push({
        id: m.id, title: m.title, department: m.department,
        reason: isBlocked ? 'blocked' : isStalled ? 'not started' : 'at risk',
      });
    } else {
      onTrackCount++;
    }
  });
  const outlookPct = totalMits > 0 ? Math.round((completeMits / totalMits) * 100) : 0;

  return (
    <div className="space-y-6 max-w-5xl">

      {/* ── Milestone Review Banner ── */}
      {isMonthEndWeek && monthMilestones.length > 0 && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 px-4 py-4">
          <div className="flex items-start gap-3">
            <CalendarCheck className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                {activeMonth} milestone review — final week
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                {completedMilestones.length} of {monthMilestones.length} milestone{monthMilestones.length !== 1 ? 's' : ''} marked complete.
                {completedMilestones.length < monthMilestones.length && ' Review and update before the month closes.'}
              </p>
              <div className="mt-3 space-y-1.5">
                {monthMilestones.map((ms) => {
                  const mit = mitMap.get(ms.department_mit_id);
                  const isComplete = ms.status === 'complete';
                  return (
                    <Link key={ms.id} to={mit ? `/mit/${mit.id}` : '#'} className="flex items-center gap-2 group">
                      <span className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: isComplete ? 'hsl(142 71% 38%)' : 'hsl(38 92% 46%)' }} />
                      <span className="text-xs text-amber-800 dark:text-amber-300 group-hover:underline truncate">
                        {mit?.department && <span className="font-medium">{mit.department} · </span>}
                        {ms.description || mit?.title}
                      </span>
                      {isComplete && <span className="text-[10px] text-emerald-600 dark:text-emerald-400 shrink-0">Done</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 1. Quarter Pulse ── */}
      <Card>
        <CardContent className="pt-6 pb-5">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h1 className="text-lg font-semibold tracking-tight">{CONFIG.quarter.label}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Week {weekNumber} of {CONFIG.quarter.totalWeeks} · {activeMonth} milestone
              </p>
            </div>
            {openBlockers && openBlockers.length > 0 && (
              <button
                onClick={() => navigate('/blockers')}
                className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-2.5 py-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-950/60 transition-colors"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                {openBlockers.length} open blocker{openBlockers.length !== 1 ? 's' : ''}
              </button>
            )}
          </div>

          <div className="grid grid-cols-4 gap-6 mb-5 pb-5 border-b border-border/60">
            <StatChip label="Total MITs" value={totalMits} />
            <StatChip label="Complete" value={completeMits} accent="green" />
            <StatChip label="At Risk" value={atRiskMits} accent="yellow" />
            <StatChip label="Blocked" value={blockedMits} accent="red" />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Quarter progress</span>
              <span className="text-xs font-medium tabular-nums">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
            <div className="flex justify-between text-[11px] text-muted-foreground/70">
              <span>Jul 1</span>
              <span>Aug</span>
              <span>Sep 30</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── 2. Latest AI Rollup ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
            Latest Rollup
          </h2>
          {latestSnap && (
            <Link to="/rollups" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              Week {latestSnap.week_number} · View all <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
        <Card>
          <CardContent className="pt-5 pb-5">
            {latestSnap ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Week {latestSnap.week_number} Executive Summary</span>
                  <span className={`ml-1 text-[11px] font-medium px-1.5 py-0.5 rounded-full ${
                    latestSnap.overall_status === 'green'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                      : latestSnap.overall_status === 'red'
                      ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                  }`}>
                    {latestSnap.overall_status === 'green' ? 'On Track' : latestSnap.overall_status === 'red' ? 'At Risk' : 'Watch'}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-foreground/90">{latestSnap.summary}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No rollup generated yet.{' '}
                <Link to="/rollups" className="underline underline-offset-2 hover:text-foreground transition-colors">Go to Rollups →</Link>
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── 3. Department Scorecard ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
            Department Scorecard
          </h2>
          <span className="text-sm tabular-nums">
            <span className={
              checkedInDepts.size === DEPARTMENTS.length ? 'text-emerald-600 dark:text-emerald-400 font-semibold' :
              checkedInDepts.size >= DEPARTMENTS.length * 0.6 ? 'text-amber-600 dark:text-amber-400 font-semibold' :
              'text-red-600 dark:text-red-400 font-semibold'
            }>
              {checkedInDepts.size}
            </span>
            <span className="text-muted-foreground"> / {DEPARTMENTS.length} checked in</span>
          </span>
        </div>
        <Card>
          <CardContent className="pt-0 pb-0 divide-y divide-border/60">
            {DEPARTMENTS.map((dept) => {
              const mits = deptMits?.filter((d) => d.department === dept) || [];
              const color = DEPARTMENT_COLORS[dept as Department];
              const checked = checkedInDepts.has(dept);
              const { trend, summary } = deptAnalysis[dept] ?? { trend: null, summary: '' };
              return (
                <Link key={dept} to={`/department/${dept}`}>
                  <div className="px-4 py-3 hover:bg-muted/40 transition-colors group">
                    <div className="flex items-center gap-3">
                      {/* Dept label */}
                      <div className="flex items-center gap-2 w-28 shrink-0">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-sm font-medium truncate">{dept}</span>
                      </div>

                      {/* MIT dots */}
                      <div className="flex gap-1 flex-1 min-w-0">
                        {mits.length > 0 ? (
                          mits.map((mit) => <MitDot key={mit.id} mit={mit} />)
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No MITs</span>
                        )}
                      </div>

                      {/* Check-in status */}
                      <div className="shrink-0">
                        {checked ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-muted-foreground/30" />
                        )}
                      </div>

                      <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
                    </div>
                    <TrendLine trend={trend} summary={summary} />
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5 px-1">
          {[
            { label: 'Complete', color: 'hsl(142 71% 38%)' },
            { label: 'In Progress', color: 'hsl(221 83% 53%)' },
            { label: 'At Risk', color: 'hsl(38 92% 46%)' },
            { label: 'Blocked', color: 'hsl(0 72% 51%)' },
            { label: 'Not Started', color: 'hsl(240 5% 75%)' },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: color }} />
              <span className="text-[11px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── 4. Check-in Pulse ── */}
      <CheckInPulse weekNumber={weekNumber} checkedInDepts={checkedInDepts} />

      {/* ── 5. Q3 Outlook ── */}
      {mitsForOutlook.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            Q3 Outlook
          </h2>
          <Card>
            <CardContent className="pt-5 pb-5 space-y-4">
              <div className="grid grid-cols-3 gap-6">
                <StatChip label="On Track" value={onTrackCount} accent="green" />
                <StatChip label="Needs Attention" value={atRiskList.length} accent={atRiskList.length > 0 ? 'red' : 'default'} />
                <StatChip label="Complete" value={`${outlookPct}%`} accent={outlookPct >= 50 ? 'green' : 'yellow'} />
              </div>
              {atRiskList.length > 0 && (
                <div className="border-t border-border/60 pt-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Needs Attention</p>
                  {atRiskList.map((m) => (
                    <Link key={m.id} to={`/mit/${m.id}`} className="flex items-center gap-3 group">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: DEPARTMENT_COLORS[m.department as Department] }} />
                      <span className="text-sm font-medium flex-1 truncate group-hover:underline">{m.title}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{m.department}</span>
                      <span className="text-[11px] text-red-500 dark:text-red-400 shrink-0">{m.reason}</span>
                    </Link>
                  ))}
                </div>
              )}
              {atRiskList.length === 0 && (
                <p className="text-sm text-emerald-600 dark:text-emerald-400">All active MITs are on track.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}
