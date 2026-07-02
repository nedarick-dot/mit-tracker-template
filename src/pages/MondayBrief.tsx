import { Link } from 'react-router-dom';
import {
  useExecutiveSnapshots,
  useAllBlockers,
  useDepartmentMits,
  useDailyInputs,
} from '@/hooks/use-mit-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CalendarClock,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Zap,
  FileText,
} from 'lucide-react';
import {
  getCurrentWeekNumber,
  getActiveMonth,
  getWeekDateRangeStrings,
  DEPARTMENTS,
  DEPARTMENT_COLORS,
  getStatusColor,
  getStatusLabel,
  type Department,
} from '@/lib/constants';

function splitBullets(text: string | null | undefined): string[] {
  if (!text) return [];
  return text.split('\n').map((s) => s.trim()).filter(Boolean);
}

function daysSince(dateStr: string): number {
  const created = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    critical: 'bg-red-600 text-white',
    high: 'bg-orange-500 text-white',
    medium: 'bg-yellow-500 text-white',
    low: 'bg-blue-500 text-white',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${colors[severity] ?? 'bg-muted text-foreground'}`}>
      {severity}
    </span>
  );
}

export default function MondayBrief() {
  const currentWeek = getCurrentWeekNumber();
  const activeMonth = getActiveMonth();
  const { startStr, endStr } = getWeekDateRangeStrings(currentWeek);

  const { data: snapshots, isLoading: snapshotsLoading } = useExecutiveSnapshots();
  const { data: allBlockers, isLoading: blockersLoading } = useAllBlockers(['open', 'in_progress']);
  const { data: departmentMits, isLoading: mitsLoading } = useDepartmentMits();
  const { data: dailyInputs, isLoading: inputsLoading } = useDailyInputs();

  const isLoading = snapshotsLoading || blockersLoading || mitsLoading || inputsLoading;

  // Latest snapshot
  const latestSnapshot = snapshots && snapshots.length > 0 ? snapshots[0] : null;

  // Urgent blockers: critical or high severity
  const urgentBlockers = (allBlockers || []).filter(
    (b) => b.severity === 'critical' || b.severity === 'high'
  );

  // Missing check-ins: build mitId→dept map, then find departments with no input this week
  const mitDeptMap: Record<string, string> = {};
  (departmentMits || []).forEach((m) => {
    mitDeptMap[m.id] = m.department;
  });

  const weekInputs = (dailyInputs || []).filter(
    (i) => i.input_date >= startStr && i.input_date <= endStr
  );

  const deptsWithInput = new Set<string>();
  weekInputs.forEach((i) => {
    const dept = mitDeptMap[i.department_mit_id];
    if (dept) deptsWithInput.add(dept);
  });

  const missingDepts = DEPARTMENTS.filter((d) => !deptsWithInput.has(d));

  // Flagged MITs: blocked or at_risk
  const flaggedMits = (departmentMits || []).filter(
    (m) => m.current_status === 'blocked' || m.current_status === 'at_risk'
  ).sort((a, b) => {
    if (a.current_status === 'blocked' && b.current_status !== 'blocked') return -1;
    if (b.current_status === 'blocked' && a.current_status !== 'blocked') return 1;
    return 0;
  });

  // Latest input per MIT
  const latestInputByMit: Record<string, string> = {};
  (dailyInputs || []).forEach((i) => {
    const existing = latestInputByMit[i.department_mit_id];
    if (!existing) {
      latestInputByMit[i.department_mit_id] = i.update_text;
    }
  });

  // Tuesday prep count: urgent blockers + flagged MITs + missing depts
  const tuesdayCount = urgentBlockers.length + flaggedMits.length + missingDepts.length;

  const overallStatus = latestSnapshot?.overall_status ?? null;
  const statusColor = overallStatus ? getStatusColor(overallStatus) : '#6b7280';

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarClock className="h-6 w-6 text-primary" />
          Monday Brief
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Week {currentWeek} · {activeMonth} · Prepare for Monday 11:00am
        </p>
      </div>

      {/* Section 1 — AI Executive Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            AI Executive Summary
            {latestSnapshot && (
              <span
                className="inline-block h-2.5 w-2.5 rounded-full ml-1"
                style={{ backgroundColor: statusColor }}
                title={getStatusLabel(overallStatus)}
              />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!latestSnapshot ? (
            <p className="text-sm text-muted-foreground">
              No brief generated yet — run Weekly Rollups first.
            </p>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Badge
                  className="text-xs"
                  style={{ backgroundColor: statusColor, color: 'white' }}
                >
                  {getStatusLabel(overallStatus)}
                </Badge>
                <span className="text-xs text-muted-foreground">Week {latestSnapshot.week_number}</span>
              </div>

              {latestSnapshot.summary && (
                <p className="text-sm leading-relaxed">{latestSnapshot.summary}</p>
              )}

              {splitBullets(latestSnapshot.key_wins as string).length > 0 && (
                <div>
                  <p className="text-xs font-semibold flex items-center gap-1 mb-1 text-green-700">
                    <TrendingUp className="h-3 w-3" /> Key Wins
                  </p>
                  <ul className="space-y-1">
                    {splitBullets(latestSnapshot.key_wins as string).map((w, i) => (
                      <li key={i} className="text-sm flex items-start gap-1.5">
                        <span className="text-green-500 mt-0.5 shrink-0">•</span>
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {splitBullets(latestSnapshot.key_risks as string).length > 0 && (
                <div>
                  <p className="text-xs font-semibold flex items-center gap-1 mb-1 text-red-700">
                    <AlertTriangle className="h-3 w-3" /> Key Risks
                  </p>
                  <ul className="space-y-1">
                    {splitBullets(latestSnapshot.key_risks as string).map((r, i) => (
                      <li key={i} className="text-sm flex items-start gap-1.5">
                        <span className="text-red-500 mt-0.5 shrink-0">•</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {splitBullets(latestSnapshot.recommendations as string).length > 0 && (
                <div>
                  <p className="text-xs font-semibold flex items-center gap-1 mb-1 text-blue-700">
                    <Zap className="h-3 w-3" /> Recommendations
                  </p>
                  <ul className="space-y-1">
                    {splitBullets(latestSnapshot.recommendations as string).map((rec, i) => (
                      <li key={i} className="text-sm flex items-start gap-1.5">
                        <span className="text-blue-500 mt-0.5 shrink-0">•</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Section 2 — Decisions Needed */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Decisions Needed
            <Badge variant="outline" className="ml-1">{urgentBlockers.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {urgentBlockers.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              No urgent decisions needed
            </div>
          ) : (
            <div className="space-y-3">
              {urgentBlockers.map((b) => {
                const dept = b.department_mits?.department ?? 'Unknown';
                const deptColor = DEPARTMENT_COLORS[dept as Department] ?? '#6b7280';
                const days = daysSince(b.created_at);
                return (
                  <div key={b.id} className="flex items-start gap-3 py-2 border-b last:border-0">
                    <SeverityBadge severity={b.severity} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span
                          className="inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: deptColor + '22', color: deptColor }}
                        >
                          {dept}
                        </span>
                        <span className="text-xs text-muted-foreground">by {b.reported_by}</span>
                        <span className="text-xs text-muted-foreground">· {days}d open</span>
                      </div>
                      <p className="text-sm">{b.description}</p>
                    </div>
                  </div>
                );
              })}
              <Link
                to="/blockers"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
              >
                View all blockers <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 3 — Missing Check-ins */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="h-4 w-4" />
            Check-in Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {missingDepts.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              All departments checked in this week
            </div>
          ) : (
            <div>
              <p className="text-sm text-amber-700 font-medium mb-2">
                {missingDepts.length} department{missingDepts.length !== 1 ? 's' : ''} missing check-ins this week:
              </p>
              <div className="flex flex-wrap gap-2">
                {missingDepts.map((dept) => {
                  const color = DEPARTMENT_COLORS[dept as Department] ?? '#6b7280';
                  return (
                    <span key={dept} className="inline-flex items-center gap-1.5 text-sm">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      {dept}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 4 — Flagged MITs */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Flagged MITs
            <Badge variant="outline" className="ml-1">{flaggedMits.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {flaggedMits.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              No flagged MITs
            </div>
          ) : (
            <div className="space-y-2">
              {flaggedMits.map((m) => {
                const deptColor = DEPARTMENT_COLORS[m.department as Department] ?? '#6b7280';
                const latestUpdate = latestInputByMit[m.id];
                return (
                  <Link
                    key={m.id}
                    to={`/mit/${m.id}`}
                    className="flex items-start gap-3 py-2 border-b last:border-0 hover:bg-muted/40 rounded px-1 -mx-1 transition-colors"
                  >
                    <Badge
                      className="text-xs shrink-0 mt-0.5"
                      style={{ backgroundColor: getStatusColor(m.current_status), color: 'white' }}
                    >
                      {getStatusLabel(m.current_status)}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: deptColor }} />
                        <span className="text-xs text-muted-foreground">{m.department}</span>
                      </div>
                      <p className="text-sm font-medium leading-snug">{m.title}</p>
                      {latestUpdate && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{latestUpdate}</p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 5 — Meeting Prep */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="font-semibold flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-primary" />
                Ready for Monday?
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {tuesdayCount === 0
                  ? 'Nothing flagged — clean meeting ahead.'
                  : `${tuesdayCount} item${tuesdayCount !== 1 ? 's' : ''} to discuss`}
              </p>
            </div>
            <Link
              to="/tuesday"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              Open Meeting View <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
