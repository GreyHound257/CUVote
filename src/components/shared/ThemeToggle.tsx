"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun, Check } from "lucide-react";
import { useTheme } from "@/components/shared/ThemeProvider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type ThemeOption = "light" | "dark" | "system";

const THEME_OPTIONS: {
  value: ThemeOption;
  label: string;
  description: string;
  icon: typeof Sun;
}[] = [
  {
    value: "light",
    label: "Light",
    description: "Bright, clean interface",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Dark",
    description: "Easier on the eyes in low light",
    icon: Moon,
  },
  {
    value: "system",
    label: "System",
    description: "Match your device preference",
    icon: Monitor,
  },
];

function ThemeIcon({ resolvedTheme, className }: { resolvedTheme: "light" | "dark"; className?: string }) {
  const Icon = resolvedTheme === "dark" ? Moon : Sun;
  return <Icon className={className} aria-hidden />;
}

/** Compact icon dropdown for TopNav and toolbars */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "min-h-[44px] min-w-[44px] hover:bg-accent/80",
              className
            )}
          >
            <span className="sr-only">Toggle theme</span>
            {mounted ? (
              <ThemeIcon resolvedTheme={resolvedTheme} className="h-5 w-5" />
            ) : (
              <Sun className="h-5 w-5 opacity-0" aria-hidden />
            )}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(value) => {
            if (value === "light" || value === "dark" || value === "system") {
              setTheme(value);
            }
          }}
        >
          <DropdownMenuLabel>Appearance</DropdownMenuLabel>
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
            <DropdownMenuRadioItem key={value} value={value}>
              <Icon className="h-4 w-4" />
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Expanded appearance picker for Settings and profile-style pages */
export function ThemeAppearanceSection() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Appearance</h3>
        <p className="text-sm text-muted-foreground">
          Choose how CUVote looks on this device. System follows your OS light or dark preference.
        </p>
      </div>

      <div
        className="grid gap-3 sm:grid-cols-3"
        role="radiogroup"
        aria-label="Theme preference"
      >
        {THEME_OPTIONS.map(({ value, label, description, icon: Icon }) => {
          const selected = theme === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={!mounted}
              onClick={() => setTheme(value)}
              className={cn(
                "relative flex flex-col items-start gap-3 rounded-xl border px-4 py-4 text-left transition-colors",
                "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                selected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border/50 bg-background/40"
              )}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg",
                    selected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                {selected && (
                  <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                )}
              </div>
              <div>
                <p className="font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {mounted && (
        <p className="text-xs text-muted-foreground">
          Currently showing{" "}
          <span className="font-medium text-foreground">
            {resolvedTheme === "dark" ? "dark" : "light"}
          </span>{" "}
          mode
          {theme === "system" ? " (from system preference)" : ""}.
        </p>
      )}
    </div>
  );
}
