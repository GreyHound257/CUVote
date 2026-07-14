import { prisma } from "@/lib/prisma";
import { ElectionStatus, Role } from "@prisma/client";
import { logAuditAction } from "@/lib/audit";
import { SystemSettingsService } from "@/services/systemSettingsService";
import { notificationService } from "@/services/notificationService";
import { logger } from "@/utils/logger";

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
   * - Super Admin: live during voting when liveResultsEnabled is on; always after close
   * - Dept Admin: only after voting is closed
   * - Student / others: only after results are published (or archived)
   */
  static async assertCanViewResults(
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

      if (election.status === ElectionStatus.VOTING_OPEN) {
        const liveEnabled = await SystemSettingsService.isLiveResultsEnabled();
        if (!liveEnabled) {
          throw new Error(
            "Live election reports are currently disabled in System Settings."
          );
        }
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

    if (
      election.status !== ElectionStatus.PUBLISHED_RESULTS &&
      election.status !== ElectionStatus.ARCHIVED
    ) {
      throw new Error("Results are not yet published for this election.");
    }
  }

  static async assertCanGenerate(
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

      if (election.status === ElectionStatus.VOTING_OPEN) {
        const liveEnabled = await SystemSettingsService.isLiveResultsEnabled();
        if (!liveEnabled) {
          throw new Error(
            "Live election reports are currently disabled in System Settings."
          );
        }
      }
      return;
    }

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

    await this.assertCanGenerate(viewer, election);

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
      const positionCounts = ballotCounts.filter((b) => b.positionId === position.id);

      const candidateResults = position.candidates.map((candidate) => {
        const countData = positionCounts.find((pc) => pc.candidateId === candidate.id);
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

  static async publishResults(electionId: string, adminId: string, viewer: ResultsViewer) {
    const election = await this.loadElectionForAccess(electionId);
    this.assertCanPublish(viewer, election);

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

    try {
      await notificationService.notifyDepartmentUsers(election.departmentId, {
        title: "Results published",
        message: `Results for "${election.title}" are now available.`,
        type: "RESULTS_PUBLISHED",
        priority: "HIGH",
      });
    } catch (error) {
      logger.error("Results published notification failed:", error);
    }

    return { success: true, message: "Results published successfully." };
  }

  static async countEligibleVoters(
    departmentId: string,
    eligibilityLevels: number[]
  ): Promise<number> {
    return prisma.student.count({
      where: {
        departmentId,
        isEligible: true,
        ...(eligibilityLevels.length > 0
          ? { level: { in: eligibilityLevels } }
          : {}),
      },
    });
  }

  static async getResults(electionId: string, viewer: ResultsViewer) {
    const election = await prisma.election.findUnique({
      where: { id: electionId },
      include: {
        department: { select: { name: true, code: true } },
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

    await this.assertCanViewResults(viewer, election);

    const [totalTurnout, eligibleVoters] = await Promise.all([
      prisma.voteRecord.count({ where: { electionId } }),
      this.countEligibleVoters(election.departmentId, election.eligibilityLevels),
    ]);

    const turnoutRate =
      eligibleVoters > 0
        ? parseFloat(((totalTurnout / eligibleVoters) * 100).toFixed(2))
        : 0;

    const hasGeneratedResults = election.positions.some(
      (pos) => pos.electionResults.length > 0
    );

    const publishedAt = election.positions
      .flatMap((pos) => pos.electionResults)
      .map((r) => r.publishedAt)
      .filter((d): d is Date => d !== null)
      .sort((a, b) => b.getTime() - a.getTime())[0];

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
          voteCount,
          percentage: parseFloat(percentage.toFixed(2)),
          isTie: result?.isTie || false,
          isWinner: false,
        };
      });

      candidatesWithResults.sort((a, b) => b.voteCount - a.voteCount);

      const topVoteCount = candidatesWithResults[0]?.voteCount ?? 0;
      const winners =
        topVoteCount > 0
          ? candidatesWithResults
              .filter((c) => c.voteCount === topVoteCount)
              .map((c) => ({
                id: c.id,
                name: c.name,
                isTie: c.isTie,
              }))
          : [];

      for (const candidate of candidatesWithResults) {
        candidate.isWinner =
          topVoteCount > 0 && candidate.voteCount === topVoteCount;
      }

      return {
        id: pos.id,
        title: pos.title,
        description: pos.description,
        totalVotes: positionTotalVotes,
        winners,
        candidates: candidatesWithResults,
      };
    });

    const isLive = election.status === ElectionStatus.VOTING_OPEN;

    return {
      id: election.id,
      title: election.title,
      status: election.status,
      department: election.department,
      totalTurnout,
      eligibleVoters,
      turnoutRate,
      hasGeneratedResults,
      publishedAt: publishedAt?.toISOString() ?? null,
      isLive,
      positions: formattedPositions,
    };
  }
}
