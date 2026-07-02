ALTER PUBLICATION supabase_realtime ADD TABLE public.department_mits;
ALTER PUBLICATION supabase_realtime ADD TABLE public.monthly_milestones;
ALTER PUBLICATION supabase_realtime ADD TABLE public.blockers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_inputs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.weekly_rollups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.executive_rollup_snapshots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.recovery_actions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.weekly_checkpoints;

ALTER TABLE public.department_mits REPLICA IDENTITY FULL;
ALTER TABLE public.monthly_milestones REPLICA IDENTITY FULL;
ALTER TABLE public.blockers REPLICA IDENTITY FULL;
ALTER TABLE public.daily_inputs REPLICA IDENTITY FULL;
ALTER TABLE public.weekly_rollups REPLICA IDENTITY FULL;
ALTER TABLE public.executive_rollup_snapshots REPLICA IDENTITY FULL;
ALTER TABLE public.recovery_actions REPLICA IDENTITY FULL;
ALTER TABLE public.weekly_checkpoints REPLICA IDENTITY FULL;