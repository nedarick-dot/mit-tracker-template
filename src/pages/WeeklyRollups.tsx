import { useWeeklyRollups } from '@/hooks/use-mit-data';
import WeekDayStrip from '@/components/WeekDayStrip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import {
  getCurrentWeekNumber,
  getActiveMonth,
  DEPARTMENTS,
  DEPARTMENT_COLORS,
  type Department,
} from '@/lib/constants';
import { RefreshCw, Pencil, Check, X, ArrowLeft, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MitStatusEntry {
  department: string;
  mit_title: string;
  status: string;
  brief_update: string;
}

interface LookSection {
  general_progress?: string;
  key_decisions?: string;
  areas_of_challenge?: string;
  top_priorities?: string;
  roadblocks_to_alleviate?: string;
  upcoming_decisions?: string;
}

function parseStructured(raw: string | null): { look_back?: LookSection; look_ahead?: LookSection; mit_status?: MitStatusEntry[] } | null {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function StatusBadge({ status }: { status: string }) {
  const color = status === 'complete' || status === 'green' ? 'bg-green-600'
    : status === 'blocked' || status === 'red' ? 'bg-destructive'
    : status === 'at_risk' || status === 'yellow' ? 'bg-yellow-500'
    : status === 'in_progress' ? 'bg-blue-500'
    : 'bg-gray-400';
  const label = status === 'not_started' ? 'Not Started'
    : status === 'in_progress' ? 'In Progress'
    : status === 'at_risk' ? 'At Risk'
    : status === 'blocked' ? 'Blocked'
    : status === 'complete' ? 'Complete'
    : status;
  return <Badge className={`${color} text-white text-xs`}>{label}</Badge>;
}

function EditableField({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!editing) {
    return (
      <div className="group relative">
        <p className="text-sm whitespace-pre-wrap">{value || <span className="text-muted-foreground italic">No content</span>}</p>
        <Button size="sm" variant="ghost" className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 h-6 w-6 p-0" onClick={() => { setDraft(value); setEditing(true); }}>
          <Pencil className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} />
      <div className="flex gap-1">
        <Button size="sm" className="h-7 gap-1" onClick={() => { onSave(draft); setEditing(false); }}>
          <Check className="h-3 w-3" /> Save
        </Button>
        <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => setEditing(false)}>
          <X className="h-3 w-3" /> Cancel
        </Button>
      </div>
    </div>
  );
}

function DeptRollupSection({
  dept,
  rollup,
  weekNum,
  onGenerate,
  generating,
  onUpdateStructured,
}: {
  dept: Department;
  rollup: any | null;
  weekNum: number;
  onGenerate: () => void;
  generating: boolean;
  onUpdateStructured: (id: string, structured: any) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const structured = rollup ? parseStructured(rollup.status_assessment) : null;
  const lookBack = structured?.look_back || {};
  const lookAhead = structured?.look_ahead || {};
  const mitStatuses = structured?.mit_status || [];
  const isEdited = rollup?.themes === '__edited__';

  const rollupStatus = !rollup ? 'not_generated' : isEdited ? 'edited' : 'ai_draft';

  const statusLabel = {
    not_generated: { text: 'Not Generated', variant: 'outline' as const },
    ai_draft: { text: '🤖 AI Draft', variant: 'secondary' as const },
    edited: { text: '✏️ Team Edited', variant: 'default' as const },
  }[rollupStatus];

  const updateField = (section: 'look_back' | 'look_ahead', key: string, value: string) => {
    if (!rollup) return;
    const updated = {
      ...structured,
      [section]: { ...(structured?.[section] || {}), [key]: value },
    };
    onUpdateStructured(rollup.id, updated);
  };

  return (
    <Card className="border-l-4" style={{ borderLeftColor: DEPARTMENT_COLORS[dept] }}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span
                className="inline-block w-3 h-3 rounded-full"
                style={{ backgroundColor: DEPARTMENT_COLORS[dept] }}
              />
              {dept}
            </CardTitle>
            <Badge variant={statusLabel.variant} className="text-xs">{statusLabel.text}</Badge>
            {mitStatuses.length > 0 && (
              <span className="text-xs">
                {mitStatuses.some((m: MitStatusEntry) => m.status === 'red') ? '🔴' : mitStatuses.every((m: MitStatusEntry) => m.status === 'green') ? '🟢' : '🟡'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onGenerate}
              disabled={generating}
              className="gap-1.5 text-xs h-8"
            >
              <RefreshCw className={`h-3 w-3 ${generating ? 'animate-spin' : ''}`} />
              {generating ? 'Generating...' : rollup ? 'Regenerate' : 'Generate Rollup'}
            </Button>
            {rollup && (
              <Button size="sm" variant="ghost" onClick={() => setExpanded(!expanded)} className="h-8 w-8 p-0">
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>
        {/* Summary preview when collapsed */}
        {rollup && !expanded && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {lookBack.general_progress || rollup.summary || 'Rollup generated — expand to review.'}
          </p>
        )}
      </CardHeader>

      {rollup && expanded && (
        <CardContent className="space-y-4 pt-0">
          {/* Look-Back */}
          <div className="space-y-3 rounded-lg bg-muted/30 p-4">
            <p className="text-xs font-semibold flex items-center gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" /> Look-Back (Last Week)
            </p>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">General Progress</p>
              <EditableField value={lookBack.general_progress || ''} onSave={(v) => updateField('look_back', 'general_progress', v)} />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Key Decisions Made / Executed</p>
              <EditableField value={lookBack.key_decisions || ''} onSave={(v) => updateField('look_back', 'key_decisions', v)} />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Areas of Challenge</p>
              <EditableField value={lookBack.areas_of_challenge || ''} onSave={(v) => updateField('look_back', 'areas_of_challenge', v)} />
            </div>
          </div>

          {/* Look-Ahead */}
          <div className="space-y-3 rounded-lg bg-muted/30 p-4">
            <p className="text-xs font-semibold flex items-center gap-1.5">
              <ArrowRight className="h-3.5 w-3.5" /> Look-Ahead (Next Week)
            </p>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Top Priorities</p>
              <EditableField value={lookAhead.top_priorities || ''} onSave={(v) => updateField('look_ahead', 'top_priorities', v)} />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Roadblocks to Alleviate</p>
              <EditableField value={lookAhead.roadblocks_to_alleviate || ''} onSave={(v) => updateField('look_ahead', 'roadblocks_to_alleviate', v)} />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Upcoming Decisions</p>
              <EditableField value={lookAhead.upcoming_decisions || ''} onSave={(v) => updateField('look_ahead', 'upcoming_decisions', v)} />
            </div>
          </div>

          {/* MIT Status */}
          {mitStatuses.length > 0 && (
            <div className="rounded-lg bg-muted/30 p-4">
              <p className="text-xs font-semibold mb-2">MIT Status (Q3 2026)</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-1.5 text-xs text-muted-foreground font-medium">MIT</th>
                    <th className="text-center p-1.5 text-xs text-muted-foreground font-medium">Status</th>
                    <th className="text-left p-1.5 text-xs text-muted-foreground font-medium">Update</th>
                  </tr>
                </thead>
                <tbody>
                  {mitStatuses.map((m: MitStatusEntry, i: number) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="p-1.5 font-medium">{m.mit_title}</td>
                      <td className="p-1.5 text-center"><StatusBadge status={m.status} /></td>
                      <td className="p-1.5 text-muted-foreground">{m.brief_update}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function WeeklyRollups() {
  const { data: rollups, isLoading } = useWeeklyRollups();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [generatingDept, setGeneratingDept] = useState<string | null>(null);
  const currentWeek = getCurrentWeekNumber();
  const [selectedWeek, setSelectedWeek] = useState(String(currentWeek));
  const weekNum = parseInt(selectedWeek);

  const handleGenerateDept = async (dept: string) => {
    setGeneratingDept(dept);
    try {
      const { data, error } = await supabase.functions.invoke('generate-rollup', {
        body: { department: dept, week_number: weekNum },
      });
      if (error) throw error;
      toast({ title: `${dept} rollup generated`, description: `Week ${data?.week_number}` });
      queryClient.invalidateQueries({ queryKey: ['weekly_rollups'] });
      // Also refresh the leadership executive snapshot for that week
      await supabase.functions.invoke('generate-executive-snapshot', { body: { week_number: weekNum } });
      queryClient.invalidateQueries({ queryKey: ['executive_rollup_snapshots'] });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to generate rollup', variant: 'destructive' });
    }
    setGeneratingDept(null);
  };

  const handleUpdateStructured = async (id: string, structured: any) => {
    const { error } = await supabase
      .from('weekly_rollups')
      .update({
        status_assessment: JSON.stringify(structured),
        summary: structured.look_back?.general_progress || null,
        themes: '__edited__',
        blockers_summary: structured.look_back?.areas_of_challenge || null,
      } as any)
      .eq('id', id);
    if (error) {
      toast({ title: 'Error saving', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Rollup updated' });
      queryClient.invalidateQueries({ queryKey: ['weekly_rollups'] });
    }
  };

  const weekRollups = useMemo(
    () => (rollups || []).filter((r) => r.week_number === weekNum),
    [rollups, weekNum]
  );

  const getRollupForDept = (dept: string) =>
    weekRollups.find((r) => r.department === dept) || null;

  if (isLoading) {
    return <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Weekly Rollups</h1>
          <p className="text-sm text-muted-foreground">
            Department-first · Week {currentWeek} · {getActiveMonth()} milestone
          </p>
          <div className="mt-1"><WeekDayStrip compact /></div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <label className="text-xs font-medium text-muted-foreground">Generate rollup for</label>
          <Select value={selectedWeek} onValueChange={setSelectedWeek}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Array.from({ length: 13 }, (_, i) => i + 1).map((w) => (
                <SelectItem key={w} value={String(w)}>
                  Week {w}{w === currentWeek ? ' (current)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {weekNum !== currentWeek && (
            <Badge variant="secondary" className="text-[10px]">Backfilling Week {weekNum}</Badge>
          )}
        </div>
      </div>

      {/* Department rollup cards */}
      <div className="space-y-4">
        {DEPARTMENTS.map((dept) => (
          <DeptRollupSection
            key={dept}
            dept={dept}
            rollup={getRollupForDept(dept)}
            weekNum={weekNum}
            onGenerate={() => handleGenerateDept(dept)}
            generating={generatingDept === dept}
            onUpdateStructured={handleUpdateStructured}
          />
        ))}
      </div>
    </div>
  );
}
