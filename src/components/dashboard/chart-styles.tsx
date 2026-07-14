import { useEffect, useState } from "react";

type ChartTooltipPayload = {
  name?: string;
  value?: number | string;
};

type ChartTooltipContentProps = {
  active?: boolean;
  payload?: ChartTooltipPayload[];
  label?: string | number;
};

export const chartTooltipContentStyle = {
  backgroundColor: "var(--background)",
  border: "1px solid var(--border)",
  borderRadius: "0.5rem",
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
};

export const chartTooltipLabelStyle = {
  color: "var(--foreground)",
  fontWeight: 50,
};

export const chartTooltipItemStyle = {
  color: "var(--muted-foreground)",
};

// Helper to get computed style from CSS custom properties
export const getComputedColor = (cssVar: string): string => {
  if (typeof window === "undefined") return "#000";
  const computed = getComputedStyle(document.documentElement);
  return computed.getPropertyValue(cssVar).trim() || "#000";
};

export const useChartColors = () => {
  const [colors, setColors] = useState<string[]>([]);

  const updateColors = () => {
    const newColors = [
      getComputedColor("--primary"),
      getComputedColor("--secondary"),
      getComputedColor("--accent"),
      getComputedColor("--destructive"),
      getComputedColor("--muted"),
    ];
    setColors(newColors);
  };

  useEffect(() => {
    updateColors();
    
    const observer = new MutationObserver(updateColors);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });
    return () => observer.disconnect();
  }, []);

  return colors;
};

export function ChartTooltipContent({
  active,
  payload,
  label,
}: ChartTooltipContentProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2 shadow-md">
      {label && <p className="mb-1 text-sm font-medium text-foreground">{label}</p>}
      <div className="space-y-0.5">
        {payload.map((entry, index) => (
          <p key={index} className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{entry.name}:</span> {entry.value}
          </p>
        ))}
      </div>
    </div>
  );
}
