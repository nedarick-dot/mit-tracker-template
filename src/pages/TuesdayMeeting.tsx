import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDepartmentMits, useAllBlockers, useMonthlyMilestones, useDailyInputs } from '@/hooks/use-mit-data';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DEPARTMENT_COLORS, DEPARTMENTS, getStatusColor, getStatusLabel,
  getCurrentWeekNumber, getActiveMonth, getWeekDateRangeStrings,
  type Department,
} from '@/lib/constants';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, CalendarClock, Clock } from 'lucide-react';

const SEVERITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

function MitAgendaCard({ mit, latestInput }: { mit: any; latestInput?: any }) {
  const isBlocked = mit.current_status === 'blocked';
  const isAtRisk  = mit.current_status === 'at_risk';
  const statusColor = getStatusColor(mit.current_status);

  // Extract confidence from notes field
  const confidenceRaw = latestInput?.notes?.match(/confidence:(\w+)/)?.[1];
  const confidence = confidenceRaw as 'confident' | 'shaky' | 'off_track' | undefined;
  const confidenceLabel = confidence === 'off_track' ? 'Off Track' : confidence === 'shaky' ? 'Shaky' : null;

  return (
    <Link to={`/mit/${mit.id}`}>
      <div className="flex items-start gap-4 px-5 py-4 hover:bg-muted/30 transition-colors group rounded-lg">
        {/* Status stripe */}
        <div
          className="w-1 self-stretch rounded-full shrink-0 mt-0.5"
          style={{ backgroundColor: statusColor }}
        />
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3 mb-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: DEPARTMENT_COLORS[mit.department as Department] }}
              />
              <p className="text-xs text-muted-foreground shrink-0">{mit.department}</p>
              <span className="text-muted-foreground/40 text-xs">·</span>
              <p className="text-sm font-semibold truncate">{mit.title}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {confidenceLabel && (
                <Badge
                  variant="outline"
                  className={`text-[10px] ${confidence === 'off_track' ? 'border-red-400 text-red-600 dark:text-red-400' : 'border-amber-400 text-amber-600 dark:text-amber-400'}`}
                >
                  {confidenceLabel}
                </Badge>
              )}
              <Badge
                className="text-[10px]"
                style={{ backgroundColor: statusColor, color: 'white', border: 'none' }}
              >
                {getStatusLabel(mit.current_status)}
              </Badge>
            </div>
          </div>

          {/* Latest check-in text */}
          {latestInput?.update_text ? (
            <p className="text-sm text-foreground/80 leading-relaxed line-clamp-2">
              {latestInput.update_text}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground italic">No check-in this week</p>
          )}

          {/* Blocker text if any */}
          {latestInput?.blockers && (
            <div className="flex items-start gap-1.5 mt-2 text-xs text-red-600 dark:text-red-400">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{latestInput.blockers}</span>
            </div>
          )}

          {mit.owner && (
            <p className="text-xs text-muted-foreground mt-2">{mit.owner}</p>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors shrink-0 mt-1" />
      </div>
    </Link>
  );
}

function SectionHeader({ title, count, accent }: { title: string; count: number; accent: string }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <h2 className={`text-xs font-semibold uppercase tracking-widest ${accent}`}>{title}</h2>
      <span className="text-xs text-muted-foreground tabular-nums">{count} item{count !== 1 ? 's' : ''}</span>
    </div>
  );
}

export default function TuesdayMeeting() {
  const weekNumber = getCurrentWeekNumber();
  const activeMonth = getActiveMonth();
  const { startStr, endStr } = getWeekDateRangeStrings(weekNumber);

  const { data: allMits, isLoading: mitsLoading } = useDepartmentMits();
  const { data: openBlockers, isLoading: blockersLoading } = useAllBlockers(['open', 'in_progress']);
  const { data: milestones } = useMonthlyMilestones();
  const { data: allInputs } = useDailyInputs();
  const [showGreen, setShowGreen] = useState(false);

  const isLoading = mitsLoading || blockersLoading;

  // Latest check-in per MIT this week
  const latestInputByMit = (allInputs || [])
    .filter((i) => i.input_date >= startStr && i.input_date <= endStr)
    .reduce((acc, i) => {
      const existing = acc[i.department_mit_id];
      if (!existing || i.input_date > existing.input_date) acc[i.department_mit_id] = i;
      return acc;
    }, {} as Record<string, any>);

  // Classify MITs
  const flaggedMits = (allMits || []).filter(
    (m) => m.current_status === 'blocked' || m.current_status === 'at_risk'
  );

  // MITs with shaky/off_track confidence this week (not already flagged by status)
  const confidenceFlaggedMits = (allMits || []).filter((m) => {
    if (m.current_status === 'blocked' || m.current_status === 'at_risk') return false;
    const inp = latestInputByMit[m.id];
    const confidence = inp?.notes?.match(/confidence:(\w+)/)?.[1];
    return confidence === 'shaky' || confidence === 'off_track';
  });

  const greenMits = (allMits || []).filter(
    (m) => m.current_status === 'complete' || m.current_status === 'in_progress' || m.current_status === 'not_started'
  ).filter((m) => {
    const inp = latestInputByMit[m.id];
    const confidence = inp?.notes?.match(/confidence:(\w+)/)?.[1];
    return confidence !== 'shaky' && confidence !== 'off_track';
  });

  // At-risk milestones
  const riskMilestones = (milestones || []).filter(
    (ms) => ms.month === activeMonth && (ms.status === 'at_risk' || ms.status === 'blocked')
  );

  // Sort blockers by severity
  const sortedBlockers = [...(openBlockers || [])].sort(
    (a, b) => (SEVERITY_ORDER[a.severity || 'low'] ?? 3) - (SEVERITY_ORDER[b.severity || 'low'] ?? 3)
  );

  const needsDiscussion = flaggedMits.length + confidenceFlaggedMits.length + sortedBlockers.length + riskMilestones.length;

  // Missing check-ins this week
  const mitToDept = new Map((allMits || []).map((m) => [m.id, m.department]));
  const checkedInDepts = new Set<string>();
  (allInputs || [])
    .filter((i) => i.input_date >= startStr && i.input_date <= endStr)
    .forEach((i) => {
      const dept = mitToDept.get(i.department_mit_id);
      if (dept) checkedInDepts.add(dept);
    });
  const missingDepts = DEPARTMENTS.filter((d) => !checkedInDepts.has(d));

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <CalendarClock className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Monday Meeting</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Week {weekNumber} · {needsDiscussion} item{needsDiscussion !== 1 ? 's' : ''} need{needsDiscussion === 1 ? 's' : ''} discussion
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs">11:00 am PT</Badge>
      </div>

      {/* ── Missing check-ins alert ── */}
      {!isLoading && missingDepts.length > 0 && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
          <div className="flex items-start gap-2.5">
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                {missingDepts.length} department{missingDepts.length !== 1 ? 's' : ''} haven't submitted this week
              </p>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {missingDepts.map((d) => (
                  <span key={d} className="flex items-center gap-1.5 text-xs text-amber-800 dark:text-amber-300">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: DEPARTMENT_COLORS[d as Department] }} />
                    {d}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <>
          {/* ── Blocked & At Risk MITs ── */}
          {flaggedMits.length > 0 && (
            <div>
              <SectionHeader
                title="Blocked & At Risk"
                count={flaggedMits.length}
                accent="text-red-600 dark:text-red-400"
              />
              <Card>
                <CardContent className="pt-0 pb-0 divide-y divide-border/60">
                  {flaggedMits.map((mit) => (
                    <MitAgendaCard key={mit.id} mit={mit} latestInput={latestInputByMit[mit.id]} />
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Confidence flags (shaky/off-track but not yet status-flagged) ── */}
          {confidenceFlaggedMits.length > 0 && (
            <div>
              <SectionHeader
                title="Low Confidence — Team Flagged"
                count={confidenceFlaggedMits.length}
                accent="text-amber-600 dark:text-amber-400"
              />
              <Card>
                <CardContent className="pt-0 pb-0 divide-y divide-border/60">
                  {confidenceFlaggedMits.map((mit) => (
                    <MitAgendaCard key={mit.id} mit={mit} latestInput={latestInputByMit[mit.id]} />
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Open Blockers ── */}
          {sortedBlockers.length > 0 && (
            <div>
              <SectionHeader
                title="Open Blockers"
                count={sortedBlockers.length}
                accent="text-foreground"
              />
              <Card>
                <CardContent className="pt-0 pb-0 divide-y divide-border/60">
                  {sortedBlockers.map((b: any) => (
                    <div key={b.id} className="flex items-start gap-4 px-5 py-4">
                      <AlertTriangle className={`h-4 w-4 shrink-0 mt-0.5 ${
                        b.severity === 'critical' ? 'text-red-600' :
                        b.severity === 'high' ? 'text-orange-500' :
                        'text-amber-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {b.department_mits?.department && (
                            <span
                              className="text-[10px] font-semibold px-1.5 py-0.5 rounded text-white"
                              style={{ backgroundColor: DEPARTMENT_COLORS[b.department_mits.department as Department] }}
                            >
                              {b.department_mits.department}
                            </span>
                          )}
                          <p className="text-xs text-muted-foreground truncate">{b.department_mits?.title}</p>
                          <Badge variant="outline" className="text-[10px] ml-auto">{b.severity}</Badge>
                        </div>
                        <p className="text-sm leading-relaxed">{b.description}</p>
                        {b.reported_by && (
                          <p className="text-xs text-muted-foreground mt-1">Reported by {b.reported_by}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Milestone Risk ── */}
          {riskMilestones.length > 0 && (
            <div>
              <SectionHeader
                title={`${activeMonth} Milestones at Risk`}
                count={riskMilestones.length}
                accent="text-amber-600 dark:text-amber-400"
              />
              <Card>
                <CardContent className="pt-0 pb-0 divide-y divide-border/60">
                  {riskMilestones.map((ms: any) => {
                    const mit = (allMits || []).find((m) => m.id === ms.department_mit_id);
                    return (
                      <div key={ms.id} className="flex items-center gap-4 px-5 py-3.5">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: ms.status === 'blocked' ? 'hsl(0 72% 51%)' : 'hsl(38 92% 46%)' }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">{mit?.department} · {mit?.title}</p>
                          <p className="text-sm">{ms.description}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {ms.status === 'blocked' ? 'Off Track' : 'Shaky'}
                        </Badge>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Nothing flagged ── */}
          {needsDiscussion === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                <p className="text-sm font-medium">Nothing needs discussion</p>
                <p className="text-xs text-muted-foreground mt-1">
                  All MITs are on track this week. Short meeting.
                </p>
              </CardContent>
            </Card>
          )}

          {/* ── On Track (collapsible) ── */}
          {greenMits.length > 0 && (
            <div>
              <button
                onClick={() => setShowGreen((v) => !v)}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
              >
                {showGreen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                <span className="font-semibold uppercase tracking-widest">On Track</span>
                <span>— {greenMits.length} MIT{greenMits.length !== 1 ? 's' : ''}</span>
              </button>
              {showGreen && (
                <Card className="mt-2">
                  <CardContent className="pt-0 pb-0 divide-y divide-border/60">
                    {greenMits.map((mit) => (
                      <Link key={mit.id} to={`/mit/${mit.id}`}>
                        <div className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: DEPARTMENT_COLORS[mit.department as Department] }}
                          />
                          <span className="text-xs text-muted-foreground shrink-0">{mit.department}</span>
                          <span className="text-sm flex-1 truncate">{mit.title}</span>
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {getStatusLabel(mit.current_status)}
                          </Badge>
                        </div>
                      </Link>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
