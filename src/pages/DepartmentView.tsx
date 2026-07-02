import { useParams, Link } from 'react-router-dom';
import { useDepartmentMits, useApMits } from '@/hooks/use-mit-data';
import { useCarryForwardItems, getDayName } from '@/hooks/use-carry-forward';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { getStatusEmoji, getStatusColor, DEPARTMENT_COLORS, type Department, getCurrentWeekNumber, getActiveMonth, getTodayFormatted } from '@/lib/constants';
import { ChevronRight, Calendar, ArrowRight } from 'lucide-react';
import WeekDayStrip from '@/components/WeekDayStrip';

export default function DepartmentView() {
  const { dept } = useParams<{ dept: string }>();
  const { data: mits, isLoading } = useDepartmentMits(dept);
  const { data: apMits } = useApMits();
  const { data: carryItems } = useCarryForwardItems(dept);

  if (isLoading) {
    return <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-40" />)}</div>;
  }

  const deptColor = DEPARTMENT_COLORS[dept as Department] || 'hsl(220, 10%, 50%)';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
          style={{ backgroundColor: deptColor }}
        >
          {dept?.slice(0, 2)}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{dept} Department</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {mits?.length || 0} MITs · Week {getCurrentWeekNumber()} · {getActiveMonth()} milestone
          </p>
          <div className="mt-1"><WeekDayStrip compact /></div>
        </div>
      </div>

      {/* Carry-forward items */}
      {carryItems && carryItems.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5 text-amber-700">
              <ArrowRight className="h-3.5 w-3.5" />
              Carried Forward ({carryItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {carryItems.map((item) => {
              const mitTitle = (item as any).department_mits?.title || '';
              return (
                <div key={item.id} className="flex items-start gap-2 text-sm">
                  <Badge variant="outline" className="text-[10px] shrink-0 border-amber-300 text-amber-700">
                    from {getDayName(item.input_date)}
                  </Badge>
                  <div className="min-w-0">
                    <span className="font-medium text-xs">{mitTitle}:</span>{' '}
                    <span className="text-muted-foreground text-xs">{item.update_text}</span>
                  </div>
                </div>
              );
            })}
            <Link to="/daily" className="text-xs text-primary hover:underline">Log updates →</Link>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {mits?.map((mit) => {
          const parentMit = apMits?.find((a) => a.id === mit.ap_mit_id);
          return (
            <Link key={mit.id} to={`/mit/${mit.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer mb-4">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: getStatusColor(mit.current_status) }}
                      />
                      <CardTitle className="text-base">{mit.title}</CardTitle>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">Owner: {mit.owner}</Badge>
                    {parentMit && (
                      <Badge variant="secondary" className="text-xs">
                        AP MIT {parentMit.mit_number}: {parentMit.title.slice(0, 30)}...
                      </Badge>
                    )}
                  </div>
                  {mit.mit_statement && (
                    <p className="text-sm text-muted-foreground line-clamp-3">{mit.mit_statement}</p>
                  )}
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <div className="text-xs p-2 rounded bg-green-50 border border-green-200">
                      <span className="font-medium text-green-800">🟢 Green</span>
                      <p className="text-green-700 mt-1 line-clamp-2">{mit.green_definition}</p>
                    </div>
                    <div className="text-xs p-2 rounded bg-yellow-50 border border-yellow-200">
                      <span className="font-medium text-yellow-800">🟡 Yellow</span>
                      <p className="text-yellow-700 mt-1 line-clamp-2">{mit.yellow_definition}</p>
                    </div>
                    <div className="text-xs p-2 rounded bg-red-50 border border-red-200">
                      <span className="font-medium text-red-800">🔴 Red</span>
                      <p className="text-red-700 mt-1 line-clamp-2">{mit.red_definition}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
