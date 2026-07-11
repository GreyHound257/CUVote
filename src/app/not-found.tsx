import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Routes } from "@/constants";

export default function NotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center space-y-4">
      <h2 className="text-4xl font-bold">404</h2>
      <p className="text-xl text-muted-foreground">Page Not Found</p>
      <Button render={<Link href={Routes.HOME} />}>
        Return Home
      </Button>
    </div>
  );
}
