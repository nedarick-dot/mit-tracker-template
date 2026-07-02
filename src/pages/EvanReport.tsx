import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getCurrentWeekNumber, getStatusColor } from '@/lib/constants';
import { Copy, CheckCircle2, RefreshCw, MessageSquare, Loader2 } from 'lucide-react';

type ReportData = {
  week_number: number;
  date_range: string;
  narrative: {
    what_happened: string | null;
    wins: string[];
    problems_risks: string[];
    decisions_made: string[];
    help_needed: string[];
    priorities_next_week: string[];
  };
  mit_table: { department: string; title: string; owner: string | null; status: string }[];
  slack_message: string;
};

const STATUS_EMOJI: Record<string, string> = {
  complete: '🟢',
  in_progress: '🔵',
  at_risk: '🟡',
  blocked: '🔴',
  not_started: '⬜',
};

const STATUS_LABEL: Record<string, string> = {
  complete: 'Complete',
  in_progress: 'In Progress',
  at_risk: 'At Risk',
  blocked: 'Blocked',
  not_started: 'Not Started',
};

function SectionBlock({ emoji, title, items, accent }: {
  emoji: string;
  title: string;
  items: string[];
  accent: string;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className={`text-xs font-semibold uppercase tracking-widest mb-2 flex items-center gap-1.5 ${accent}`}>
        <span>{emoji}</span> {title}
      </p>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-foreground/90">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function EvanReport() {
  const { toast } = useToast();
  const weekNumber = getCurrentWeekNumber();
  const [report, setReport] = useState<ReportData | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-evan-report', {
        body: { week_number: weekNumber },
      });
      if (error) throw error;
      setReport(data as ReportData);
    } catch (e: any) {
      toast({ title: 'Error generating report', description: e.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!report) return;
    await navigator.clipboard.writeText(report.slack_message);
    setCopied(true);
    toast({ title: 'Copied — ready to paste into Slack' });
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Evan Report</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Week {weekNumber} update — ready to paste into Slack.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {report && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={handleCopy}>
              {copied
                ? <><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Copied</>
                : <><Copy className="h-4 w-4" /> Copy for Slack</>}
            </Button>
          )}
          <Button size="sm" className="gap-1.5" onClick={generate} disabled={generating}>
            {generating
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
              : report
                ? <><RefreshCw className="h-4 w-4" /> Regenerate</>
                : 'Generate Week ' + weekNumber + ' Report'}
          </Button>
        </div>
      </div>

      {!report && !generating && (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">No report generated yet</p>
            <p className="text-xs mt-1 max-w-xs mx-auto">
              Hit Generate to pull this week's check-ins, MIT statuses, and blockers into a Slack-ready update for Evan.
            </p>
            <Button size="sm" className="mt-4" onClick={generate}>
              Generate Week {weekNumber} Report
            </Button>
          </CardContent>
        </Card>
      )}

      {generating && (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin opacity-40" />
            <p className="text-sm">Pulling check-ins, MITs, and blockers…</p>
            <p className="text-xs mt-1">This takes 10–15 seconds.</p>
          </CardContent>
        </Card>
      )}

      {report && (
        <>
          {/* Header card */}
          <Card className="border-border/60">
            <CardContent className="py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Advisory Practice — Week {report.week_number} Update</p>
                <p className="text-xs text-muted-foreground">{report.date_range}</p>
              </div>
              <Button size="sm" variant="ghost" className="gap-1.5 text-xs" onClick={handleCopy}>
                {copied
                  ? <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Copied</>
                  : <><Copy className="h-3.5 w-3.5" /> Copy for Slack</>}
              </Button>
            </CardContent>
          </Card>

          {/* What happened */}
          <Card>
            <CardContent className="pt-5 pb-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                What Happened This Week
              </p>
              <p className="text-sm leading-relaxed text-foreground/90">
                {report.narrative.what_happened || '—'}
              </p>
            </CardContent>
          </Card>

          {/* Sections */}
          <Card>
            <CardContent className="pt-5 pb-5 space-y-6">
              <SectionBlock emoji="✅" title="Wins" items={report.narrative.wins} accent="text-emerald-600 dark:text-emerald-400" />
              <SectionBlock emoji="⚠️" title="Problems & Risks" items={report.narrative.problems_risks} accent="text-amber-600 dark:text-amber-400" />
              <SectionBlock emoji="🔑" title="Decisions Made" items={report.narrative.decisions_made} accent="text-blue-600 dark:text-blue-400" />
              <SectionBlock emoji="🙋" title="Help Needed" items={report.narrative.help_needed} accent="text-red-600 dark:text-red-400" />
              <SectionBlock emoji="🎯" title="Top Priorities Next Week" items={report.narrative.priorities_next_week} accent="text-foreground" />
            </CardContent>
          </Card>

          {/* MIT Status Snapshot */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              MIT Status Snapshot
            </p>
            <Card>
              <CardContent className="pt-0 pb-0 divide-y divide-border/60">
                {report.mit_table.map((m, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-base leading-none shrink-0">{STATUS_EMOJI[m.status] || '⬜'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.title}</p>
                      <p className="text-xs text-muted-foreground">{m.department}{m.owner ? ` · ${m.owner}` : ''}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[11px] shrink-0"
                      style={{ borderColor: getStatusColor(m.status), color: getStatusColor(m.status) }}
                    >
                      {STATUS_LABEL[m.status] || m.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Raw Slack preview */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Slack Preview
            </p>
            <Card className="bg-muted/30">
              <CardContent className="pt-4 pb-4">
                <pre className="text-xs text-foreground/80 whitespace-pre-wrap font-mono leading-relaxed">
                  {report.slack_message}
                </pre>
              </CardContent>
            </Card>
            <div className="flex justify-end mt-2">
              <Button size="sm" variant="outline" className="gap-1.5" onClick={handleCopy}>
                {copied
                  ? <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Copied</>
                  : <><Copy className="h-3.5 w-3.5" /> Copy for Slack</>}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
