import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type ApMit = Tables<'company_mits'>;
export type DepartmentMit = Tables<'department_mits'>;
export type MonthlyMilestone = Tables<'monthly_milestones'>;
export type DailyInput = Tables<'daily_inputs'>;
export type WeeklyRollup = Tables<'weekly_rollups'>;
export type Blocker = Tables<'blockers'>;
export type RecoveryAction = Tables<'recovery_actions'>;
export type ExecutiveSnapshot = Tables<'executive_rollup_snapshots'>;

export function useApMits() {
  return useQuery({
    queryKey: ['company_mits'],
    queryFn: async () => {
      const { data, error } = await supabase.from('company_mits').select('*').order('mit_number');
      if (error) throw error;
      return data as ApMit[];
    },
  });
}

export function useDepartmentMits(department?: string) {
  return useQuery({
    queryKey: ['department_mits', department],
    queryFn: async () => {
      let query = supabase.from('department_mits').select('*');
      if (department) query = query.eq('department', department);
      const { data, error } = await query.order('department').order('title');
      if (error) throw error;
      return data as DepartmentMit[];
    },
  });
}

export function useDepartmentMit(id: string) {
  return useQuery({
    queryKey: ['department_mit', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('department_mits').select('*').eq('id', id).single();
      if (error) throw error;
      return data as DepartmentMit;
    },
    enabled: !!id,
  });
}

export function useMonthlyMilestones(departmentMitId?: string) {
  return useQuery({
    queryKey: ['monthly_milestones', departmentMitId],
    queryFn: async () => {
      let query = supabase.from('monthly_milestones').select('*');
      if (departmentMitId) query = query.eq('department_mit_id', departmentMitId);
      const { data, error } = await query.order('month');
      if (error) throw error;
      return data as MonthlyMilestone[];
    },
  });
}

export function useDailyInputs(departmentMitId?: string, limit?: number) {
  return useQuery({
    queryKey: ['daily_inputs', departmentMitId, limit],
    queryFn: async () => {
      let query = supabase.from('daily_inputs').select('*');
      if (departmentMitId) query = query.eq('department_mit_id', departmentMitId);
      query = query.order('input_date', { ascending: false }).order('created_at', { ascending: false });
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      if (error) throw error;
      return data as DailyInput[];
    },
  });
}

export function useBlockers(departmentMitId?: string, statusFilter?: string) {
  return useQuery({
    queryKey: ['blockers', departmentMitId, statusFilter],
    queryFn: async () => {
      let query = supabase.from('blockers').select('*');
      if (departmentMitId) query = query.eq('department_mit_id', departmentMitId);
      if (statusFilter) query = query.eq('status', statusFilter);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data as Blocker[];
    },
  });
}

export function useRecoveryActions(blockerId?: string) {
  return useQuery({
    queryKey: ['recovery_actions', blockerId],
    queryFn: async () => {
      let query = supabase.from('recovery_actions').select('*');
      if (blockerId) query = query.eq('blocker_id', blockerId);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data as RecoveryAction[];
    },
  });
}

export function useWeeklyRollups() {
  return useQuery({
    queryKey: ['weekly_rollups'],
    queryFn: async () => {
      const { data, error } = await supabase.from('weekly_rollups').select('*').order('week_number', { ascending: false });
      if (error) throw error;
      return data as WeeklyRollup[];
    },
  });
}

export function useExecutiveSnapshots() {
  return useQuery({
    queryKey: ['executive_rollup_snapshots'],
    queryFn: async () => {
      const { data, error } = await supabase.from('executive_rollup_snapshots').select('*').order('week_number', { ascending: false });
      if (error) throw error;
      return data as ExecutiveSnapshot[];
    },
  });
}

export type StatusHistoryRecord = {
  id: string;
  department_mit_id: string;
  status: string;
  week_number: number;
  recorded_at: string;
};

export function useMitStatusHistory(departmentMitId?: string) {
  return useQuery({
    queryKey: ['mit_status_history', departmentMitId],
    queryFn: async () => {
      const db = supabase as any;
      let query = db.from('mit_status_history').select('*').order('week_number', { ascending: true });
      if (departmentMitId) query = query.eq('department_mit_id', departmentMitId);
      const { data, error } = await query;
      if (error) throw error;
      return data as StatusHistoryRecord[];
    },
    enabled: departmentMitId !== undefined ? !!departmentMitId : true,
  });
}

export type TeamLead = {
  id: string;
  name: string;
  department: string;
  slack_user_id: string | null;
  is_ned: boolean;
  created_at: string;
};

export function useTeamLeads() {
  return useQuery({
    queryKey: ['team_leads'],
    queryFn: async () => {
      const db = supabase as any;
      const { data, error } = await db.from('team_leads').select('*').order('department');
      if (error) throw error;
      return data as TeamLead[];
    },
  });
}

export type BlockerWithMit = Blocker & {
  department_mits: { id: string; title: string; department: string } | null;
  owner: string | null;
};

export function useAllBlockers(statuses?: string[]) {
  return useQuery({
    queryKey: ['blockers_with_dept', statuses],
    queryFn: async () => {
      let query = supabase.from('blockers').select('*, department_mits(id, title, department)');
      if (statuses && statuses.length > 0) query = query.in('status', statuses);
      const { data, error } = await query.order('created_at', { ascending: true });
      if (error) throw error;
      return data as BlockerWithMit[];
    },
  });
}
