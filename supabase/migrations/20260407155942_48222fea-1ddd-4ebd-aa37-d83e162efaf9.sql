
-- Create update_updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- AP-level MITs
CREATE TABLE public.ap_mits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mit_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  vfo_category TEXT,
  q1_score TEXT DEFAULT 'yellow',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ap_mits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users can read ap_mits" ON public.ap_mits FOR SELECT TO authenticated USING (true);

CREATE TRIGGER update_ap_mits_updated_at BEFORE UPDATE ON public.ap_mits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Department MITs
CREATE TABLE public.department_mits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ap_mit_id UUID REFERENCES public.ap_mits(id) ON DELETE CASCADE,
  department TEXT NOT NULL CHECK (department IN ('Ops', 'L1', 'L2', 'L3', 'Sales', 'Events', 'CS')),
  title TEXT NOT NULL,
  owner TEXT,
  contributors TEXT,
  dependencies TEXT,
  q1_carryover TEXT,
  hypothesis TEXT,
  problem TEXT,
  why_this_quarter TEXT,
  inputs_activity TEXT,
  outputs_results TEXT,
  green_definition TEXT,
  yellow_definition TEXT,
  red_definition TEXT,
  current_status TEXT DEFAULT 'yellow' CHECK (current_status IN ('green', 'yellow', 'red')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.department_mits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users can read department_mits" ON public.department_mits FOR SELECT TO authenticated USING (true);
CREATE POLICY "All authenticated users can update department_mits" ON public.department_mits FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_department_mits_updated_at BEFORE UPDATE ON public.department_mits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Monthly Milestones
CREATE TABLE public.monthly_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_mit_id UUID NOT NULL REFERENCES public.department_mits(id) ON DELETE CASCADE,
  month TEXT NOT NULL CHECK (month IN ('April', 'May', 'June')),
  description TEXT,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'at_risk', 'blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.monthly_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users can read monthly_milestones" ON public.monthly_milestones FOR SELECT TO authenticated USING (true);
CREATE POLICY "All authenticated users can update monthly_milestones" ON public.monthly_milestones FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_monthly_milestones_updated_at BEFORE UPDATE ON public.monthly_milestones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Weekly Checkpoints
CREATE TABLE public.weekly_checkpoints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_mit_id UUID NOT NULL REFERENCES public.department_mits(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES public.monthly_milestones(id) ON DELETE SET NULL,
  week_number INTEGER NOT NULL CHECK (week_number BETWEEN 1 AND 13),
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  summary TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'on_track', 'at_risk', 'blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.weekly_checkpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users can read weekly_checkpoints" ON public.weekly_checkpoints FOR SELECT TO authenticated USING (true);
CREATE POLICY "All authenticated users can update weekly_checkpoints" ON public.weekly_checkpoints FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_weekly_checkpoints_updated_at BEFORE UPDATE ON public.weekly_checkpoints FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Daily Inputs
CREATE TABLE public.daily_inputs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_mit_id UUID NOT NULL REFERENCES public.department_mits(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  input_date DATE NOT NULL DEFAULT CURRENT_DATE,
  author_name TEXT NOT NULL,
  update_text TEXT NOT NULL,
  blockers TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_inputs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users can read daily_inputs" ON public.daily_inputs FOR SELECT TO authenticated USING (true);
CREATE POLICY "All authenticated users can create daily_inputs" ON public.daily_inputs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "All authenticated users can update daily_inputs" ON public.daily_inputs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "All authenticated users can delete daily_inputs" ON public.daily_inputs FOR DELETE TO authenticated USING (true);

-- Weekly Rollups
CREATE TABLE public.weekly_rollups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  week_number INTEGER NOT NULL CHECK (week_number BETWEEN 1 AND 13),
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  department TEXT CHECK (department IN ('Ops', 'L1', 'L2', 'L3', 'Sales', 'Events', 'CS', 'overall')),
  summary TEXT,
  themes TEXT,
  blockers_summary TEXT,
  status_assessment TEXT,
  raw_ai_response TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.weekly_rollups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users can read weekly_rollups" ON public.weekly_rollups FOR SELECT TO authenticated USING (true);
CREATE POLICY "All authenticated users can create weekly_rollups" ON public.weekly_rollups FOR INSERT TO authenticated WITH CHECK (true);
