import { useState, useEffect } from 'react';
import { useDepartmentMits, useMonthlyMilestones, useDailyInputs } from '@/hooks/use-mit-data';
import { useDepartmentPreference } from '@/hooks/use-department-preference';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import {
  DEPARTMENTS, DEPARTMENT_COLORS, getStatusColor,
  getCurrentWeekNumber, getActiveMonth, getWeekDateRangeStrings, getTodayIso,
  type Department,
} from '@/lib/constants';
import { CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

const NAME_KEY = 'q3_mit_author_name';

type Confidence = 'confident' | 'shaky' | 'off_track';
type MitForm = {
  update_text: string;
  has_blocker: boolean;
  blocker_text: string;
  confidence: Confidence | null;
  submitted: boolean;
};

const CONFIDENCE_OPTIONS: { value: Confidence; label: string; emoji: string; color: string }[] = [
  { value: 'confident', label: 'Confident',  emoji: '✅', color: 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' },
  { value: 'shaky',     label: 'Shaky',      emoji: '⚠️', color: 'border-amber-400 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300' },
  { value: 'off_track', label: 'Off Track',  emoji: '🔴', color: 'border-red-400 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300' },
];

const CONFIDENCE_MILESTONE_STATUS: Record<Confidence, string> = {
  confident: 'in_progress',
  shaky: 'at_risk',
  off_track: 'blocked',
};

export default function DailyInput() {
  const { dept, setDept } = useDepartmentPreference();
  const weekNumber = getCurrentWeekNumber();
  const activeMonth = getActiveMonth();
  const { startStr, endStr } = getWeekDateRangeStrings(weekNumber);

  const [authorName, setAuthorName] = useState(() => localStorage.getItem(NAME_KEY) || '');
  const [selectedDept, setSelectedDept] = useState<string>(dept || '');
  const [forms, setForms] = useState<Record<string, MitForm>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  const { data: mits, isLoading } = useDepartmentMits(selectedDept || undefined);
  const { data: milestones } = useMonthlyMilestones();
  const { data: allInputs } = useDailyInputs();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Persist name
  useEffect(() => {
    if (authorName.trim()) localStorage.setItem(NAME_KEY, authorName);
  }, [authorName]);

  // Sync dept selection → department preference
  const handleDeptChange = (d: string) => {
    setSelectedDept(d);
    setDept(d as Department || null);
  };

  const getForm = (mitId: string): MitForm =>
    forms[mitId] || { update_text: '', has_blocker: false, blocker_text: '', confidence: null, submitted: false };

  const setField = (mitId: string, field: keyof MitForm, value: any) =>
    setForms((prev) => ({ ...prev, [mitId]: { ...getForm(mitId), [field]: value } }));

  const alreadySubmittedThisWeek = (mitId: string) =>
    (allInputs || []).some(
      (i) => i.department_mit_id === mitId && i.input_date >= startStr && i.input_date <= endStr
    );

  const getMilestone = (mitId: string) =>
    milestones?.find((m) => m.department_mit_id === mitId && m.month === activeMonth);

  const handleSubmit = async (mitId: string) => {
    const form = getForm(mitId);
    if (!form.update_text.trim() || !authorName.trim()) return;
    setSubmitting(mitId);

    const milestone = getMilestone(mitId);

    const { error } = await supabase.from('daily_inputs').insert({
      department_mit_id: mitId,
      user_id: user?.id || null,
      author_name: authorName.trim(),
      update_text: form.update_text.trim(),
      blockers: form.has_blocker && form.blocker_text.trim() ? form.blocker_text.trim() : null,
      notes: form.confidence ? `confidence:${form.confidence}` : null,
      milestone_id: milestone?.id || null,
      input_date: getTodayIso(),
    } as any);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      setSubmitting(null);
      return;
    }

    // Update milestone status from confidence
    if (milestone && form.confidence) {
      await supabase
        .from('monthly_milestones')
        .update({ status: CONFIDENCE_MILESTONE_STATUS[form.confidence] })
        .eq('id', milestone.id);
    }

    // Auto-create blocker record if blocking
    if (form.has_blocker && form.blocker_text.trim()) {
      await supabase.from('blockers').insert({
        department_mit_id: mitId,
        description: form.blocker_text.trim(),
        severity: 'high',
        status: 'open',
        reported_by: authorName.trim(),
      } as any);
    }

    toast({ title: 'Check-in submitted' });
    setForms((prev) => ({ ...prev, [mitId]: { ...getForm(mitId), submitted: true } }));
    queryClient.invalidateQueries({ queryKey: ['daily_inputs'] });
    queryClient.invalidateQueries({ queryKey: ['monthly_milestones'] });
    queryClient.invalidateQueries({ queryKey: ['blockers'] });
    setSubmitting(null);
  };

  const deptMits = mits || [];
  const submitted = deptMits.filter((m) => alreadySubmittedThisWeek(m.id) || getForm(m.id).submitted);
  const allDone = deptMits.length > 0 && submitted.length === deptMits.length;

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Weekly Check-in</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Week {weekNumber} · Open Friday 5pm – Sunday 11:59pm
        </p>
      </div>

      {/* Identity row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Your Name</Label>
          <Input
            placeholder="First Last"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Department</Label>
          <Select value={selectedDept} onValueChange={handleDeptChange}>
            <SelectTrigger><SelectValue placeholder="Select your department" /></SelectTrigger>
            <SelectContent>
              {DEPARTMENTS.map((d) => (
                <SelectItem key={d} value={d}>
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: DEPARTMENT_COLORS[d as Department] }} />
                    {d}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* All done state */}
      {allDone && (
        <Card className="border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20">
          <CardContent className="py-5 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
            <div>
              <p className="text-sm font-medium">All MITs checked in for Week {weekNumber}</p>
              <p className="text-xs text-muted-foreground mt-0.5">You're done — see you next week.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* MIT cards */}
      {!selectedDept && (
        <p className="text-sm text-muted-foreground">Select your department to start your check-in.</p>
      )}

      {selectedDept && isLoading && <Skeleton className="h-48" />}

      {selectedDept && !isLoading && deptMits.length === 0 && (
        <p className="text-sm text-muted-foreground">No MITs assigned to {selectedDept} yet.</p>
      )}

      {selectedDept && !isLoading && deptMits.map((mit) => {
        const form = getForm(mit.id);
        const done = alreadySubmittedThisWeek(mit.id) || form.submitted;
        const milestone = getMilestone(mit.id);
        const canSubmit = form.update_text.trim().length > 0 && authorName.trim().length > 0;

        return (
          <Card
            key={mit.id}
            className={done ? 'border-emerald-200 dark:border-emerald-900 opacity-75' : ''}
          >
            <CardContent className="pt-5 pb-5 space-y-4">

              {/* MIT header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full mt-1 shrink-0"
                    style={{ backgroundColor: getStatusColor(mit.current_status) }}
                  />
                  <div>
                    <p className="text-sm font-semibold leading-tight">{mit.title}</p>
                    {mit.owner && (
                      <p className="text-xs text-muted-foreground mt-0.5">{mit.owner}</p>
                    )}
                  </div>
                </div>
                {done && (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                )}
              </div>

              {/* Month milestone */}
              {milestone && (
                <div className="flex items-start gap-2 text-xs bg-muted/50 rounded-md px-3 py-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">
                    <span className="font-medium text-foreground">{activeMonth} milestone:</span>{' '}
                    {milestone.description}
                  </span>
                </div>
              )}

              {done ? (
                <p className="text-xs text-muted-foreground italic">Submitted for Week {weekNumber}</p>
              ) : (
                <>
                  {/* Q1: What moved */}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">
                      What moved forward this week?
                    </Label>
                    <Textarea
                      placeholder="What did you make progress on? Be specific."
                      value={form.update_text}
                      onChange={(e) => setField(mit.id, 'update_text', e.target.value)}
                      rows={2}
                    />
                  </div>

                  {/* Q2: Blockers */}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">
                      Anything blocked or at risk?
                    </Label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setField(mit.id, 'has_blocker', false)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
                          !form.has_blocker
                            ? 'border-foreground/30 bg-muted text-foreground'
                            : 'border-border text-muted-foreground hover:border-foreground/20'
                        }`}
                      >
                        No
                      </button>
                      <button
                        onClick={() => setField(mit.id, 'has_blocker', true)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
                          form.has_blocker
                            ? 'border-red-400 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300'
                            : 'border-border text-muted-foreground hover:border-foreground/20'
                        }`}
                      >
                        <AlertTriangle className="h-3 w-3" />
                        Yes
                      </button>
                    </div>
                    {form.has_blocker && (
                      <Textarea
                        className="mt-2"
                        placeholder="Describe the blocker — what's stuck, what decision or help is needed?"
                        value={form.blocker_text}
                        onChange={(e) => setField(mit.id, 'blocker_text', e.target.value)}
                        rows={2}
                      />
                    )}
                  </div>

                  {/* Q3: Milestone confidence */}
                  {milestone && (
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">
                        {activeMonth} milestone confidence
                      </Label>
                      <div className="flex gap-2 flex-wrap">
                        {CONFIDENCE_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setField(mit.id, 'confidence', opt.value)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
                              form.confidence === opt.value
                                ? opt.color
                                : 'border-border text-muted-foreground hover:border-foreground/20'
                            }`}
                          >
                            <span>{opt.emoji}</span> {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Submit */}
                  <Button
                    size="sm"
                    onClick={() => handleSubmit(mit.id)}
                    disabled={!canSubmit || submitting === mit.id}
                    className="w-full"
                  >
                    {submitting === mit.id ? 'Submitting…' : 'Submit Check-in'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
