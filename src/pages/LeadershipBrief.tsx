import { useState } from 'react';
import { useExecutiveSnapshots, useWeeklyRollups } from '@/hooks/use-mit-data';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { getCurrentWeekNumber } from '@/lib/constants';
import { Copy, FileText, CheckCircle2 } from 'lucide-react';

function Section({ title, content, accent }: { title: string; content: string | null; accent: string }) {
  if (!content) return null;
  return (
    <div>
      <p className={`text-xs font-semibold uppercase tracking-widest mb-2 ${accent}`}>{title}</p>
      <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/90">{content}</p>
    </div>
  );
}

export default function LeadershipBrief() {
  const { data: snapshots, isLoading } = useExecutiveSnapshots();
  const { data: rollups } = useWeeklyRollups();
  const { toast } = useToast();
  const currentWeek = getCurrentWeekNumber();
  const [copied, setCopied] = useState(false);

  const availableWeeks = [...new Set((snapshots || []).map((s) => s.week_number))].sort((a, b) => b - a);
  const [selectedWeek, setSelectedWeek] = useState<string>(
    availableWeeks.length > 0 ? String(availableWeeks[0]) : String(currentWeek)
  );

  const snap = (snapshots || []).find((s) => s.week_number === Number(selectedWeek));

  const formatAsMarkdown = () => {
    if (!snap) return '';
    const deptStatuses = snap.department_statuses
      ? Object.entries(snap.department_statuses as Record<string, any>)
          .map(([d, v]) => `- **${d}**: ${v.status ?? '—'}`)
          .join('\n')
      : '';

    return `# Advisory Practice — Q3 2026 Week ${snap.week_number} Leadership Update

**Overall Status:** ${snap.overall_status?.toUpperCase() ?? '—'}

## Executive Summary
${snap.summary ?? '—'}

## Key Wins
${snap.key_wins ?? '—'}

## Key Risks
${snap.key_risks ?? '—'}

## Recommendations
${snap.recommendations ?? '—'}
${deptStatuses ? `\n## Department Status\n${deptStatuses}` : ''}

---
*Generated from Q3 MIT Tracker · Advisory Practice*
`.trim();
  };

  const handleCopy = async () => {
    const text = formatAsMarkdown();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: 'Copied to clipboard' });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Leadership Brief</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Formatted weekly update ready to share.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {availableWeeks.length > 0 && (
            <Select value={selectedWeek} onValueChange={setSelectedWeek}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableWeeks.map((w) => (
                  <SelectItem key={w} value={String(w)}>
                    Week {w}{w === currentWeek ? ' (current)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={handleCopy}
            disabled={!snap}
          >
            {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy as Markdown'}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : !snap ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No executive snapshot generated yet.</p>
            <p className="text-xs mt-1">Generate a rollup from the Rollups page to create one.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Header block */}
          <Card className="border-border/60">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-base font-semibold">
                  Advisory Practice — Q3 2026 · Week {snap.week_number}
                </h2>
                <Badge
                  className={
                    snap.overall_status === 'green' ? 'bg-emerald-600 text-white' :
                    snap.overall_status === 'yellow' ? 'bg-amber-500 text-white' :
                    snap.overall_status === 'red' ? 'bg-red-600 text-white' :
                    'bg-muted text-muted-foreground'
                  }
                >
                  {snap.overall_status?.toUpperCase() ?? 'UNKNOWN'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {snap.snapshot_date ? new Date(snap.snapshot_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : ''}
              </p>
            </CardContent>
          </Card>

          {/* Content sections */}
          <Card>
            <CardContent className="pt-6 pb-6 space-y-6">
              <Section title="Executive Summary" content={snap.summary} accent="text-foreground" />
              <Section title="Key Wins" content={snap.key_wins} accent="text-emerald-600 dark:text-emerald-400" />
              <Section title="Key Risks" content={snap.key_risks} accent="text-amber-600 dark:text-amber-400" />
              <Section title="Recommendations" content={snap.recommendations} accent="text-blue-600 dark:text-blue-400" />
            </CardContent>
          </Card>

          {/* Department status row */}
          {snap.department_statuses && Object.keys(snap.department_statuses).length > 0 && (
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Department Status</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(snap.department_statuses as Record<string, any>).map(([dept, val]) => {
                    const status = val?.status ?? 'unknown';
                    const dot = status === 'green' ? 'hsl(142 71% 38%)' : status === 'red' ? 'hsl(0 72% 51%)' : 'hsl(38 92% 46%)';
                    return (
                      <div key={dept} className="flex items-center gap-1.5 text-xs bg-muted/50 px-2.5 py-1.5 rounded-md">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: dot }} />
                        <span className="font-medium">{dept}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
