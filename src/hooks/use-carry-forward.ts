import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DailyInput } from './use-mit-data';

/**
 * Returns the previous business day ISO string.
 * Friday → Thursday is NOT skipped; but Saturday/Sunday → Friday.
 * If today is Monday, previous business day is Friday.
 */
function getPreviousBusinessDay(fromIso?: string): string {
  const d = fromIso ? new Date(fromIso + 'T12:00:00') : new Date();
  const day = d.getDay(); // 0=Sun, 6=Sat
  // How many days to subtract to get to prev business day
  const sub = day === 1 ? 3 : day === 0 ? 2 : 1; // Mon→Fri(3), Sun→Fri(2), else prev day
  d.setDate(d.getDate() - sub);
  return d.toISOString().split('T')[0];
}

/**
 * Fetch daily inputs marked carry_forward=true from the most recent
 * business day (or any prior day this week) that haven't been "resolved"
 * by a newer input on the same MIT.
 */
export function useCarryForwardItems(department?: string) {
  return useQuery({
    queryKey: ['carry_forward_items', department],
    queryFn: async () => {
      // Weekly cadence: look back ~3 weeks for unresolved carry-forward items
      const today = new Date();
      const todayIso = today.toISOString().split('T')[0];

      const lookbackDate = new Date(today);
      lookbackDate.setDate(lookbackDate.getDate() - 21);
      const lookbackIso = lookbackDate.toISOString().split('T')[0];

      let query = supabase
        .from('daily_inputs')
        .select('*, department_mits(id, title, department, current_status)')
        .eq('carry_forward', true)
        .gte('input_date', lookbackIso)
        .lt('input_date', todayIso) // exclude today's own entries
        .order('input_date', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      // Filter by department if specified
      let items = (data || []) as (DailyInput & { department_mits: { id: string; title: string; department: string; current_status: string | null } })[];
      if (department) {
        items = items.filter((i) => (i as any).department_mits?.department === department);
      }

      // Deduplicate: keep only the most recent carry-forward per MIT
      const byMit = new Map<string, typeof items[0]>();
      for (const item of items) {
        if (!byMit.has(item.department_mit_id)) {
          byMit.set(item.department_mit_id, item);
        }
      }

      return Array.from(byMit.values());
    },
  });
}

/**
 * Get the day name for display (e.g. "Monday", "Friday")
 */
export function getDayName(isoDate: string): string {
  const d = new Date(isoDate + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long' });
}
