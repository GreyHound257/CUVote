"use client";

import { use, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { AppPage } from "@/components/shared/AppPage";
import { PageHeader } from "@/components/shared/PageHeader";
import { GlassCard } from "@/components/shared/GlassCard";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/link-button";
import { Button } from "@/components/ui/button";
import { CandidateForm } from "@/components/candidates/CandidateForm";
import { Roles } from "@/constants";
import { toast } from "sonner";

type CandidateProfile = {
  id: string;
  status: string;
  slogan: string | null;
  manifesto: string | null;
  visionStatement: string | null;
  photoUrl: string | null;
  student: {
    fullName: string;
    matricNo: string;
    level: number;
    department: { name: string; code: string };
  };
  election: {
    id: string;
    title: string;
    status: string;
    academicSession: { name: string } | null;
  };
  position: { title: string; description: string | null };
};

export default function CandidateProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session } = useSession();
  const role = session?.user?.role;
  const canEdit = role === Roles.SUPER_ADMIN || role === Roles.DEPARTMENT_ADMIN;

  const [data, setData] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const load = () => {
    setLoading(true);
    fetch(`/api/candidates/${id}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setData(json.data);
          setError(null);
        } else {
          setError(json.error || "Failed to load profile");
          toast.error(json.error || "Failed to load profile");
        }
      })
      .catch(() => setError("Failed to load profile"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <AppPage>
        <LoadingState message="Loading candidate profile…" />
      </AppPage>
    );
  }

  if (error || !data) {
    return (
      <AppPage>
        <EmptyState
          title="Profile unavailable"
          description={error || "Candidate not found"}
        />
        <LinkButton href="/candidates" variant="outline" className="rounded-full">
          Back
        </LinkButton>
      </AppPage>
    );
  }

  return (
    <AppPage>
      <PageHeader
        title={data.student.fullName}
        description={`Contesting ${data.position.title} · ${data.election.title}`}
        action={
          <div className="flex flex-wrap gap-2">
            {canEdit && (
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() => setEditing((v) => !v)}
              >
                {editing ? "Close editor" : "Edit profile"}
              </Button>
            )}
            <LinkButton
              href={canEdit ? "/candidates" : "/vote"}
              variant="ghost"
              className="rounded-full"
            >
              Back
            </LinkButton>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <GlassCard className="flex flex-col items-center gap-4 text-center">
          {data.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.photoUrl}
              alt={data.student.fullName}
              className="h-40 w-40 rounded-full border object-cover"
            />
          ) : (
            <div className="flex h-40 w-40 items-center justify-center rounded-full bg-muted text-4xl font-bold text-muted-foreground">
              {data.student.fullName.charAt(0)}
            </div>
          )}
          <div>
            <Badge variant={data.status === "APPROVED" ? "default" : "secondary"}>
              {data.status.replace(/_/g, " ")}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>{data.student.matricNo}</p>
            <p>
              {data.student.department.name} · Level {data.student.level}
            </p>
            {data.election.academicSession && (
              <p>{data.election.academicSession.name}</p>
            )}
          </div>
        </GlassCard>

        <div className="space-y-4">
          {data.slogan && (
            <GlassCard>
              <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Slogan
              </p>
              <p className="mt-2 text-xl italic">&quot;{data.slogan}&quot;</p>
            </GlassCard>
          )}

          <GlassCard>
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Vision
            </p>
            <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
              {data.visionStatement || "No vision statement provided yet."}
            </p>
          </GlassCard>

          <GlassCard>
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Manifesto
            </p>
            <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
              {data.manifesto || "No manifesto provided yet."}
            </p>
          </GlassCard>

          {canEdit && editing && (
            <GlassCard>
              <h3 className="mb-4 font-semibold">Edit campaign profile</h3>
              <CandidateForm
                candidateId={data.id}
                initialData={data}
                onSuccess={() => {
                  setEditing(false);
                  load();
                }}
              />
            </GlassCard>
          )}
        </div>
      </div>
    </AppPage>
  );
}
