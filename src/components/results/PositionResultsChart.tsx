"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { ChartTooltipContent } from "@/components/dashboard/chart-styles";
import type { ResultCandidate } from "@/types/results";

const BAR_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--muted-foreground))",
  "hsl(var(--chart-2, var(--primary)))",
  "hsl(var(--chart-3, var(--muted-foreground)))",
  "hsl(var(--chart-4, var(--primary)))",
];

type PositionResultsChartProps = {
  candidates: ResultCandidate[];
  className?: string;
};

export function PositionResultsChart({ candidates, className }: PositionResultsChartProps) {
  if (candidates.length === 0) return null;

  const chartData = candidates.map((c) => ({
    name: c.name.length > 14 ? `${c.name.slice(0, 14)}…` : c.name,
    votes: c.voteCount,
    isWinner: c.isWinner,
  }));

  return (
    <div className={className ?? "h-[220px] w-full"}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="name"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            allowDecimals={false}
            fontSize={12}
            tickLine={false}
            axisLine={false}
            width={32}
          />
          <Tooltip content={<ChartTooltipContent />} />
          <Bar dataKey="votes" name="Votes" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={entry.name}
                fill={
                  entry.isWinner
                    ? "hsl(var(--primary))"
                    : BAR_COLORS[index % BAR_COLORS.length]
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
