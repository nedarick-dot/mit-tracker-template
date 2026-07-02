
-- Add new columns to daily_inputs
ALTER TABLE public.daily_inputs
  ADD COLUMN IF NOT EXISTS what_completed text,
  ADD COLUMN IF NOT EXISTS key_decisions text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS carry_forward boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS milestone_id uuid REFERENCES public.monthly_milestones(id);
