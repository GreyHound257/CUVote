"use client";
import { logger } from "@/utils/logger";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";

interface Candidate {
  id: string;
  manifesto: string | null;
  slogan: string | null;
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
  const unwrappedParams = use(params);
  const { electionId } = unwrappedParams;

  const [election, setElection] = useState<Election | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentStep, setCurrentStep] = useState(0);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function fetchBallot() {
      try {
        const res = await fetch(`/api/vote/ballot?electionId=${electionId}`);
        const { data, error } = await res.json();

        if (!res.ok) throw new Error(error || "Failed to load ballot");

        setElection(data.election);
        setPositions(data.positions.filter((p: Position) => !p.hasVoted)); // Only show un-voted positions
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchBallot();
  }, [electionId]);

  const handleSelection = (positionId: string, candidateId: string) => {
    setSelections(prev => ({ ...prev, [positionId]: candidateId }));
  };

  const nextStep = () => {
    if (currentStep < positions.length) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const submitVote = async () => {
    if (isSubmitting) return; // Debounce safeguard
    setIsSubmitting(true);

    const votesPayload = Object.entries(selections).map(([positionId, candidateId]) => ({
      positionId,
      candidateId,
    }));

    if (votesPayload.length === 0) {
      toast.error("No selections made");
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/vote/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ electionId, votes: votesPayload }),
      });

      const data = await res.json();

      if (!res.ok) {
         if (res.status === 409) {
             toast.error("Duplicate Vote Detected", {
                description: "You have already voted for one or more of these positions."
             });
         } else {
             toast.error("Submission Failed", { description: data.error });
         }
         throw new Error(data.error);
      }

      setSuccess(true);
      toast.success("Vote Submitted", { description: "Your anonymous ballot has been securely cast." });
    } catch (err: any) {
      logger.error(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 max-w-3xl">
        <Skeleton className="h-10 w-1/2 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 max-w-3xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={() => router.push("/vote")}>Back to Dashboard</Button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="container mx-auto py-8 max-w-xl text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-green-500 mb-4" />
        <h1 className="text-3xl font-bold tracking-tight mb-2">Vote Recorded</h1>
        <p className="text-muted-foreground mb-8">
          Thank you for participating. Your selections have been securely and anonymously stored.
        </p>
        <Link href="/vote">
          <Button>Return to Dashboard</Button>
        </Link>
      </div>
    );
  }

  if (!positions || positions.length === 0) {
    return (
      <div className="container mx-auto py-8 max-w-3xl text-center">
        <h1 className="text-3xl font-bold tracking-tight mb-4">You’re all set!</h1>
        <p className="text-muted-foreground mb-8">
          You have already cast your vote for all available positions in this election.
        </p>
        <Link href="/vote">
          <Button>Return to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const isReviewStep = currentStep === positions.length;
  const currentPosition = !isReviewStep ? positions[currentStep] : null;
  const progressPercentage = ((currentStep) / positions.length) * 100;

  return (
    <div className="container mx-auto py-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{election?.title}</h1>
        <div className="w-full bg-secondary h-2 mt-4 rounded-full overflow-hidden">
          <div
            className="bg-primary h-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <p className="text-sm text-muted-foreground mt-2 text-right">
          Step {currentStep + 1} of {positions.length + 1}
        </p>
      </div>

      {!isReviewStep && currentPosition && (
        <Card>
          <CardHeader>
            <CardTitle>{currentPosition.title}</CardTitle>
            {currentPosition.description && (
              <CardDescription>{currentPosition.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {currentPosition.candidates.length === 0 ? (
               <p className="text-muted-foreground italic">No approved candidates for this position.</p>
            ) : (
              <RadioGroup
                value={selections[currentPosition.id] || ""}
                onValueChange={(val) => handleSelection(currentPosition.id, val)}
                className="space-y-4"
              >
                {currentPosition.candidates.map((candidate) => (
                  <div key={candidate.id} className="flex items-center space-x-2 border p-4 rounded-lg">
                    <RadioGroupItem value={candidate.id} id={candidate.id} />
                    <Label htmlFor={candidate.id} className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-4">
                        {/* Fallback avatar */}
                        <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-bold shrink-0">
                          {candidate.student.fullName.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-lg">{candidate.student.fullName}</p>
                          {candidate.slogan && <p className="text-sm text-muted-foreground italic">"{candidate.slogan}"</p>}
                        </div>
                        {candidate.manifesto && (
                          <Dialog>
                            <DialogTrigger
                              render={
                                <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                                  Read Manifesto
                                </Button>
                              }
                            />
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>{candidate.student.fullName}’s Manifesto</DialogTitle>
                              </DialogHeader>
                              <div className="mt-4 text-sm whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
                                {candidate.manifesto}
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={prevStep} disabled={currentStep === 0}>
              Back
            </Button>
            <Button
              onClick={nextStep}
              disabled={currentPosition.candidates.length > 0 && !selections[currentPosition.id]}
            >
              Next
            </Button>
          </CardFooter>
        </Card>
      )}

      {isReviewStep && (
        <Card>
          <CardHeader>
            <CardTitle>Review Your Selections</CardTitle>
            <CardDescription>Please review your choices carefully before submitting.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                Submissions are final and cannot be modified. Once submitted, your vote is permanently cast.
              </AlertDescription>
            </Alert>

            <div className="space-y-4 mt-6">
              {positions.map((pos) => {
                const selectedCandidateId = selections[pos.id];
                const candidate = pos.candidates.find(c => c.id === selectedCandidateId);
                return (
                  <div key={pos.id} className="border-b pb-4">
                    <h3 className="font-semibold text-sm text-muted-foreground">{pos.title}</h3>
                    <p className="text-lg font-medium mt-1">
                      {candidate ? candidate.student.fullName : <span className="italic text-muted-foreground">No selection / Skipped</span>}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={prevStep} disabled={isSubmitting}>
              Back to Edit
            </Button>
            <Button onClick={submitVote} disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Confirm & Submit Vote"}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
