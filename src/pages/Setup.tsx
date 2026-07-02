import { useState, type ReactNode } from 'react';
import { useApMits, useDepartmentMits, useTeamLeads } from '@/hooks/use-mit-data';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { DEPARTMENTS, DEPARTMENT_COLORS, MANUAL_STATUSES, STATUS_CONFIG, getStatusColor, type Department } from '@/lib/constants';
import { Plus, Pencil, Settings, Slack } from 'lucide-react';

// ── AP MIT Form ──────────────────────────────────────────────
function ApMitForm({ existing, onDone }: { existing?: any; onDone: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    mit_number: existing?.mit_number ?? '',
    title: existing?.title ?? '',
    vfo_category: existing?.vfo_category ?? '',
    description: existing?.description ?? '',
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim() || !form.mit_number) return;
    setSaving(true);
    const payload = {
      mit_number: Number(form.mit_number),
      title: form.title.trim(),
      vfo_category: form.vfo_category.trim() || null,
      description: form.description.trim() || null,
    };
    const { error } = existing
      ? await supabase.from('company_mits').update(payload).eq('id', existing.id)
      : await supabase.from('company_mits').insert(payload);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: existing ? 'AP MIT updated' : 'AP MIT created' });
      queryClient.invalidateQueries({ queryKey: ['company_mits'] });
      onDone();
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs text-muted-foreground">MIT Number *</Label>
          <Input type="number" value={form.mit_number} onChange={(e) => set('mit_number', e.target.value)} placeholder="1" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">VFO Category</Label>
          <Input value={form.vfo_category} onChange={(e) => set('vfo_category', e.target.value)} placeholder="e.g. Revenue" />
        </div>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Title *</Label>
        <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="MIT title" />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Description</Label>
        <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} placeholder="Brief description of this AP-level MIT" />
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <Button variant="outline" size="sm" onClick={onDone}>Cancel</Button>
        <Button size="sm" onClick={handleSave} disabled={saving || !form.title.trim() || !form.mit_number}>
          {saving ? 'Saving…' : existing ? 'Save Changes' : 'Create AP MIT'}
        </Button>
      </div>
    </div>
  );
}

// ── Department MIT Form ──────────────────────────────────────
function DeptMitForm({ existing, apMits, onDone }: { existing?: any; apMits: any[]; onDone: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: existing?.title ?? '',
    owner: existing?.owner ?? '',
    contributors: existing?.contributors ?? '',
    department: existing?.department ?? '',
    ap_mit_id: existing?.ap_mit_id ?? '',
    dependencies: existing?.dependencies ?? '',
    q1_carryover: existing?.q1_carryover ?? '',
    hypothesis: existing?.hypothesis ?? '',
    problem: existing?.problem ?? '',
    why_this_quarter: existing?.why_this_quarter ?? '',
    inputs_activity: existing?.inputs_activity ?? '',
    outputs_results: existing?.outputs_results ?? '',
    green_definition: existing?.green_definition ?? '',
    yellow_definition: existing?.yellow_definition ?? '',
    red_definition: existing?.red_definition ?? '',
    current_status: existing?.current_status ?? 'not_started',
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim() || !form.department) return;
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      owner: form.owner.trim() || null,
      contributors: form.contributors.trim() || null,
      department: form.department,
      ap_mit_id: form.ap_mit_id || null,
      dependencies: form.dependencies.trim() || null,
      q1_carryover: form.q1_carryover || null,
      hypothesis: form.hypothesis.trim() || null,
      problem: form.problem.trim() || null,
      why_this_quarter: form.why_this_quarter.trim() || null,
      inputs_activity: form.inputs_activity.trim() || null,
      outputs_results: form.outputs_results.trim() || null,
      green_definition: form.green_definition.trim() || null,
      yellow_definition: form.yellow_definition.trim() || null,
      red_definition: form.red_definition.trim() || null,
      current_status: form.current_status,
    };
    const { error } = existing
      ? await supabase.from('department_mits').update(payload).eq('id', existing.id)
      : await supabase.from('department_mits').insert(payload);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: existing ? 'MIT updated' : 'MIT created' });
      queryClient.invalidateQueries({ queryKey: ['department_mits'] });
      onDone();
    }
    setSaving(false);
  };

  const F = ({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) => (
    <div>
      <Label className="text-xs text-muted-foreground mb-1 block">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );

  return (
    <div className="space-y-5">

      {/* ── Identity ── */}
      <div className="space-y-3">
        <F label="Title" required>
          <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="What is this MIT?" />
        </F>
        <div className="grid grid-cols-2 gap-3">
          <F label="Owner">
            <Input value={form.owner} onChange={(e) => set('owner', e.target.value)} placeholder="Primary owner" />
          </F>
          <F label="Contributors">
            <Input value={form.contributors} onChange={(e) => set('contributors', e.target.value)} placeholder="Names, comma-separated" />
          </F>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <F label="Department" required>
            <Select value={form.department} onValueChange={(v) => set('department', v)}>
              <SelectTrigger><SelectValue placeholder="Select dept" /></SelectTrigger>
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
          </F>
          <F label="AP MIT (parent)">
            <Select value={form.ap_mit_id || '__none__'} onValueChange={(v) => set('ap_mit_id', v === '__none__' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Link to AP MIT" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {apMits.map((a) => (
                  <SelectItem key={a.id} value={a.id}>MIT {a.mit_number}: {a.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </F>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <F label="Dependencies">
            <Input value={form.dependencies} onChange={(e) => set('dependencies', e.target.value)} placeholder="Other MITs or teams this depends on" />
          </F>
          <F label="Q1 Carryover?">
            <Select value={form.q1_carryover || 'no'} onValueChange={(v) => set('q1_carryover', v === 'no' ? '' : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="no">No</SelectItem>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="partial">Partial carryover</SelectItem>
              </SelectContent>
            </Select>
          </F>
        </div>
      </div>

      {/* ── Strategy ── */}
      <div className="space-y-3 border-t border-border/60 pt-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Strategy</p>
        <F label="Hypothesis">
          <Textarea value={form.hypothesis} onChange={(e) => set('hypothesis', e.target.value)} rows={2} placeholder="If we do X, then Y will happen because Z" />
        </F>
        <F label="Problem We're Solving">
          <Textarea value={form.problem} onChange={(e) => set('problem', e.target.value)} rows={2} placeholder="What specific problem does this address?" />
        </F>
        <F label="Why This Quarter?">
          <Textarea value={form.why_this_quarter} onChange={(e) => set('why_this_quarter', e.target.value)} rows={2} placeholder="Why is now the right time?" />
        </F>
      </div>

      {/* ── Execution ── */}
      <div className="space-y-3 border-t border-border/60 pt-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Execution</p>
        <F label="Inputs / Activity">
          <Textarea value={form.inputs_activity} onChange={(e) => set('inputs_activity', e.target.value)} rows={2} placeholder="What activities, resources, or actions are required?" />
        </F>
        <F label="Output / Results">
          <Textarea value={form.outputs_results} onChange={(e) => set('outputs_results', e.target.value)} rows={2} placeholder="What does success produce — the tangible deliverable or outcome?" />
        </F>
      </div>

      {/* ── Success Thresholds ── */}
      <div className="space-y-3 border-t border-border/60 pt-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Success Thresholds</p>
        <div>
          <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(142 71% 38%)' }}>Green — Complete</Label>
          <Textarea value={form.green_definition} onChange={(e) => set('green_definition', e.target.value)} rows={1} placeholder="What does complete look like?" />
        </div>
        <div>
          <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(38 92% 46%)' }}>Yellow — Partially Complete</Label>
          <Textarea value={form.yellow_definition} onChange={(e) => set('yellow_definition', e.target.value)} rows={1} placeholder="What does partially complete look like?" />
        </div>
        <div>
          <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(0 72% 51%)' }}>Red — Missed or Blocked</Label>
          <Textarea value={form.red_definition} onChange={(e) => set('red_definition', e.target.value)} rows={1} placeholder="What does missed or blocked look like?" />
        </div>
      </div>

      {/* ── Current Status ── */}
      <div className="border-t border-border/60 pt-4">
        <F label="Current Status">
          <Select value={form.current_status} onValueChange={(v) => set('current_status', v)}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MANUAL_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_CONFIG[s].color }} />
                    {STATUS_CONFIG[s].label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </F>
      </div>

      <div className="flex gap-2 justify-end pt-1">
        <Button variant="outline" size="sm" onClick={onDone}>Cancel</Button>
        <Button size="sm" onClick={handleSave} disabled={saving || !form.title.trim() || !form.department}>
          {saving ? 'Saving…' : existing ? 'Save Changes' : 'Create MIT'}
        </Button>
      </div>
    </div>
  );
}

// ── Team & Slack Tab ─────────────────────────────────────────
function TeamTab() {
  const { data: leads, isLoading } = useTeamLeads();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', department: '', slack_user_id: '', is_ned: false });

  const reset = () => { setForm({ name: '', department: '', slack_user_id: '', is_ned: false }); setEditingId(null); };

  const handleSave = async () => {
    if (!form.name.trim() || !form.department) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      department: form.department,
      slack_user_id: form.slack_user_id.trim() || null,
      is_ned: form.is_ned,
    };
    const db = supabase as any;
    const { error } = editingId
      ? await db.from('team_leads').update(payload).eq('id', editingId)
      : await db.from('team_leads').insert(payload);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); }
    else { toast({ title: editingId ? 'Updated' : 'Team lead added' }); queryClient.invalidateQueries({ queryKey: ['team_leads'] }); reset(); }
    setSaving(false);
  };

  const startEdit = (lead: any) => {
    setEditingId(lead.id);
    setForm({ name: lead.name, department: lead.department, slack_user_id: lead.slack_user_id || '', is_ned: lead.is_ned });
  };

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <TabsContent value="team" className="space-y-6 mt-5">
      {/* Setup instructions */}
      <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-4 space-y-2">
        <div className="flex items-center gap-2">
          <Slack className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Slack Setup</p>
        </div>
        <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
          <li>Create a Slack app at <span className="font-mono">api.slack.com/apps</span> — name it "MIT Tracker"</li>
          <li>Bot Token Scopes: <span className="font-mono">chat:write, im:write, users:read</span></li>
          <li>Interactivity → Request URL: <span className="font-mono text-[10px]">https://wfihjcpnpceckebwawyk.supabase.co/functions/v1/slack-checkin-handler</span></li>
          <li>Install app → copy Bot Token + Signing Secret</li>
          <li>Run: <span className="font-mono">npx supabase secrets set SLACK_BOT_TOKEN=xoxb-... SLACK_SIGNING_SECRET=...</span></li>
          <li>Get Slack user IDs: right-click name → View Profile → ⋯ → Copy member ID</li>
        </ol>
      </div>

      {/* Add / edit form */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            {editingId ? 'Edit Team Lead' : 'Add Team Lead'}
          </p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Name</Label>
              <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="First Last" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Department</Label>
              <Select value={form.department} onValueChange={(v) => set('department', v)}>
                <SelectTrigger><SelectValue placeholder="Select dept" /></SelectTrigger>
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
          <div className="mb-3">
            <Label className="text-xs text-muted-foreground mb-1 block">Slack User ID</Label>
            <Input value={form.slack_user_id} onChange={(e) => set('slack_user_id', e.target.value)} placeholder="U0123456789" className="font-mono text-sm" />
            <p className="text-[11px] text-muted-foreground mt-1">Right-click name in Slack → View Profile → ⋯ → Copy member ID</p>
          </div>
          <div className="flex items-center gap-2 mb-4">
            <input type="checkbox" id="is_ned" checked={form.is_ned} onChange={(e) => set('is_ned', e.target.checked)} className="h-4 w-4" />
            <Label htmlFor="is_ned" className="text-xs text-muted-foreground cursor-pointer">This is Ned (receives Monday summary DM)</Label>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving || !form.name.trim() || !form.department}>
              {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Team Lead'}
            </Button>
            {editingId && <Button size="sm" variant="outline" onClick={reset}>Cancel</Button>}
          </div>
        </CardContent>
      </Card>

      {/* Team leads list */}
      {isLoading ? <Skeleton className="h-32" /> : (
        <Card>
          <CardContent className="pt-0 pb-0 divide-y divide-border/60">
            {(leads || []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No team leads added yet.</p>
            ) : (leads || []).map((lead) => (
              <div key={lead.id} className="flex items-center gap-3 px-4 py-3">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: DEPARTMENT_COLORS[lead.department as Department] }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{lead.name}{lead.is_ned && <Badge variant="secondary" className="text-[10px] ml-2">You</Badge>}</p>
                  <p className="text-xs text-muted-foreground">{lead.department}{lead.slack_user_id ? ` · ${lead.slack_user_id}` : ' · no Slack ID'}</p>
                </div>
                <div className="shrink-0 flex items-center gap-1.5">
                  {lead.slack_user_id
                    ? <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300">Slack ✓</Badge>
                    : <Badge variant="outline" className="text-[10px] text-muted-foreground">No Slack</Badge>
                  }
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(lead)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </TabsContent>
  );
}

// ── Main Page ────────────────────────────────────────────────
export default function SetupPage() {
  const { data: apMits, isLoading: apLoading } = useApMits();
  const { data: deptMits, isLoading: deptLoading } = useDepartmentMits();
  const [apDialog, setApDialog] = useState<{ open: boolean; editing?: any }>({ open: false });
  const [deptDialog, setDeptDialog] = useState<{ open: boolean; editing?: any }>({ open: false });

  const deptsByGroup = DEPARTMENTS.reduce((acc, d) => {
    acc[d] = (deptMits || []).filter((m) => m.department === d);
    return acc;
  }, {} as Record<string, typeof deptMits>);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">MIT Setup</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Create and manage AP-level and department MITs for Q3.</p>
        </div>
      </div>

      <Tabs defaultValue="dept">
        <TabsList>
          <TabsTrigger value="dept">Department MITs</TabsTrigger>
          <TabsTrigger value="ap">AP-Level MITs</TabsTrigger>
          <TabsTrigger value="team">Team & Slack</TabsTrigger>
        </TabsList>

        {/* ── Department MITs tab ── */}
        <TabsContent value="dept" className="space-y-5 mt-5">
          <div className="flex justify-end">
            <Button size="sm" className="gap-1.5" onClick={() => setDeptDialog({ open: true })}>
              <Plus className="h-4 w-4" /> New Department MIT
            </Button>
          </div>
          {deptLoading ? (
            <Skeleton className="h-48" />
          ) : (
            DEPARTMENTS.map((dept) => {
              const mits = deptsByGroup[dept] || [];
              if (mits.length === 0) return null;
              return (
                <div key={dept}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: DEPARTMENT_COLORS[dept as Department] }} />
                    <h3 className="text-sm font-semibold">{dept}</h3>
                    <span className="text-xs text-muted-foreground">{mits.length} MIT{mits.length !== 1 ? 's' : ''}</span>
                  </div>
                  <Card>
                    <CardContent className="pt-0 pb-0 divide-y divide-border/60">
                      {mits.map((m) => (
                        <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: getStatusColor(m.current_status) }} />
                          <span className="text-sm font-medium flex-1 min-w-0 truncate">{m.title}</span>
                          {m.owner && <span className="text-xs text-muted-foreground shrink-0">{m.owner}</span>}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 shrink-0"
                            onClick={() => setDeptDialog({ open: true, editing: m })}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              );
            })
          )}
          {!deptLoading && (deptMits || []).length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p className="text-sm">No department MITs yet.</p>
                <Button size="sm" className="mt-3 gap-1.5" onClick={() => setDeptDialog({ open: true })}>
                  <Plus className="h-4 w-4" /> Create your first MIT
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── AP MITs tab ── */}
        <TabsContent value="ap" className="space-y-4 mt-5">
          <div className="flex justify-end">
            <Button size="sm" className="gap-1.5" onClick={() => setApDialog({ open: true })}>
              <Plus className="h-4 w-4" /> New AP MIT
            </Button>
          </div>
          {apLoading ? (
            <Skeleton className="h-48" />
          ) : (apMits || []).length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p className="text-sm">No AP-level MITs yet.</p>
                <Button size="sm" className="mt-3 gap-1.5" onClick={() => setApDialog({ open: true })}>
                  <Plus className="h-4 w-4" /> Create your first AP MIT
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-0 pb-0 divide-y divide-border/60">
                {apMits!.map((m) => (
                  <div key={m.id} className="flex items-center gap-4 px-4 py-3.5">
                    <span className="text-xs font-mono text-muted-foreground w-12 shrink-0">MIT {m.mit_number}</span>
                    <span className="text-sm font-medium flex-1 min-w-0 truncate">{m.title}</span>
                    {m.vfo_category && (
                      <Badge variant="secondary" className="text-xs shrink-0">{m.vfo_category}</Badge>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0"
                      onClick={() => setApDialog({ open: true, editing: m })}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Team & Slack tab ── */}
        <TeamTab />

      </Tabs>

      {/* AP MIT Dialog */}
      <Dialog open={apDialog.open} onOpenChange={(o) => !o && setApDialog({ open: false })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{apDialog.editing ? 'Edit AP MIT' : 'New AP MIT'}</DialogTitle>
          </DialogHeader>
          <ApMitForm existing={apDialog.editing} onDone={() => setApDialog({ open: false })} />
        </DialogContent>
      </Dialog>

      {/* Dept MIT Dialog */}
      <Dialog open={deptDialog.open} onOpenChange={(o) => !o && setDeptDialog({ open: false })}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{deptDialog.editing ? 'Edit Department MIT' : 'New Department MIT'}</DialogTitle>
          </DialogHeader>
          <DeptMitForm
            existing={deptDialog.editing}
            apMits={apMits || []}
            onDone={() => setDeptDialog({ open: false })}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
