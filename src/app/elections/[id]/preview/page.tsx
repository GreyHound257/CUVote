"use client";

import { use, useEffect, useState } from "react";
import { AppPage } from "@/components/shared/AppPage";
import { PageHeader } from "@/components/shared/PageHeader";
import { GlassCard } from "@/components/shared/GlassCard";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/link-button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye } from "lucide-react";

type PreviewData = {
  election: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    eligibilityLevels: number[];
    department: { name: string; code: string };
    academicSession: { name: string } | null;
  };
  positions: {
    id: string;
    title: string;
    description: string | null;
    candidates: {
      id: string;
      manifesto: string | null;
      slogan: string | null;
      photoUrl: string | null;
      student: { fullName: string; matricNo: string; level: number };
    }[];
  }[];
};

export default function ElectionPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/elections/${id}/preview`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setData(json.data);
        else {
          setError(json.error || "Failed to load preview");
          toast.error(json.error || "Failed to load preview");
        }
      })
      .catch(() => setError("Failed to load preview"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <AppPage>
        <LoadingState message="Loading ballot preview…" />
      </AppPage>
    );
  }

  if (error || !data) {
    return (
      <AppPage>
        <EmptyState title="Preview unavailable" description={error || "Not found"} />
        <LinkButton href="/elections" variant="outline" className="rounded-full">
          Back to Elections
        </LinkButton>
      </AppPage>
    );
  }

  const levelsLabel =
    !data.election.eligibilityLevels?.length
      ? "All levels"
      : data.election.eligibilityLevels.map((l) => `L${l}`).join(", ");

  return (
    <AppPage>
      <PageHeader
        title="Ballot Preview"
        description="Exactly how students will see approved candidates — no votes are recorded here."
        action={
          <LinkButton href="/elections" variant="outline" className="rounded-full">
            Back to Elections
          </LinkButton>
        }
      />

      <GlassCard className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <Badge variant="secondary">Preview mode</Badge>
          <Badge variant="outline">{data.election.status.replace(/_/g, " ")}</Badge>
        </div>
        <h2 className="text-2xl font-semibold">{data.election.title}</h2>
        {data.election.description && (
          <p className="text-muted-foreground">{data.election.description}</p>
        )}
        <p className="text-sm text-muted-foreground">
          {data.election.department.name} ({data.election.department.code})
          {data.election.academicSession
            ? ` · ${data.election.academicSession.name}`
            : ""}{" "}
          · Eligible: {levelsLabel}
        </p>
      </GlassCard>

      <div className="space-y-6">
        {data.positions.map((pos) => (
          <GlassCard key={pos.id} className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">{pos.title}</h3>
              {pos.description && (
                <p className="text-sm text-muted-foreground">{pos.description}</p>
              )}
            </div>

            {pos.candidates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No approved candidates for this position yet.
              </p>
            ) : (
              <RadioGroup disabled className="space-y-3">
                {pos.candidates.map((cand) => (
                  <div
                    key={cand.id}
                    className="flex items-start gap-3 rounded-xl border border-border/50 bg-background/40 p-4"
                  >
                    <RadioGroupItem value={cand.id} id={`${pos.id}-${cand.id}`} disabled />
                    <Label htmlFor={`${pos.id}-${cand.id}`} className="flex-1 cursor-default space-y-1">
                      <span className="font-medium">{cand.student.fullName}</span>
                      {cand.slogan && (
                        <span className="block text-sm italic text-muted-foreground">
                          &quot;{cand.slogan}&quot;
                        </span>
                      )}
                      {cand.manifesto && (
                        <span className="block text-sm text-muted-foreground line-clamp-3">
                          {cand.manifesto}
                        </span>
                      )}
                      <LinkButton
                        href={`/candidates/${cand.id}`}
                        size="sm"
                        variant="link"
                        className="h-auto p-0 text-xs"
                      >
                        Open public profile
                      </LinkButton>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          </GlassCard>
        ))}
      </div>
    </AppPage>
  );
}
