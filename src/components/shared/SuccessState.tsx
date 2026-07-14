import { GlassCard } from "./GlassCard";
import { CheckCircle2, Check } from "lucide-react";
import { useEffect, useState } from "react";

interface SuccessStateProps {
  title: string;
  description: string;
  children?: React.ReactNode;
}

export function SuccessState({
  title,
  description,
  children,
}: SuccessStateProps) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setAnimate(true);
  }, []);

  return (
    <GlassCard className="space-y-4 text-center">
      <div className="relative mx-auto h-20 w-20">
        <div
          className={`absolute inset-0 rounded-full bg-primary/10 ${
            animate
              ? "scale-100 opacity-100 transition-all duration-500"
              : "scale-90 opacity-0"
          }`}
        />
        <CheckCircle2
          className={`mx-auto h-20 w-20 text-primary ${
            animate
              ? "scale-100 opacity-100 transition-all duration-500 delay-100"
              : "scale-90 opacity-0"
          }`}
        />
        <svg
          className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M5 12L9 16L19 6"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary"
            style={{
              strokeDasharray: 30,
              strokeDashoffset: animate ? 0 : 30,
              transition: "stroke-dashoffset 0.6s ease-in-out 0.2s",
            }}
          />
        </svg>
      </div>
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <p className="text-muted-foreground">{description}</p>
      {children && <div className="flex flex-wrap justify-center gap-2 pt-2">{children}</div>}
    </GlassCard>
  );
}
