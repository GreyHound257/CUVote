export type ResultCandidate = {
  id: string;
  name: string;
  manifesto?: string | null;
  slogan?: string | null;
  photoUrl?: string | null;
  voteCount: number;
  percentage: number;
  isTie: boolean;
  isWinner: boolean;
};

export type ResultPosition = {
  id: string;
  title: string;
  description: string | null;
  totalVotes: number;
  winners: { id: string; name: string; isTie: boolean }[];
  candidates: ResultCandidate[];
};

export type ElectionResultsPayload = {
  id: string;
  title: string;
  status: string;
  department: { name: string; code: string };
  totalTurnout: number;
  eligibleVoters: number;
  turnoutRate: number;
  hasGeneratedResults: boolean;
  publishedAt: string | null;
  isLive: boolean;
  positions: ResultPosition[];
};
