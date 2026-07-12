import { prisma } from "@/lib/prisma";
import { ElectionStatus } from "@prisma/client";
import { logAuditAction } from "@/lib/audit";

export class ResultService {
  /**
   * Generates or updates results for an election by aggregating anonymized ballots.
   * Admins only. Handles vote counts and tie determination.
   */
  static async generateResults(electionId: string, adminId: string) {
    // 1. Verify election and status
    const election = await prisma.election.findUnique({
      where: { id: electionId },
      include: {
        positions: {
          include: {
            candidates: true,
          },
        },
      },
    });

    if (!election) {
      throw new Error("Election not found");
    }

    // 2. Aggregate votes
    // We group by positionId and candidateId
    const ballotCounts = await prisma.anonymizedBallot.groupBy({
      by: ["positionId", "candidateId"],
      where: {
        electionId: electionId,
      },
      _count: {
        candidateId: true,
      },
    });

    // 3. Process each position to compute results and ties
    const resultsData: {
      electionId: string;
      positionId: string;
      candidateId: string;
      voteCount: number;
      isTie: boolean;
    }[] = [];

    for (const position of election.positions) {
      // Get counts for candidates in this position
      const positionCounts = ballotCounts.filter(
        (b) => b.positionId === position.id
      );

      const candidateResults = position.candidates.map((candidate) => {
        const countData = positionCounts.find(
          (pc) => pc.candidateId === candidate.id
        );
        return {
          candidateId: candidate.id,
          voteCount: countData ? countData._count.candidateId : 0,
        };
      });

      // Sort descending by vote count
      candidateResults.sort((a, b) => b.voteCount - a.voteCount);

      // Determine ties for the top count
      const topVoteCount = candidateResults.length > 0 ? candidateResults[0].voteCount : 0;
      const topCandidatesCount = candidateResults.filter(
        (cr) => cr.voteCount === topVoteCount
      ).length;

      const isTieAtTop = topCandidatesCount > 1;

      for (const cr of candidateResults) {
        resultsData.push({
          electionId: election.id,
          positionId: position.id,
          candidateId: cr.candidateId,
          voteCount: cr.voteCount,
          isTie: isTieAtTop && cr.voteCount === topVoteCount,
        });
      }
    }

    // 4. Save to ElectionResult table inside a transaction
    await prisma.$transaction(async (tx) => {
      // Remove existing unpublished/published results for this election
      await tx.electionResult.deleteMany({
        where: {
          electionId: election.id,
        },
      });

      if (resultsData.length > 0) {
        await tx.electionResult.createMany({
          data: resultsData,
        });
      }

      // We might also update the election status to RESULTS_GENERATED if it was closed
      if (election.status === ElectionStatus.VOTING_CLOSED) {
        await tx.election.update({
          where: { id: election.id },
          data: { status: ElectionStatus.RESULTS_GENERATED },
        });
      } else if (election.status === ElectionStatus.PUBLISHED_RESULTS) {
        // If an admin recalculates after it's published, revert election state
        // to RESULTS_GENERATED to maintain consistency because the publishedAt dates were cleared.
        await tx.election.update({
          where: { id: election.id },
          data: { status: ElectionStatus.RESULTS_GENERATED },
        });
      }
    });

    // 5. Audit Log
    await logAuditAction(
      adminId,
      "RESULTS_GENERATED",
      "Election results were generated from ballots.",
      null,
      "Election",
      election.id
    );

    return { success: true, message: "Results generated successfully." };
  }

  /**
   * Publishes the results for a given election.
   * Admins only. Sets publishedAt for all results linked to the election.
   */
  static async publishResults(electionId: string, adminId: string) {
    const election = await prisma.election.findUnique({
      where: { id: electionId },
    });

    if (!election) throw new Error("Election not found");
    if (
      election.status !== ElectionStatus.RESULTS_GENERATED &&
      election.status !== ElectionStatus.VOTING_CLOSED
    ) {
      throw new Error(
        "Election must be in VOTING_CLOSED or RESULTS_GENERATED state to publish."
      );
    }

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.electionResult.updateMany({
        where: { electionId },
        data: { publishedAt: now },
      });

      await tx.election.update({
        where: { id: electionId },
        data: { status: ElectionStatus.PUBLISHED_RESULTS },
      });
    });

    await logAuditAction(
      adminId,
      "RESULTS_PUBLISHED",
      "Election results were published.",
      null,
      "Election",
      election.id
    );

    return { success: true, message: "Results published successfully." };
  }

  /**
   * Retrieves results for a given election.
   * If the user is not an Admin, they can only see results if they have been published.
   */
  static async getResults(electionId: string, isAdmin: boolean) {
    const election = await prisma.election.findUnique({
      where: { id: electionId },
      include: {
        positions: {
          include: {
            candidates: {
              include: {
                student: true,
              },
            },
            electionResults: {
              orderBy: {
                voteCount: "desc",
              },
            },
            _count: {
              select: {
                voteRecords: true,
              },
            },
          },
        },
      },
    });

    if (!election) throw new Error("Election not found");

    // Compute total turnout based on unique vote records for this election.
    const totalTurnout = await prisma.voteRecord.groupBy({
      by: ["studentId"],
      where: { electionId },
    }).then((res) => res.length);

    // If not admin, check if results are published
    if (!isAdmin && election.status !== ElectionStatus.PUBLISHED_RESULTS && election.status !== ElectionStatus.ARCHIVED) {
      throw new Error("Results are not yet published for this election.");
    }

    const formattedPositions = election.positions.map((pos) => {
      const positionTotalVotes = pos.electionResults.reduce((sum, res) => sum + res.voteCount, 0);

      const candidatesWithResults = pos.candidates.map((candidate) => {
        const result = pos.electionResults.find((r) => r.candidateId === candidate.id);
        const voteCount = result?.voteCount || 0;
        const percentage = positionTotalVotes > 0 ? (voteCount / positionTotalVotes) * 100 : 0;

        return {
          id: candidate.id,
          name: candidate.student.fullName,
          manifesto: candidate.manifesto,
          slogan: candidate.slogan,
          photoUrl: candidate.photoUrl,
          voteCount: voteCount,
          percentage: parseFloat(percentage.toFixed(2)),
          isTie: result?.isTie || false,
        };
      });

      // Sort by vote count descending
      candidatesWithResults.sort((a, b) => b.voteCount - a.voteCount);

      return {
        id: pos.id,
        title: pos.title,
        description: pos.description,
        totalVotes: positionTotalVotes,
        candidates: candidatesWithResults,
      };
    });

    return {
      id: election.id,
      title: election.title,
      status: election.status,
      totalTurnout,
      positions: formattedPositions,
    };
  }
}
