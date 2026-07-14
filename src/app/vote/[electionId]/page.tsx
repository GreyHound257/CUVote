"use client";

import { logger } from "@/utils/logger";
import { useEffect, useMemo, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AppPage } from "@/components/shared/AppPage";
import { GlassCard } from "@/components/shared/GlassCard";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";

interface Candidate {
  id: string;
  manifesto: string | null;
  slogan: string | null;
  visionStatement?: string | null;
  photoUrl: string | null;
  student: {
    fullName: string;
  };
}

interface Position {
  id: string;
  title: string;
  description: string | null;
  maxCandidates: number;
  hasVoted: boolean;
  candidates: Candidate[];
}

interface Election {
  id: string;
  title: string;
  description: string | null;
}

export default function BallotPage({ params }: { params: Promise<{ electionId: string }> }) {
  const router = useRouter();
  const { electionId } = use(params);

  const [election, setElection] = useState<Election | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentStep, setCurrentStep] = useState(0);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [confirmedFinal, setConfirmedFinal] = useState(false);

  useEffect(() => {
    async function fetchBallot() {
      try {
        const res = await fetch(`/api/vote/ballot?electionId=${electionId}`);
        const json = await res.json();

        if (!res.ok) throw new Error(json.error || "Failed to load ballot");

        setElection(json.data.election);
        setPositions(
          (json.data.positions as Position[]).filter((p) => !p.hasVoted)
        );
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }
    fetchBallot();
  }, [electionId]);

  const fillablePositions = useMemo(
    () => positions.filter((p) => p.candidates.length > 0),
    [positions]
  );

  const incompletePositions = useMemo(
    () => fillablePositions.filter((p) => !selections[p.id]),
    [fillablePositions, selections]
  );

  const allSelectionsComplete = incompletePositions.length === 0;

  const handleSelection = (positionId: string, candidateId: string) => {
    setSelections((prev) => ({ ...prev, [positionId]: candidateId }));
  };

  const nextStep = () => {
    if (currentStep < positions.length) {
      setCurrentStep((prev) => prev + 1);
      setConfirmedFinal(false);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      setConfirmedFinal(false);
    }
  };

  const goToPosition = (index: number) => {
    setCurrentStep(index);
    setConfirmedFinal(false);
  };

  const submitVote = async () => {
    if (isSubmitting) return;

    if (!allSelectionsComplete) {
      toast.error("Incomplete ballot", {
        description: "Select a candidate for every position before submitting.",
      });
      return;
    }

    if (!confirmedFinal) {
      toast.error("Please confirm your ballot is final before submitting.");
      return;
    }

    setIsSubmitting(true);

    const votesPayload = fillablePositions.map((pos) => ({
      positionId: pos.id,
      candidateId: selections[pos.id],
    }));

    try {
      const res = await fetch("/api/vote/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ electionId, votes: votesPayload }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          toast.error("Duplicate vote blocked", {
            description: data.error || "You have already voted in this election.",
          });
        } else {
          toast.error("Submission failed", { description: data.error });
        }
        return;
      }

      setSuccess(true);
      toast.success("Ballot submitted", {
        description: "Your vote was recorded anonymously and cannot be changed.",
      });
    } catch (err: unknown) {
      logger.error(err instanceof Error ? err.message : String(err));
      toast.error("Network error while submitting your vote.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppPage maxWidth="2xl">
        <Skeleton className="mb-4 h-10 w-1/2" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </AppPage>
    );
  }

  if (error) {
    return (
      <AppPage maxWidth="2xl">
        <GlassCard className="border-destructive/30 bg-destructive/5">
          <Alert variant="destructive" className="border-0 bg-transparent">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Cannot open ballot</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </GlassCard>
        <Button className="mt-4 rounded-full" onClick={() => router.push("/vote")}>
          Back to Voting
        </Button>
      </AppPage>
    );
  }

  if (success) {
    return (
      <AppPage maxWidth="xl">
        <GlassCard className="space-y-4 text-center">
          <CheckCircle2 className="mx-auto h-16 w-16 text-green-600" />
          <h1 className="text-3xl font-bold tracking-tight">Ballot recorded</h1>
          <p className="text-muted-foreground">
            Thank you for voting in <span className="font-medium text-foreground">{election?.title}</span>.
            Your choices are anonymous and permanent — they cannot be viewed or altered by anyone,
            including administrators.
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            <LinkButton href="/vote" className="rounded-full">
              Voting dashboard
            </LinkButton>
            <LinkButton href="/vote/history" variant="outline" className="rounded-full">
              Voting history
            </LinkButton>
          </div>
        </GlassCard>
      </AppPage>
    );
  }

  if (!positions || positions.length === 0) {
    return (
      <AppPage maxWidth="2xl">
        <GlassCard className="space-y-4 text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">You’re all set</h1>
          <p className="text-muted-foreground">
            You have already cast your ballot for this election. Selections stay private.
          </p>
          <LinkButton href="/vote" className="rounded-full">
            Return to Voting
          </LinkButton>
        </GlassCard>
      </AppPage>
    );
  }

  const isReviewStep = currentStep === positions.length;
  const currentPosition = !isReviewStep ? positions[currentStep] : null;
  const totalSteps = positions.length + 1;
  const progressPercentage = (currentStep / positions.length) * 100;

  return (
    <AppPage maxWidth="2xl">
      <div className="mb-6 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Secure ballot
            </p>
            <h1 className="text-2xl font-bold tracking-tight">{election?.title}</h1>
            {election?.description && (
              <p className="mt-1 text-sm text-muted-foreground">{election.description}</p>
            )}
          </div>
          <Badge variant="outline" className="rounded-full">
            {isReviewStep ? "Review" : `Position ${currentStep + 1} of ${positions.length}`}
          </Badge>
        </div>

        <Progress value={progressPercentage} className="h-2" />
        <div className="flex flex-wrap gap-1.5">
          {positions.map((pos, idx) => {
            const done = !!selections[pos.id] || pos.candidates.length === 0;
            const active = idx === currentStep;
            return (
              <button
                key={pos.id}
                type="button"
                onClick={() => goToPosition(idx)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : done
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {idx + 1}. {pos.title}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => goToPosition(positions.length)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              isReviewStep
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Review
          </button>
        </div>
        <p className="text-right text-xs text-muted-foreground">
          Step {currentStep + 1} of {totalSteps}
        </p>
      </div>

      {!isReviewStep && currentPosition && (
        <GlassCard className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">{currentPosition.title}</h2>
            {currentPosition.description && (
              <p className="mt-1 text-sm text-muted-foreground">{currentPosition.description}</p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              Choose one candidate for this position. You can change your mind until you submit.
            </p>
          </div>

          {currentPosition.candidates.length === 0 ? (
            <p className="italic text-muted-foreground">
              No approved candidates for this position — it will be skipped.
            </p>
          ) : (
            <RadioGroup
              value={selections[currentPosition.id] || ""}
              onValueChange={(val) => {
                if (val) handleSelection(currentPosition.id, val);
              }}
              className="space-y-3"
            >
              {currentPosition.candidates.map((candidate) => {
                const selected = selections[currentPosition.id] === candidate.id;
                return (
                  <div
                    key={candidate.id}
                    className={`flex items-start gap-3 rounded-xl border p-4 transition-all ${
                      selected
                        ? "border-transparent bg-primary/5 ring-2 ring-primary"
                        : "border-border/50 hover:bg-muted/40"
                    }`}
                  >
                    <RadioGroupItem value={candidate.id} id={candidate.id} className="mt-1" />
                    <Label htmlFor={candidate.id} className="flex-1 cursor-pointer space-y-1">
                      <div className="flex items-start gap-3">
                        {candidate.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={candidate.photoUrl}
                            alt=""
                            className="h-12 w-12 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary text-lg font-bold text-secondary-foreground">
                            {candidate.student.fullName.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-lg font-semibold">{candidate.student.fullName}</p>
                          {candidate.slogan && (
                            <p className="text-sm italic text-muted-foreground">
                              &quot;{candidate.slogan}&quot;
                            </p>
                          )}
                          {candidate.visionStatement && (
                            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                              {candidate.visionStatement}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-3">
                            <Link
                              href={`/candidates/${candidate.id}`}
                              className="text-xs font-medium text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Full profile
                            </Link>
                            {candidate.manifesto && (
                              <Dialog>
                                <DialogTrigger
                                  render={
                                    <button
                                      type="button"
                                      className="text-xs font-medium text-primary hover:underline"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      Read manifesto
                                    </button>
                                  }
                                />
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>
                                      {candidate.student.fullName}&apos;s manifesto
                                    </DialogTitle>
                                  </DialogHeader>
                                  <div className="mt-2 max-h-[60vh] overflow-y-auto whitespace-pre-wrap text-sm">
                                    {candidate.manifesto}
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                          </div>
                        </div>
                      </div>
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          )}

          <div className="flex justify-between gap-2 border-t border-border/50 pt-4">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={prevStep}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            <Button
              type="button"
              className="rounded-full"
              onClick={nextStep}
              disabled={
                currentPosition.candidates.length > 0 && !selections[currentPosition.id]
              }
            >
              {currentStep === positions.length - 1 ? "Go to review" : "Next"}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </GlassCard>
      )}

      {isReviewStep && (
        <GlassCard className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold">Review your ballot</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Confirm each choice below. Submitting is final — your ballot cannot be changed.
            </p>
          </div>

          <Alert className="border-amber-500/40 bg-amber-500/10 text-foreground">
            <AlertCircle className="h-4 w-4 text-amber-700 dark:text-amber-400" />
            <AlertTitle>Final submission</AlertTitle>
            <AlertDescription>
              Votes are anonymous and immutable. Administrators cannot see who you selected.
            </AlertDescription>
          </Alert>

          {!allSelectionsComplete && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Incomplete ballot</AlertTitle>
              <AlertDescription>
                Missing selection for:{" "}
                {incompletePositions.map((p) => p.title).join(", ")}. Use Change to go back.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            {positions.map((pos, idx) => {
              const selectedId = selections[pos.id];
              const candidate = pos.candidates.find((c) => c.id === selectedId);
              const skippedEmpty = pos.candidates.length === 0;

              return (
                <div
                  key={pos.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/50 bg-background/40 px-4 py-3"
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {pos.title}
                    </p>
                    <p className="text-lg font-medium">
                      {skippedEmpty ? (
                        <span className="italic text-muted-foreground">No candidates — skipped</span>
                      ) : candidate ? (
                        candidate.student.fullName
                      ) : (
                        <span className="italic text-destructive">Not selected</span>
                      )}
                    </p>
                    {candidate?.slogan && (
                      <p className="text-sm italic text-muted-foreground">
                        &quot;{candidate.slogan}&quot;
                      </p>
                    )}
                  </div>
                  {!skippedEmpty && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => goToPosition(idx)}
                    >
                      Change
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/50 bg-background/40 p-4">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-primary"
              checked={confirmedFinal}
              onChange={(e) => setConfirmedFinal(e.target.checked)}
            />
            <span className="text-sm">
              I have reviewed my selections and understand that submitting this ballot is{" "}
              <strong>final and irreversible</strong>.
            </span>
          </label>

          <div className="flex flex-wrap justify-between gap-2 border-t border-border/50 pt-4">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={prevStep}
              disabled={isSubmitting}
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Back to edit
            </Button>
            <Button
              type="button"
              className="rounded-full"
              onClick={submitVote}
              disabled={isSubmitting || !allSelectionsComplete || !confirmedFinal}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…
                </>
              ) : (
                <>
                  <ShieldCheck className="mr-2 h-4 w-4" /> Confirm & submit vote
                </>
              )}
            </Button>
          </div>
        </GlassCard>
      )}
    </AppPage>
  );
}
