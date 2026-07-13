import { LinkButton } from "@/components/ui/link-button";
import { Routes } from "@/constants";
import { ShieldX } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center space-y-6 text-center">
      <div className="rounded-full bg-destructive/10 p-4">
        <ShieldX className="h-10 w-10 text-destructive" />
      </div>
      <div className="space-y-2">
        <h2 className="text-4xl font-bold text-destructive">401</h2>
        <p className="text-lg text-muted-foreground">Unauthorized access</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          You do not have the necessary permissions to view this page.
        </p>
      </div>
      <LinkButton href={Routes.DASHBOARD}>Return to Dashboard</LinkButton>
    </div>
  );
}
