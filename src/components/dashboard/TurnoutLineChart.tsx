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
import { useEffect, useState } from "react";
import { ChartTooltipContent, getComputedColor } from "./chart-styles";

interface TurnoutLineChartProps {
  data: { time: string; votes: number }[];
  title?: string;
}

export function TurnoutLineChart({ data, title }: TurnoutLineChartProps) {
  const [themeColors, setThemeColors] = useState({
    primary: "#000",
    border: "#000",
    mutedForeground: "#000",
  });

  useEffect(() => {
    const updateColors = () => {
      setThemeColors({
        primary: getComputedColor("--primary"),
        border: getComputedColor("--border"),
        mutedForeground: getComputedColor("--muted-foreground"),
      });
    };

    updateColors();

    const observer = new MutationObserver(updateColors);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="h-[300px] w-full">
      {title && <h3 className="mb-4 text-sm font-medium text-muted-foreground">{title}</h3>}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={themeColors.border} />
          <XAxis
            dataKey="time"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tick={{ fill: themeColors.mutedForeground }}
          />
          <YAxis
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tick={{ fill: themeColors.mutedForeground }}
          />
          <Tooltip content={<ChartTooltipContent />} />
          <Line
            type="monotone"
            dataKey="votes"
            stroke={themeColors.primary}
            strokeWidth={2}
            dot={{ fill: themeColors.primary, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
