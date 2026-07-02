CREATE TABLE public.team_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  department TEXT NOT NULL CHECK (department IN ('Operations', 'Workshops', 'L3', 'Sales', 'Marketing', 'Events', 'RevOps', 'Growth')),
  slack_user_id TEXT,
  is_ned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.team_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can read team_leads"
  ON public.team_leads FOR SELECT TO authenticated USING (true);

CREATE POLICY "Auth users can manage team_leads"
  ON public.team_leads FOR ALL TO authenticated USING (true) WITH CHECK (true);
