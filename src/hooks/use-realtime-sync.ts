import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Maps Postgres table names to the React Query key prefixes that should be invalidated when that table changes.
const TABLE_QUERY_KEYS: Record<string, string[][]> = {
  department_mits: [['department_mits'], ['department_mit']],
  monthly_milestones: [['monthly_milestones']],
  blockers: [['blockers']],
  daily_inputs: [['daily_inputs']],
  weekly_rollups: [['weekly_rollups']],
  executive_rollup_snapshots: [['executive_rollup_snapshots']],
  recovery_actions: [['recovery_actions']],
  weekly_checkpoints: [['weekly_checkpoints']],
  company_mits: [['company_mits']],
};

/**
 * Subscribes to Postgres changes on all MIT-related tables and invalidates the
 * corresponding React Query caches so every page reflects updates instantly.
 */
export function useRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase.channel('mit-realtime-sync');

    Object.entries(TABLE_QUERY_KEYS).forEach(([table, keys]) => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => {
          keys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
        }
      );
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
