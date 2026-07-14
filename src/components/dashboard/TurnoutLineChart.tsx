"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { ChartTooltipContent } from "./chart-styles";

interface TurnoutLineChartProps {
  data: { time: string; votes: number }[];
  title?: string;
}

export function TurnoutLineChart({ data, title }: TurnoutLineChartProps) {
  return (
    <div className="h-[300px] w-full">
      {title && <h3 className="mb-4 text-sm font-medium text-muted-foreground">{title}</h3>}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="time"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)" }}
          />
          <YAxis
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)" }}
          />
          <Tooltip content={<ChartTooltipContent />} />
          <Line
            type="monotone"
            dataKey="votes"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={{ fill: "var(--primary)", r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
