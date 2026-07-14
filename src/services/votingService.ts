import { prisma } from "@/lib/prisma";
import { ElectionStatus, Prisma } from "@prisma/client";
import { logAuditAction } from "@/lib/audit";
import { isLevelEligible } from "@/lib/electionEligibility";

export class VotingService {
  /**
   * Fetch active elections that the student is eligible to vote in.
   */
  static async getActiveElections(studentId: string, departmentId: string) {
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (
      !student ||
      !student.isEligible ||
      student.status !== "ACTIVE" ||
      student.departmentId !== departmentId
    ) {
      return [];
    }

    const elections = await prisma.election.findMany({
      where: {
        departmentId,
        status: ElectionStatus.VOTING_OPEN,
      },
      include: {
        positions: true,
      },
      orderBy: {
        endTime: "asc",
      },
    });

    const results = [];
    for (const election of elections) {
      if (!isLevelEligible(election.eligibilityLevels, student.level)) {
        continue;
      }

      const voteRecord = await prisma.voteRecord.findUnique({
        where: {
          electionId_studentId: {
            electionId: election.id,
            studentId,
          },
        },
      });

      results.push({
        ...election,
        hasVoted: !!voteRecord,
        isFullyVoted: !!voteRecord,
      });
    }

    return results;
  }

  /**
   * Get ballot positions and approved candidates for an election.
   */
  static async getBallot(electionId: string, studentId: string, departmentId: string) {
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (
      !student ||
      !student.isEligible ||
      student.status !== "ACTIVE" ||
      student.departmentId !== departmentId
    ) {
      throw new Error("Student is not eligible to vote.");
    }

    const election = await prisma.election.findUnique({
      where: { id: electionId },
      include: {
        positions: {
          include: {
            candidates: {
              where: {
                status: "APPROVED",
              },
              include: {
                student: {
                  select: {
                    fullName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (
      !election ||
      election.status !== ElectionStatus.VOTING_OPEN ||
      election.departmentId !== departmentId
    ) {
      throw new Error("Election is not active or not available for your department.");
    }

    if (!isLevelEligible(election.eligibilityLevels, student.level)) {
      throw new Error("Your level is not eligible for this election.");
    }

    const voteRecord = await prisma.voteRecord.findUnique({
      where: {
        electionId_studentId: {
          electionId,
          studentId,
        },
      },
    });

    const hasVotedInElection = !!voteRecord;

    const positionsToVote = election.positions.map((p) => ({
      ...p,
      hasVoted: hasVotedInElection,
    }));

    await logAuditAction(
      student.userId,
      "VOTING_SESSION_INITIALIZED",
      `Started voting session for election ${electionId}`,
      null,
      "Election",
      electionId
    );

    return {
      election,
      positions: positionsToVote,
    };
  }

  /**
   * Submit votes atomically.
   */
  static async submitVote(
    electionId: string,
    studentId: string,
    votes: { positionId: string; candidateId: string }[],
    ipAddress?: string
  ) {
    if (!votes || votes.length === 0) {
      throw new Error("No votes submitted.");
    }

    try {
      await prisma.$transaction(
        async (tx) => {
          const student = await tx.student.findUnique({ where: { id: studentId } });
          if (!student || !student.isEligible || student.status !== "ACTIVE") {
            throw new Error("Student is not eligible to vote.");
          }

          const election = await tx.election.findUnique({ where: { id: electionId } });
          if (!election || election.status !== ElectionStatus.VOTING_OPEN) {
            throw new Error("Election is not currently open for voting.");
          }
          if (student.departmentId !== election.departmentId) {
            throw new Error("Student department does not match election department.");
          }

          if (!isLevelEligible(election.eligibilityLevels, student.level)) {
            throw new Error("Your level is not eligible for this election.");
          }

          const now = new Date();
          if (election.startTime && now < election.startTime) {
            throw new Error("Election has not started yet.");
          }
          if (election.endTime && now > election.endTime) {
            throw new Error("Election has ended.");
          }

          const existingVote = await tx.voteRecord.findUnique({
            where: {
              electionId_studentId: {
                electionId,
                studentId,
              },
            },
          });

          if (existingVote) {
            throw new Error("DUPLICATE_VOTE");
          }

          // One vote per position with approved candidates; ignore empty positions
          const positions = await tx.position.findMany({
            where: { electionId },
            include: {
              candidates: {
                where: { status: "APPROVED" },
                select: { id: true },
              },
            },
          });

          const voteablePositions = positions.filter((p) => p.candidates.length > 0);
          const positionIds = new Set(voteablePositions.map((p) => p.id));
          const submittedPositionIds = votes.map((v) => v.positionId);

          if (new Set(submittedPositionIds).size !== submittedPositionIds.length) {
            throw new Error("Duplicate position selections are not allowed.");
          }

          if (submittedPositionIds.length !== voteablePositions.length) {
            throw new Error("You must select exactly one candidate for every position.");
          }

          for (const vote of votes) {
            if (!positionIds.has(vote.positionId)) {
              throw new Error("Invalid position on ballot.");
            }
            const position = voteablePositions.find((p) => p.id === vote.positionId)!;
            if (!position.candidates.some((c) => c.id === vote.candidateId)) {
              throw new Error("Selected candidate is not approved for that position.");
            }
          }

          await tx.voteRecord.create({
            data: {
              studentId,
              electionId,
            },
          });

          await tx.anonymizedBallot.createMany({
            data: votes.map((vote) => ({
              electionId,
              positionId: vote.positionId,
              candidateId: vote.candidateId,
            })),
          });
        },
        {
          maxWait: 15_000,
          timeout: 20_000,
        }
      );

      const student = await prisma.student.findUnique({ where: { id: studentId } });

      await logAuditAction(
        student?.userId ?? null,
        "VOTE_RECEIPT_GENERATED",
        `Successfully submitted ballot for election. Positions voted: ${votes.length}`,
        ipAddress || null,
        "Election",
        electionId
      );

      return { success: true };
    } catch (error: unknown) {
      if (error instanceof Error && error.message === "DUPLICATE_VOTE") {
        const student = await prisma.student.findUnique({ where: { id: studentId } });
        await logAuditAction(
          student?.userId ?? null,
          "DUPLICATE_VOTE_BLOCKED",
          "Blocked duplicate voting attempt in election.",
          ipAddress || null,
          "Election",
          electionId
        );
        throw new Error("You have already voted in this election.");
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const student = await prisma.student.findUnique({ where: { id: studentId } });
        await logAuditAction(
          student?.userId ?? null,
          "DUPLICATE_VOTE_BLOCKED",
          "Blocked duplicate voting attempt in election.",
          ipAddress || null,
          "Election",
          electionId
        );
        throw new Error("You have already voted in this election.");
      }

      if (error instanceof Error) {
        throw error;
      }

      throw new Error("An error occurred while submitting your vote. Please try again.");
    }
  }
}
