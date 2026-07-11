import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Routes } from "@/constants";

export default function UnauthorizedPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center space-y-4">
      <h2 className="text-4xl font-bold text-destructive">401</h2>
      <p className="text-xl text-muted-foreground">Unauthorized Access</p>
      <p className="text-muted-foreground text-center max-w-sm">
        You do not have the necessary permissions to view this page.
      </p>
      <Button render={<Link href={Routes.DASHBOARD} />}>
        Return to Dashboard
      </Button>
    </div>
  );
}
