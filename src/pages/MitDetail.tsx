import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import {
  useDepartmentMit, useApMits, useDailyInputs,
  useMonthlyMilestones, useBlockers, useMitStatusHistory,
} from '@/hooks/use-mit-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import {
  getStatusColor, getStatusLabel, getActiveMonth, getCurrentWeekNumber,
  getWeekDateRangeStrings, getMonthForWeek,
  getTodayFormatted, getTodayIso,
  DEPARTMENT_COLORS, type Department,
  MANUAL_STATUSES, STATUS_CONFIG,
} from '@/lib/constants';
import { ArrowLeft, Send, AlertTriangle, Shield, CheckCircle2, Calendar, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';

export default function MitDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: mit, isLoading } = useDepartmentMit(id!);
  const { data: apMits } = useApMits();
  const { data: dailyInputs } = useDailyInputs(id);
  const { data: milestones } = useMonthlyMilestones(id);
  const { data: blockers } = useBlockers(id);
  const { data: statusHistory } = useMitStatusHistory(id);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [updateText, setUpdateText] = useState('');
  const [whatCompleted, setWhatCompleted] = useState('');
  const [blockerText, setBlockerText] = useState('');
  const [keyDecisions, setKeyDecisions] = useState('');
  const [inputNotes, setInputNotes] = useState('');
  const [carryForward, setCarryForward] = useState(false);
  const [authorName, setAuthorName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showExtended, setShowExtended] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [newBlockerDesc, setNewBlockerDesc] = useState('');
  const [newBlockerSeverity, setNewBlockerSeverity] = useState('medium');
  const [newBlockerReporter, setNewBlockerReporter] = useState('');
  const [submittingBlocker, setSubmittingBlocker] = useState(false);

  if (isLoading) return <Skeleton className="h-96" />;
  if (!mit) return <p>MIT not found.</p>;

  const parentMit = apMits?.find((a) => a.id === mit.ap_mit_id);
  const activeMonth = getActiveMonth();
  const currentWeek = getCurrentWeekNumber();
  const today = getTodayIso();
  const openBlockers = blockers?.filter((b) => b.status !== 'resolved') || [];

  const activeMilestone = milestones?.find((m) => m.month === activeMonth);

  const handleSubmitInput = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateText.trim() || !authorName.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from('daily_inputs').insert({
      department_mit_id: mit.id,
      user_id: user?.id || null,
      author_name: authorName.trim(),
      update_text: updateText.trim(),
      what_completed: whatCompleted.trim() || null,
      blockers: blockerText.trim() || null,
      key_decisions: keyDecisions.trim() || null,
      notes: inputNotes.trim() || null,
      carry_forward: carryForward,
      milestone_id: activeMilestone?.id || null,
    } as any);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Update submitted' });
      setUpdateText(''); setWhatCompleted(''); setBlockerText('');
      setKeyDecisions(''); setInputNotes(''); setCarryForward(false);
      queryClient.invalidateQueries({ queryKey: ['daily_inputs'] });
    }
    setSubmitting(false);
  };

  const handleSubmitBlocker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlockerDesc.trim() || !newBlockerReporter.trim()) return;
    setSubmittingBlocker(true);
    const { error } = await supabase.from('blockers').insert({
      department_mit_id: mit.id,
      reported_by: newBlockerReporter.trim(),
      description: newBlockerDesc.trim(),
      severity: newBlockerSeverity,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Blocker reported' });
      setNewBlockerDesc('');
      queryClient.invalidateQueries({ queryKey: ['blockers'] });
    }
    setSubmittingBlocker(false);
  };

  const handleResolveBlocker = async (blockerId: string) => {
    await supabase.from('blockers').update({ status: 'resolved', resolved_at: new Date().toISOString() }).eq('id', blockerId);
    queryClient.invalidateQueries({ queryKey: ['blockers'] });
    toast({ title: 'Blocker resolved' });
  };

  // Group daily inputs by week
  const inputsByWeek: Record<number, typeof dailyInputs> = {};
  (dailyInputs || []).forEach((input) => {
    for (let w = 1; w <= 13; w++) {
      const { startStr, endStr } = getWeekDateRangeStrings(w);
      if (input.input_date >= startStr && input.input_date <= endStr) {
        if (!inputsByWeek[w]) inputsByWeek[w] = [];
        inputsByWeek[w]!.push(input);
        break;
      }
    }
  });

  // Today's inputs
  const todayInputs = (dailyInputs || []).filter((i) => i.input_date === today);

  return (
    <div className="space-y-6 max-w-4xl">
      <Link to={`/department/${mit.department}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to {mit.department}
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="mt-1 shrink-0">
          <Select
            value={mit.current_status || 'not_started'}
            onValueChange={async (val) => {
              const { error } = await supabase.from('department_mits').update({ current_status: val }).eq('id', mit.id);
              if (error) {
                toast({ title: 'Error', description: error.message, variant: 'destructive' });
              } else {
                toast({ title: `Status updated to ${getStatusLabel(val)}` });
                queryClient.invalidateQueries({ queryKey: ['department_mit', id] });
                queryClient.invalidateQueries({ queryKey: ['department_mits'] });
              }
            }}
          >
            <SelectTrigger className="w-auto border-0 p-0 h-auto shadow-none focus:ring-0">
              <span className="inline-block h-4 w-4 rounded-full" style={{ backgroundColor: getStatusColor(mit.current_status) }} />
            </SelectTrigger>
            <SelectContent>
              {MANUAL_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  <span className="flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: STATUS_CONFIG[s].color }} />
                    {STATUS_CONFIG[s].label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <h1 className="text-2xl font-bold">{mit.title}</h1>
          {mit.mit_statement && (
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{mit.mit_statement}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Calendar className="h-3 w-3" /> {getTodayFormatted()} · Week {currentWeek} · {activeMonth} milestone
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge style={{ backgroundColor: DEPARTMENT_COLORS[mit.department as Department], color: 'white' }}>{mit.department}</Badge>
            <Badge variant="outline">Owner: {mit.owner}</Badge>
            {parentMit && <Badge variant="secondary">AP MIT {parentMit.mit_number}</Badge>}
            {openBlockers.length > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" /> {openBlockers.length} blocker{openBlockers.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Status trend sparkline */}
      {statusHistory && statusHistory.length > 0 && (() => {
        const histByWeek = new Map(statusHistory.map((h) => [h.week_number, h.status]));
        const displayWeeks = Array.from({ length: currentWeek }, (_, i) => i + 1).slice(-10);
        return (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Status Trend</p>
            <div className="flex items-end gap-1.5">
              {displayWeeks.map((w) => {
                const s = histByWeek.get(w) ?? null;
                const isCurrent = w === currentWeek;
                return (
                  <div key={w} className="flex flex-col items-center gap-1">
                    <span
                      className={`h-3.5 w-3.5 rounded-sm transition-all ${isCurrent ? 'ring-2 ring-offset-1 ring-foreground/20' : ''}`}
                      style={{ backgroundColor: s ? getStatusColor(s) : 'hsl(240 5% 84%)' }}
                      title={`Week ${w}: ${s ?? 'no data'}`}
                    />
                    <span className="text-[9px] text-muted-foreground/60">{w}</span>
                  </div>
                );
              })}
              <span className="text-[10px] text-muted-foreground ml-1 mb-4">← W{currentWeek}</span>
            </div>
          </div>
        );
      })()}

      {/* Hypothesis & Problem */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mit.hypothesis && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Hypothesis</CardTitle></CardHeader>
            <CardContent className="text-sm">{mit.hypothesis}</CardContent>
          </Card>
        )}
        {mit.problem && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Problem</CardTitle></CardHeader>
            <CardContent className="text-sm">{mit.problem}</CardContent>
          </Card>
        )}
        {mit.inputs_activity && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Inputs / Activity</CardTitle></CardHeader>
            <CardContent className="text-sm">{mit.inputs_activity}</CardContent>
          </Card>
        )}
        {mit.outputs_results && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Outputs / Results</CardTitle></CardHeader>
            <CardContent className="text-sm">{mit.outputs_results}</CardContent>
          </Card>
        )}
      </div>

      {/* Green/Yellow/Red */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4">
            <p className="text-xs font-semibold text-green-800 mb-1">🟢 Green</p>
            <p className="text-sm text-green-700">{mit.green_definition}</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4">
            <p className="text-xs font-semibold text-yellow-800 mb-1">🟡 Yellow</p>
            <p className="text-sm text-yellow-700">{mit.yellow_definition}</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <p className="text-xs font-semibold text-red-800 mb-1">🔴 Red</p>
            <p className="text-sm text-red-700">{mit.red_definition}</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Milestones */}
      {milestones && milestones.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Monthly Milestones</h2>
          <div className="grid grid-cols-3 gap-3">
            {['July', 'August', 'September'].map((month) => {
              const ms = milestones.find((m) => m.month === month);
              const isActive = month === activeMonth;
              return (
                <Card key={month} className={isActive ? 'ring-2 ring-primary' : ''}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{month}</span>
                      {isActive && <Badge className="text-xs">Active</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{ms?.description || 'No milestone set'}</p>
                    {ms && (
                      <Badge variant="outline" className="mt-2 text-xs gap-1">
                        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: getStatusColor(ms.status) }} />
                        {getStatusLabel(ms.status)}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <Separator />

      {/* Open Blockers */}
      {openBlockers.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" /> Open Blockers
          </h2>
          <div className="space-y-2">
            {openBlockers.map((b) => (
              <Card key={b.id} className="border-destructive/30">
                <CardContent className="py-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="destructive" className="text-xs">{b.severity}</Badge>
                      <span className="text-xs text-muted-foreground">by {b.reported_by}</span>
                    </div>
                    <p className="text-sm">{b.description}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleResolveBlocker(b.id)} className="gap-1 shrink-0">
                    <CheckCircle2 className="h-3 w-3" /> Resolve
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Report Blocker */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Shield className="h-5 w-5" /> Report a Blocker
        </h2>
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmitBlocker} className="space-y-3">
              <div className="flex gap-3">
                <Input placeholder="Your name" value={newBlockerReporter} onChange={(e) => setNewBlockerReporter(e.target.value)} required className="flex-1" />
                <Select value={newBlockerSeverity} onValueChange={setNewBlockerSeverity}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Textarea placeholder="Describe the blocker..." value={newBlockerDesc} onChange={(e) => setNewBlockerDesc(e.target.value)} required rows={2} />
              <Button type="submit" variant="destructive" size="sm" disabled={submittingBlocker} className="gap-2">
                <AlertTriangle className="h-3 w-3" /> {submittingBlocker ? 'Reporting...' : 'Report Blocker'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Daily Input Form */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-semibold">Log Daily Input</h2>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            {showForm ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {showForm ? 'Hide form' : 'Log manual update ↓'}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mb-1">
          {getTodayFormatted()} — {todayInputs.length > 0 ? `${todayInputs.length} input${todayInputs.length !== 1 ? 's' : ''} already today` : 'No inputs yet today'}
        </p>
        {showForm && activeMilestone && (
          <p className="text-xs text-muted-foreground mb-3 bg-muted/50 rounded p-2">
            🎯 <strong>{activeMonth} milestone:</strong> {activeMilestone.description}
          </p>
        )}
        {showForm && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmitInput} className="space-y-3">
              <Input placeholder="Your name" value={authorName} onChange={(e) => setAuthorName(e.target.value)} required />
              <div>
                <Label className="text-xs text-muted-foreground">What was worked on *</Label>
                <Textarea placeholder="Describe what you worked on toward this MIT today..." value={updateText} onChange={(e) => setUpdateText(e.target.value)} required rows={3} />
              </div>
              <button
                type="button"
                onClick={() => setShowExtended(!showExtended)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showExtended ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {showExtended ? 'Show less' : 'Completions, decisions, blockers, notes...'}
              </button>
              {showExtended && (
                <div className="space-y-3 border-l-2 border-muted pl-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">What was completed</Label>
                    <Textarea placeholder="Anything finished or delivered?" value={whatCompleted} onChange={(e) => setWhatCompleted(e.target.value)} rows={1} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Blockers</Label>
                    <Textarea placeholder="Anything blocking progress?" value={blockerText} onChange={(e) => setBlockerText(e.target.value)} rows={1} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Key decisions</Label>
                    <Textarea placeholder="Any decisions made?" value={keyDecisions} onChange={(e) => setKeyDecisions(e.target.value)} rows={1} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Notes</Label>
                    <Textarea placeholder="Additional context..." value={inputNotes} onChange={(e) => setInputNotes(e.target.value)} rows={1} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={carryForward} onCheckedChange={setCarryForward} />
                    <Label className="text-xs">Carry forward to tomorrow</Label>
                  </div>
                </div>
              )}
              <Button type="submit" disabled={submitting} className="gap-2">
                <Send className="h-4 w-4" /> {submitting ? 'Submitting...' : 'Log Input'}
              </Button>
            </form>
          </CardContent>
        </Card>
        )}
      </div>

      {/* History grouped by week */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Input History by Week</h2>
        {Object.keys(inputsByWeek).length === 0 ? (
          <p className="text-sm text-muted-foreground">No inputs yet.</p>
        ) : (
          <div className="space-y-6">
            {Object.entries(inputsByWeek)
              .sort(([a], [b]) => Number(b) - Number(a))
              .map(([weekStr, inputs]) => {
                const w = Number(weekStr);
                const { startStr: ws, endStr: we } = getWeekDateRangeStrings(w);
                const isCurrentWeek = w === currentWeek;
                return (
                  <div key={w}>
                    <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Badge variant={isCurrentWeek ? 'default' : 'outline'} className="text-xs">
                        Week {w} · {getMonthForWeek(w)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(ws + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(we + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      <span className="text-xs text-muted-foreground">· {inputs?.length} input{inputs?.length !== 1 ? 's' : ''}</span>
                    </h3>
                    <div className="space-y-2 ml-2 border-l-2 border-muted pl-4">
                      {inputs?.map((input) => {
                        const inp = input as any;
                        return (
                          <Card key={input.id} className={`bg-muted/50 ${input.input_date === today ? 'ring-1 ring-primary/30' : ''}`}>
                            <CardContent className="pt-3 pb-3">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium">{input.author_name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(input.input_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                </span>
                                {input.input_date === today && <Badge className="text-[10px] px-1.5 py-0">Today</Badge>}
                                {inp.carry_forward && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5"><ArrowRight className="h-2.5 w-2.5" />Carry</Badge>
                                )}
                              </div>
                              <p className="text-sm">{input.update_text}</p>
                              {inp.what_completed && <p className="text-xs text-green-700 mt-1">✅ {inp.what_completed}</p>}
                              {input.blockers && <p className="text-xs text-destructive mt-1">⚠️ {input.blockers}</p>}
                              {inp.key_decisions && <p className="text-xs text-primary mt-1">🔑 {inp.key_decisions}</p>}
                              {inp.notes && <p className="text-xs text-muted-foreground mt-1">📝 {inp.notes}</p>}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
