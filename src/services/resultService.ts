import { prisma } from "@/lib/prisma";
import { ElectionStatus, Role } from "@prisma/client";
import { logAuditAction } from "@/lib/audit";

const CLOSED_OR_LATER: ElectionStatus[] = [
  ElectionStatus.VOTING_CLOSED,
  ElectionStatus.RESULTS_GENERATED,
  ElectionStatus.PUBLISHED_RESULTS,
  ElectionStatus.ARCHIVED,
];

const LIVE_OR_LATER: ElectionStatus[] = [
  ElectionStatus.VOTING_OPEN,
  ...CLOSED_OR_LATER,
];

export type ResultsViewer = {
  role: Role | string;
  departmentId?: string | null;
};

export class ResultService {
  private static async loadElectionForAccess(electionId: string) {
    const election = await prisma.election.findUnique({
      where: { id: electionId },
      select: {
        id: true,
        title: true,
        status: true,
        departmentId: true,
      },
    });
    if (!election) throw new Error("Election not found");
    return election;
  }

  private static assertDepartmentScope(
    viewer: ResultsViewer,
    electionDepartmentId: string
  ) {
    if (viewer.role === Role.DEPARTMENT_ADMIN) {
      if (!viewer.departmentId || viewer.departmentId !== electionDepartmentId) {
        throw new Error("Forbidden: Cannot access results outside your department.");
      }
    }
  }

  /**
   * Who may view tallies:
   * - Super Admin: live during voting and anytime after
   * - Dept Admin: only after voting is closed
   * - Student / others: only after results are published (or archived)
   */
  static assertCanViewResults(
    viewer: ResultsViewer,
    election: { status: ElectionStatus; departmentId: string }
  ) {
    ResultService.assertDepartmentScope(viewer, election.departmentId);

    if (viewer.role === Role.SUPER_ADMIN) {
      if (!LIVE_OR_LATER.includes(election.status)) {
        throw new Error(
          "Results are only available once voting has opened. Open voting first, or wait for ballots."
        );
      }
      return;
    }

    if (viewer.role === Role.DEPARTMENT_ADMIN) {
      if (!CLOSED_OR_LATER.includes(election.status)) {
        throw new Error(
          "Department admins can view results only after voting is closed."
        );
      }
      return;
    }

    // Students and any other role — published only
    if (
      election.status !== ElectionStatus.PUBLISHED_RESULTS &&
      election.status !== ElectionStatus.ARCHIVED
    ) {
      throw new Error("Results are not yet published for this election.");
    }
  }

  static assertCanGenerate(
    viewer: ResultsViewer,
    election: { status: ElectionStatus; departmentId: string }
  ) {
    if (
      viewer.role !== Role.SUPER_ADMIN &&
      viewer.role !== Role.DEPARTMENT_ADMIN
    ) {
      throw new Error("Unauthorized");
    }

    ResultService.assertDepartmentScope(viewer, election.departmentId);

    if (viewer.role === Role.SUPER_ADMIN) {
      if (!LIVE_OR_LATER.includes(election.status)) {
        throw new Error("Cannot generate results until voting is open.");
      }
      return;
    }

    // Dept admin — only after close
    if (!CLOSED_OR_LATER.includes(election.status)) {
      throw new Error(
        "Department admins can generate results only after voting is closed."
      );
    }
  }

  static assertCanPublish(
    viewer: ResultsViewer,
    election: { status: ElectionStatus; departmentId: string }
  ) {
    if (
      viewer.role !== Role.SUPER_ADMIN &&
      viewer.role !== Role.DEPARTMENT_ADMIN
    ) {
      throw new Error("Unauthorized");
    }

    ResultService.assertDepartmentScope(viewer, election.departmentId);

    if (
      election.status !== ElectionStatus.RESULTS_GENERATED &&
      election.status !== ElectionStatus.VOTING_CLOSED
    ) {
      throw new Error(
        "Election must be in VOTING_CLOSED or RESULTS_GENERATED state to publish."
      );
    }
  }

  /**
   * Generates or updates results for an election by aggregating anonymized ballots.
   */
  static async generateResults(electionId: string, adminId: string, viewer: ResultsViewer) {
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

    this.assertCanGenerate(viewer, election);

    const ballotCounts = await prisma.anonymizedBallot.groupBy({
      by: ["positionId", "candidateId"],
      where: {
        electionId: electionId,
      },
      _count: {
        candidateId: true,
      },
    });

    const resultsData: {
      electionId: string;
      positionId: string;
      candidateId: string;
      voteCount: number;
      isTie: boolean;
    }[] = [];

    for (const position of election.positions) {
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

      candidateResults.sort((a, b) => b.voteCount - a.voteCount);

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

    await prisma.$transaction(async (tx) => {
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

      // Official status change only after close — live generates stay on VOTING_OPEN
      if (election.status === ElectionStatus.VOTING_CLOSED) {
        await tx.election.update({
          where: { id: election.id },
          data: { status: ElectionStatus.RESULTS_GENERATED },
        });
      } else if (election.status === ElectionStatus.PUBLISHED_RESULTS) {
        await tx.election.update({
          where: { id: election.id },
          data: { status: ElectionStatus.RESULTS_GENERATED },
        });
      }
    });

    await logAuditAction(
      adminId,
      "RESULTS_GENERATED",
      election.status === ElectionStatus.VOTING_OPEN
        ? "Live election tallies were refreshed (voting still open)."
        : "Election results were generated from ballots.",
      null,
      "Election",
      election.id
    );

    return {
      success: true,
      message:
        election.status === ElectionStatus.VOTING_OPEN
          ? "Live tallies refreshed. Voting is still open — these results are for Super Admin only."
          : "Results generated successfully.",
    };
  }

  /**
   * Publishes the results for a given election.
   */
  static async publishResults(electionId: string, adminId: string, viewer: ResultsViewer) {
    const election = await this.loadElectionForAccess(electionId);
    this.assertCanPublish(viewer, election);

    // Ensure counts exist before publishing
    const existingCount = await prisma.electionResult.count({ where: { electionId } });
    if (existingCount === 0) {
      await this.generateResults(electionId, adminId, viewer);
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
   * Retrieves results for a given election with role-based visibility.
   */
  static async getResults(electionId: string, viewer: ResultsViewer) {
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
          },
        },
      },
    });

    if (!election) throw new Error("Election not found");

    this.assertCanViewResults(viewer, election);

    const totalTurnout = await prisma.voteRecord
      .groupBy({
        by: ["studentId"],
        where: { electionId },
      })
      .then((res) => res.length);

    const formattedPositions = election.positions.map((pos) => {
      const positionTotalVotes = pos.electionResults.reduce(
        (sum, res) => sum + res.voteCount,
        0
      );

      const candidatesWithResults = pos.candidates.map((candidate) => {
        const result = pos.electionResults.find((r) => r.candidateId === candidate.id);
        const voteCount = result?.voteCount || 0;
        const percentage =
          positionTotalVotes > 0 ? (voteCount / positionTotalVotes) * 100 : 0;

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

      candidatesWithResults.sort((a, b) => b.voteCount - a.voteCount);

      return {
        id: pos.id,
        title: pos.title,
        description: pos.description,
        totalVotes: positionTotalVotes,
        candidates: candidatesWithResults,
      };
    });

    const isLive = election.status === ElectionStatus.VOTING_OPEN;

    return {
      id: election.id,
      title: election.title,
      status: election.status,
      totalTurnout,
      isLive,
      positions: formattedPositions,
    };
  }
}
