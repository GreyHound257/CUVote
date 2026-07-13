"use client";

import { useState } from "react";
import { CandidateListBoard } from "@/components/candidates/CandidateListBoard";
import { CandidateNominationDialog } from "@/components/candidates/CandidateNominationDialog";
import { AppPage } from "@/components/shared/AppPage";
import { PageHeader } from "@/components/shared/PageHeader";
import { LinkButton } from "@/components/ui/link-button";
import { Routes } from "@/constants";
import { ClipboardCheck } from "lucide-react";

export default function CandidatesPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <AppPage>
      <PageHeader
        title="Candidates"
        description="Nominate students and manage candidate profiles."
        action={
          <div className="flex flex-wrap gap-2">
            <LinkButton href={Routes.CANDIDATE_APPROVALS} variant="outline" className="rounded-full">
              <ClipboardCheck className="mr-2 h-4 w-4" /> Approvals
            </LinkButton>
            <CandidateNominationDialog onSuccess={() => setRefreshKey((k) => k + 1)} />
          </div>
        }
      />
      <CandidateListBoard key={refreshKey} />
    </AppPage>
  );
}
