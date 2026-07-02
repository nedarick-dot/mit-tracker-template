ALTER TABLE public.team_leads
  DROP CONSTRAINT team_leads_department_check;

ALTER TABLE public.team_leads
  ADD CONSTRAINT team_leads_department_check
  CHECK (department IN ('Operations','Workshops','Client Success','Sales','Marketing','Events','RevOps','Growth'));
