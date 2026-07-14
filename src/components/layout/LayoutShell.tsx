"use client";

import { usePathname } from "next/navigation";
import { TopNav } from "@/components/layout/TopNav";
import { Sidebar } from "@/components/layout/Sidebar";
import { cn } from "@/lib/utils";

function isBareLayout(pathname: string) {
  if (pathname === "/") return true;
  return ["/login", "/setup", "/onboarding", "/forgot-password", "/reset-password"].some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const bare = isBareLayout(pathname);

  if (bare) {
    return <main className="flex-1 overflow-y-auto">{children}</main>;
  }

  return (
    <div className="flex flex-col h-screen">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main
          className={cn(
            "relative flex-1 overflow-y-auto p-4 md:p-8",
            "bg-gradient-to-br from-primary/5 via-background to-muted/30"
          )}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
          <div className="relative">{children}</div>
        </main>
      </div>
    </div>
  );
}
