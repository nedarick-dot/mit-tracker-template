import { useCarryForwardItems, getDayName } from '@/hooks/use-carry-forward';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, RotateCcw } from 'lucide-react';

interface Props {
  department: string;
  onPrefill: (mitId: string, text: string) => void;
}

export default function CarryForwardBanner({ department, onPrefill }: Props) {
  const { data: items } = useCarryForwardItems(department || undefined);

  if (!department || !items || items.length === 0) return null;

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold flex items-center gap-1.5 text-amber-700">
        <RotateCcw className="h-3.5 w-3.5" />
        Carried Forward — Unfinished from prior weeks
      </h2>
      {items.map((item) => {
        const dayName = getDayName(item.input_date);
        const mitTitle = (item as any).department_mits?.title || 'Unknown MIT';
        return (
          <Card key={item.id} className="border-amber-200 bg-amber-50/40">
            <CardContent className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700 gap-1">
                      <ArrowRight className="h-2.5 w-2.5" />
                      Carried from {dayName}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{item.input_date}</span>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">{mitTitle}</p>
                  <p className="text-sm mt-0.5">{item.update_text}</p>
                  {(item as any).what_completed && (
                    <p className="text-xs text-green-700 mt-1">✅ Partially done: {(item as any).what_completed}</p>
                  )}
                  {item.blockers && (
                    <p className="text-xs text-destructive mt-1">⚠️ {item.blockers}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 text-xs h-7 border-amber-300 text-amber-700 hover:bg-amber-100"
                  onClick={() => onPrefill(item.department_mit_id, item.update_text)}
                >
                  Continue this week
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
