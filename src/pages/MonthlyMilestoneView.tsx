import { Link } from 'react-router-dom';
import { useDepartmentMits, useMonthlyMilestones } from '@/hooks/use-mit-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import {
  getActiveMonth,
  getCurrentWeekNumber,
  getTodayFormatted,
  DEPARTMENTS,
  DEPARTMENT_COLORS,
  type Department,
  getStatusEmoji,
  MANUAL_STATUSES,
  STATUS_CONFIG,
  getStatusLabel,
} from '@/lib/constants';
import { Calendar, ChevronRight, Milestone } from 'lucide-react';

const MONTHS = ['July', 'August', 'September'] as const;

export default function MonthlyMilestoneView() {
  const { data: allMits, isLoading: mitsLoading } = useDepartmentMits();
  const { data: allMilestones, isLoading: msLoading } = useMonthlyMilestones();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const activeMonth = getActiveMonth();
  const currentWeek = getCurrentWeekNumber();
  const isLoading = mitsLoading || msLoading;

  const handleStatusChange = async (milestoneId: string, newStatus: string) => {
    const { error } = await supabase.from('monthly_milestones').update({ status: newStatus } as any).eq('id', milestoneId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: `Milestone status → ${getStatusLabel(newStatus)}` });
      queryClient.invalidateQueries({ queryKey: ['monthly_milestones'] });
    }
  };

  // Stats
  const milestonesForMonth = (month: string) =>
    allMilestones?.filter((m) => m.month === month) || [];

  const statusCount = (month: string, status: string) =>
    milestonesForMonth(month).filter((m) => m.status === status).length;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Milestone className="h-6 w-6" /> Monthly Milestones
        </h1>
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          {getTodayFormatted()} · Week {currentWeek} · {activeMonth} milestone active
        </p>
      </div>

      {/* Month tabs / summary */}
      <div className="grid grid-cols-3 gap-4">
        {MONTHS.map((month) => {
          const total = milestonesForMonth(month).length;
          const completed = statusCount(month, 'complete');
          const inProgress = statusCount(month, 'in_progress');
          const isActive = month === activeMonth;
          return (
            <Card key={month} className={isActive ? 'ring-2 ring-primary' : ''}>
              <CardContent className="pt-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="font-semibold text-lg">{month}</span>
                  {isActive && <Badge className="text-xs">Active</Badge>}
                </div>
                <div className="flex justify-center gap-3 text-xs text-muted-foreground">
                  <span>{total} milestones</span>
                  {completed > 0 && <span className="text-green-600">{completed} done</span>}
                  {inProgress > 0 && <span className="text-primary">{inProgress} in progress</span>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* By month, by department */}
      {MONTHS.map((month) => {
        const isActive = month === activeMonth;
        return (
          <div key={month}>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              {month}
              {isActive && <Badge variant="default" className="text-xs">Current</Badge>}
            </h2>
            <div className="space-y-4">
              {DEPARTMENTS.map((dept) => {
                const deptMits = allMits?.filter((m) => m.department === dept) || [];
                if (deptMits.length === 0) return null;

                const deptMilestones = deptMits.map((mit) => {
                  const ms = allMilestones?.find(
                    (m) => m.department_mit_id === mit.id && m.month === month
                  );
                  return { mit, milestone: ms };
                });

                // Skip if no milestones at all for this dept/month
                if (deptMilestones.every((d) => !d.milestone)) return null;

                return (
                  <div key={dept}>
                    <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <span
                        className="inline-block w-3 h-3 rounded-full"
                        style={{ backgroundColor: DEPARTMENT_COLORS[dept as Department] }}
                      />
                      {dept}
                    </h3>
                    <div className="space-y-2">
                      {deptMilestones.map(({ mit, milestone }) => {
                        if (!milestone) return null;
                        return (
                          <Card key={mit.id} className="hover:shadow-sm transition-shadow">
                            <CardContent className="py-3 flex items-center justify-between">
                              <Link to={`/mit/${mit.id}`} className="min-w-0 flex-1 cursor-pointer">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm">{getStatusEmoji(mit.current_status)}</span>
                                  <p className="text-sm font-medium truncate">{mit.title}</p>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2 ml-6">
                                  {milestone.description || 'No milestone description'}
                                </p>
                              </Link>
                              <div className="flex items-center gap-2 shrink-0 ml-4">
                                <Select value={milestone.status || 'not_started'} onValueChange={(v) => handleStatusChange(milestone.id, v)}>
                                  <SelectTrigger className="h-7 text-xs w-[130px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {MANUAL_STATUSES.map((s) => (
                                      <SelectItem key={s} value={s}>
                                        <span className="flex items-center gap-1.5">
                                          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_CONFIG[s].color }} />
                                          {STATUS_CONFIG[s].label}
                                        </span>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Link to={`/mit/${mit.id}`}>
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                </Link>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
