import { LinkButton } from "@/components/ui/link-button";
import { Routes } from "@/constants";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center space-y-6 text-center">
      <div className="rounded-full bg-muted p-4">
        <FileQuestion className="h-10 w-10 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <h2 className="text-4xl font-bold">404</h2>
        <p className="text-lg text-muted-foreground">Page not found</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
      </div>
      <LinkButton href={Routes.HOME}>Return Home</LinkButton>
    </div>
  );
}
