import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDepartmentMits, useDailyInputs } from '@/hooks/use-mit-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  getCurrentWeekNumber,
  getWeekDateRange,
  getWeekDateRangeStrings,
  getMonthForWeek,
  getTodayFormatted,
  DEPARTMENTS,
  DEPARTMENT_COLORS,
  type Department,
  getStatusEmoji,
} from '@/lib/constants';
import { Calendar, ChevronRight, MessageSquare } from 'lucide-react';

export default function WeeklyCheckpointView() {
  const currentWeek = getCurrentWeekNumber();
  const [selectedWeek, setSelectedWeek] = useState(String(currentWeek));
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const weekNum = parseInt(selectedWeek);

  const { data: allMits, isLoading: mitsLoading } = useDepartmentMits(
    selectedDept !== 'all' ? selectedDept : undefined
  );
  const { data: dailyInputs, isLoading: inputsLoading } = useDailyInputs();

  const isLoading = mitsLoading || inputsLoading;

  const { start: weekStart, end: weekEnd } = getWeekDateRange(weekNum);
  const { startStr, endStr } = getWeekDateRangeStrings(weekNum);

  const formatShortDate = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  // Filter inputs for selected week
  const weekInputs = (dailyInputs || []).filter(
    (i) => i.input_date >= startStr && i.input_date <= endStr
  );

  // Group by MIT
  const inputsByMit = weekInputs.reduce((acc, input) => {
    if (!acc[input.department_mit_id]) acc[input.department_mit_id] = [];
    acc[input.department_mit_id].push(input);
    return acc;
  }, {} as Record<string, typeof weekInputs>);

  // Stats
  const totalInputs = weekInputs.length;
  const uniqueAuthors = new Set(weekInputs.map((i) => i.author_name)).size;
  const mitsWithInputs = Object.keys(inputsByMit).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6" /> Weekly View
          </h1>
          <p className="text-sm text-muted-foreground">
            {getTodayFormatted()} · Week {weekNum} of 13 · {getMonthForWeek(weekNum)} milestone active
            {weekNum === currentWeek && <Badge className="ml-2 text-xs">Current Week</Badge>}
          </p>
        </div>
        <div className="flex gap-3">
          <Select value={selectedDept} onValueChange={setSelectedDept}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Depts</SelectItem>
              {DEPARTMENTS.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedWeek} onValueChange={setSelectedWeek}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Array.from({ length: 13 }, (_, i) => i + 1).map((w) => (
                <SelectItem key={w} value={String(w)}>
                  Week {w}{w === currentWeek ? ' ●' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Week timeline */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-1">
            {Array.from({ length: 13 }, (_, i) => i + 1).map((w) => (
              <button
                key={w}
                onClick={() => setSelectedWeek(String(w))}
                className={`flex-1 h-8 rounded text-xs font-medium transition-all ${
                  w === weekNum
                    ? 'bg-primary text-primary-foreground'
                    : w === currentWeek
                    ? 'bg-primary/20 text-primary'
                    : w < currentWeek
                    ? 'bg-muted text-muted-foreground'
                    : 'bg-muted/50 text-muted-foreground'
                }`}
              >
                {w}
              </button>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>July</span>
            <span>August</span>
            <span>September</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            {formatShortDate(weekStart)} – {formatShortDate(weekEnd)}
          </p>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold">{totalInputs}</p>
            <p className="text-xs text-muted-foreground">Daily Inputs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold">{mitsWithInputs}</p>
            <p className="text-xs text-muted-foreground">MITs with Activity</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold">{uniqueAuthors}</p>
            <p className="text-xs text-muted-foreground">Contributors</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : (
        <div className="space-y-5">
          {(selectedDept === 'all' ? DEPARTMENTS : [selectedDept as Department]).map((dept) => {
            const deptMits = allMits?.filter((m) => m.department === dept) || [];
            if (deptMits.length === 0) return null;
            return (
              <div key={dept}>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <span
                    className="inline-block w-3 h-3 rounded-full"
                    style={{ backgroundColor: DEPARTMENT_COLORS[dept as Department] }}
                  />
                  {dept}
                </h3>
                <div className="space-y-2">
                  {deptMits.map((mit) => {
                    const mitInputs = inputsByMit[mit.id] || [];
                    const hasBlockers = mitInputs.some((i) => i.blockers);
                    return (
                      <Link key={mit.id} to={`/mit/${mit.id}`}>
                        <Card className="hover:shadow-sm transition-shadow cursor-pointer">
                          <CardContent className="py-3 flex items-center justify-between">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-sm">{getStatusEmoji(mit.current_status)}</span>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{mit.title}</p>
                                <p className="text-xs text-muted-foreground">{mit.owner}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              {hasBlockers && (
                                <Badge variant="destructive" className="text-xs">⚠️ blockers</Badge>
                              )}
                              <Badge variant="outline" className="text-xs gap-1">
                                <MessageSquare className="h-3 w-3" />
                                {mitInputs.length} input{mitInputs.length !== 1 ? 's' : ''}
                              </Badge>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {totalInputs === 0 && (
            <Card>
              <CardContent className="pt-6 pb-6 text-center text-muted-foreground">
                <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No daily inputs recorded for Week {weekNum}.</p>
                <p className="text-sm mt-1">
                  <Link to="/daily" className="text-primary hover:underline">Enter today's updates →</Link>
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
