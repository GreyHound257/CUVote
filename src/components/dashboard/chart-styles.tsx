import type { TooltipProps } from "recharts";

export const chartTooltipContentStyle = {
  backgroundColor: "var(--background)",
  border: "1px solid var(--border)",
  borderRadius: "0.5rem",
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
};

export const chartTooltipLabelStyle = {
  color: "var(--foreground)",
  fontWeight: 500,
};

export const chartTooltipItemStyle = {
  color: "var(--muted-foreground)",
};

export function ChartTooltipContent({
  active,
  payload,
  label,
}: TooltipProps<number, string>) {
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
