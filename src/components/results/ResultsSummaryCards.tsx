import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, Percent, Trophy } from "lucide-react";

type ResultsSummaryCardsProps = {
  totalTurnout: number;
  eligibleVoters: number;
  turnoutRate: number;
  positionCount: number;
  winnerCount: number;
  status?: string;
  isLive?: boolean;
};

export function ResultsSummaryCards({
  totalTurnout,
  eligibleVoters,
  turnoutRate,
  positionCount,
  winnerCount,
  status,
  isLive,
}: ResultsSummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Voter Turnout</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalTurnout}</div>
          <p className="text-xs text-muted-foreground">
            of {eligibleVoters} eligible voters
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Turnout Rate</CardTitle>
          <Percent className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{turnoutRate}%</div>
          <p className="text-xs text-muted-foreground">Participation rate</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Positions</CardTitle>
          <UserCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{positionCount}</div>
          <p className="text-xs text-muted-foreground">
            {status ? status.replace(/_/g, " ") : "Election positions"}
            {isLive ? " · Live" : ""}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Winners Declared</CardTitle>
          <Trophy className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{winnerCount}</div>
          <p className="text-xs text-muted-foreground">Across all positions</p>
        </CardContent>
      </Card>
    </div>
  );
}
