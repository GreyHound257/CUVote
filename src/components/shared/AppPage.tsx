import { cn } from "@/lib/utils";

interface AppPageProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "4xl" | "7xl" | "full";
}

const maxWidthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "4xl": "max-w-4xl",
  "7xl": "max-w-7xl",
  full: "max-w-full",
};

export function AppPage({ children, className, maxWidth = "7xl" }: AppPageProps) {
  return (
    <div className={cn("relative mx-auto w-full", maxWidthClasses[maxWidth], className)}>
      <div className="pointer-events-none absolute -top-16 right-0 h-48 w-48 rounded-full bg-primary/5 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-32 w-32 rounded-full bg-primary/5 blur-3xl" />
      <div className="relative">{children}</div>
    </div>
  );
}
