
-- Blockers table
CREATE TABLE public.blockers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_mit_id UUID NOT NULL REFERENCES public.department_mits(id) ON DELETE CASCADE,
  reported_by TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.blockers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read blockers" ON public.blockers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create blockers" ON public.blockers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update blockers" ON public.blockers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete blockers" ON public.blockers FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_blockers_updated_at BEFORE UPDATE ON public.blockers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Recovery Actions table
CREATE TABLE public.recovery_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID NOT NULL REFERENCES public.blockers(id) ON DELETE CASCADE,
  department_mit_id UUID NOT NULL REFERENCES public.department_mits(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  owner TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.recovery_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read recovery_actions" ON public.recovery_actions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create recovery_actions" ON public.recovery_actions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update recovery_actions" ON public.recovery_actions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete recovery_actions" ON public.recovery_actions FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_recovery_actions_updated_at BEFORE UPDATE ON public.recovery_actions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Executive Rollup Snapshots
CREATE TABLE public.executive_rollup_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  week_number INTEGER NOT NULL CHECK (week_number BETWEEN 1 AND 13),
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  overall_status TEXT NOT NULL DEFAULT 'yellow' CHECK (overall_status IN ('green', 'yellow', 'red')),
  summary TEXT,
  department_statuses JSONB DEFAULT '{}',
  key_wins TEXT,
  key_risks TEXT,
  recommendations TEXT,
  generated_by TEXT DEFAULT 'ai',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.executive_rollup_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read executive_rollup_snapshots" ON public.executive_rollup_snapshots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create executive_rollup_snapshots" ON public.executive_rollup_snapshots FOR INSERT TO authenticated WITH CHECK (true);

-- Add INSERT policy for monthly_milestones and weekly_checkpoints (needed for seeding from edge functions)
CREATE POLICY "Authenticated users can insert monthly_milestones" ON public.monthly_milestones FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can insert weekly_checkpoints" ON public.weekly_checkpoints FOR INSERT TO authenticated WITH CHECK (true);
