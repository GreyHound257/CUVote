import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";
import type { ResultPosition } from "@/types/results";

type WinnerSummaryProps = {
  positions: ResultPosition[];
};

export function WinnerSummary({ positions }: WinnerSummaryProps) {
  const positionsWithWinners = positions.filter((p) => p.winners.length > 0);

  if (positionsWithWinners.length === 0) return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="h-5 w-5 text-yellow-600" />
          Winners Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {positionsWithWinners.map((pos) => (
            <div key={pos.id} className="rounded-lg border bg-background p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {pos.title}
              </p>
              <div className="mt-1 space-y-1">
                {pos.winners.map((winner) => (
                  <p key={winner.id} className="flex items-center gap-2 font-medium">
                    {winner.name}
                    {winner.isTie && (
                      <Badge variant="secondary" className="text-xs">
                        Tie
                      </Badge>
                    )}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
