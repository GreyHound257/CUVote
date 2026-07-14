import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { ResultCandidate } from "@/types/results";

type PositionResultsListProps = {
  candidates: ResultCandidate[];
  showPhotos?: boolean;
  variant?: "public" | "compact";
};

export function PositionResultsList({
  candidates,
  showPhotos = false,
  variant = "compact",
}: PositionResultsListProps) {
  if (candidates.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        No candidate data available.
      </p>
    );
  }

  if (variant === "public") {
    return (
      <div className="space-y-6">
        {candidates.map((cand) => (
          <div
            key={cand.id}
            className={`relative rounded-lg border p-4 ${
              cand.isWinner && !cand.isTie
                ? "border-primary/20 bg-primary/5"
                : "bg-card"
            }`}
          >
            {cand.isWinner && !cand.isTie && (
              <div className="absolute -right-3 -top-3">
                <Badge className="border-0 bg-yellow-500 text-white shadow-sm hover:bg-yellow-600">
                  Winner
                </Badge>
              </div>
            )}
            <div className="mb-3 flex flex-col items-center gap-4 sm:flex-row">
              {showPhotos &&
                (cand.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cand.photoUrl}
                    alt={cand.name}
                    className="h-16 w-16 rounded-full border object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-xl font-bold text-muted-foreground">
                    {cand.name.charAt(0)}
                  </div>
                ))}
              <div className="flex-1 text-center sm:text-left">
                <h3 className="flex items-center justify-center gap-2 text-xl font-bold sm:justify-start">
                  {cand.name}
                  {cand.isTie && <Badge variant="secondary">Tie</Badge>}
                </h3>
                {cand.slogan && (
                  <p className="text-sm italic text-muted-foreground">
                    &quot;{cand.slogan}&quot;
                  </p>
                )}
              </div>
              <div className="text-center sm:text-right">
                <div className="text-3xl font-black">{cand.percentage}%</div>
                <div className="text-sm font-medium text-muted-foreground">
                  {cand.voteCount} votes
                </div>
              </div>
            </div>
            <Progress value={cand.percentage} className="h-3 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {candidates.map((cand) => (
        <div key={cand.id} className="space-y-1 rounded-md border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-medium">
              {cand.name}
              {cand.isWinner && !cand.isTie && (
                <Badge className="border-0 bg-yellow-500 text-white hover:bg-yellow-600">
                  Winner
                </Badge>
              )}
              {cand.isTie && <Badge variant="secondary">Tie</Badge>}
            </div>
            <div className="text-sm font-semibold text-muted-foreground">
              {cand.voteCount} votes ({cand.percentage}%)
            </div>
          </div>
          <Progress value={cand.percentage} className="h-2" />
        </div>
      ))}
    </div>
  );
}
