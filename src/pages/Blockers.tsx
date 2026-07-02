import { useAllBlockers } from '@/hooks/use-mit-data';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { DEPARTMENT_COLORS, type Department } from '@/lib/constants';
import { CheckCircle2, ShieldAlert } from 'lucide-react';

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-red-600 text-white',
  high:     'bg-orange-500 text-white',
  medium:   'bg-amber-500 text-white',
  low:      'bg-slate-400 text-white',
};

function daysOpen(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
}

function AgeLabel({ createdAt }: { createdAt: string }) {
  const days = daysOpen(createdAt);
  const label = days === 0 ? 'Today' : `${days}d open`;
  const cls =
    days > 7 ? 'text-red-600 dark:text-red-400' :
    days > 3 ? 'text-amber-600 dark:text-amber-400' :
    'text-muted-foreground';
  return <span className={`text-xs font-medium ${cls}`}>{label}</span>;
}

export default function BlockersPage() {
  const { data: blockers, isLoading } = useAllBlockers(['open', 'in_progress']);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleResolve = async (id: string) => {
    const { error } = await supabase
      .from('blockers')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Blocker resolved' });
      queryClient.invalidateQueries({ queryKey: ['blockers'] });
      queryClient.invalidateQueries({ queryKey: ['blockers_with_dept'] });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-muted-foreground" />
          Open Blockers
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isLoading ? '—' : blockers?.length || 0} open · sorted oldest first
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : !blockers || blockers.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-500 opacity-40" />
            <p className="text-sm font-medium">No open blockers</p>
            <p className="text-xs text-muted-foreground mt-1">The quarter is clear to execute.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-0 pb-0 divide-y divide-border/60">
            {blockers.map((blocker) => {
              const deptMit = (blocker as any).department_mits;
              const dept = deptMit?.department as Department | undefined;
              const deptColor = dept ? DEPARTMENT_COLORS[dept] : undefined;

              return (
                <div key={blocker.id} className="flex items-start gap-4 px-4 py-4">
                  {/* Left: severity + dept */}
                  <div className="flex flex-col gap-2 w-28 shrink-0 pt-0.5">
                    <Badge className={`text-[10px] w-fit ${SEVERITY_STYLES[blocker.severity] ?? 'bg-slate-400 text-white'}`}>
                      {(blocker.severity ?? 'unknown').toUpperCase()}
                    </Badge>
                    {dept && deptColor && (
                      <span
                        className="text-[11px] font-medium px-1.5 py-0.5 rounded w-fit"
                        style={{
                          backgroundColor: deptColor + '22',
                          color: deptColor,
                        }}
                      >
                        {dept}
                      </span>
                    )}
                  </div>

                  {/* Center: content */}
                  <div className="flex-1 min-w-0">
                    {deptMit?.title && (
                      <p className="text-xs font-medium text-muted-foreground mb-1 truncate">
                        {deptMit.title}
                      </p>
                    )}
                    <p className="text-sm leading-snug">{blocker.description}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-muted-foreground">
                        Reported by <span className="font-medium">{blocker.reported_by}</span>
                      </span>
                      <span className="text-muted-foreground/30">·</span>
                      <AgeLabel createdAt={blocker.created_at} />
                    </div>
                  </div>

                  {/* Right: resolve */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleResolve(blocker.id)}
                    className="gap-1.5 shrink-0"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Resolve
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
