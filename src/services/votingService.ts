import { prisma } from "@/lib/prisma";
import { ElectionStatus } from "@prisma/client";
import { logAuditAction } from "@/lib/audit";

export class VotingService {
  /**
   * Fetch active elections that the student is eligible to vote in.
   */
  static async getActiveElections(studentId: string, departmentId: string) {
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student || !student.isEligible || student.status !== "ACTIVE" || student.departmentId !== departmentId) {
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
      // Check if student has already voted in this election for ALL positions.
      // Or just if they have voted at all. The ledger tracks per position.
      // If we want to allow partial voting, we could check per position.
      // For simplicity, we just return all open elections, the frontend or subsequent calls will check if they voted.

      const voteRecords = await prisma.voteRecord.findMany({
        where: {
          studentId,
          electionId: election.id,
        },
      });

      // If they voted for all positions, they are fully voted.
      // But let's just return the election and let the ballot logic handle partials or say "Voted"
      results.push({
        ...election,
        hasVoted: voteRecords.length > 0,
        isFullyVoted: voteRecords.length >= election.positions.length,
      });
    }

    return results;
  }

  /**
   * Get ballot positions and approved candidates for an election.
   */
  static async getBallot(electionId: string, studentId: string, departmentId: string) {
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student || !student.isEligible || student.status !== "ACTIVE" || student.departmentId !== departmentId) {
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
                  }
                }
              }
            },
          },
        },
      },
    });

    if (!election || election.status !== ElectionStatus.VOTING_OPEN || election.departmentId !== departmentId) {
      throw new Error("Election is not active or not available for your department.");
    }

    // Determine which positions the student has already voted for
    const voteRecords = await prisma.voteRecord.findMany({
      where: {
        studentId,
        electionId,
      },
    });

    const votedPositionIds = new Set(voteRecords.map(vr => vr.positionId));

    const positionsToVote = election.positions.map(p => ({
      ...p,
      hasVoted: votedPositionIds.has(p.id)
    }));

    // Log that a ballot was accessed (voting session initialized)
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
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student || !student.isEligible || student.status !== "ACTIVE") {
      throw new Error("Student is not eligible to vote.");
    }

    const election = await prisma.election.findUnique({ where: { id: electionId } });
    if (!election || election.status !== ElectionStatus.VOTING_OPEN) {
      throw new Error("Election is not currently open for voting.");
    }
    if (student.departmentId !== election.departmentId) {
      throw new Error("Student department does not match election department.");
    }

    // Validate times if applicable
    const now = new Date();
    if (election.startTime && now < election.startTime) {
       throw new Error("Election has not started yet.");
    }
    if (election.endTime && now > election.endTime) {
       throw new Error("Election has ended.");
    }

    if (!votes || votes.length === 0) {
      throw new Error("No votes submitted.");
    }

    try {
      await prisma.$transaction(async (tx) => {
        for (const vote of votes) {
          // Check for existing VoteRecord (The Ledger)
          const existingRecord = await tx.voteRecord.findUnique({
            where: {
              studentId_electionId_positionId: {
                studentId,
                electionId,
                positionId: vote.positionId,
              },
            },
          });

          if (existingRecord) {
            // Transaction rolls back automatically when Error is thrown
            throw new Error(`Duplicate voting attempt for position ${vote.positionId}.`);
          }

          // Insert into VoteRecord
          await tx.voteRecord.create({
            data: {
              studentId,
              electionId,
              positionId: vote.positionId,
            },
          });

          // Insert into AnonymizedBallot (The Ballot Box) - NO LINK TO STUDENT
          await tx.anonymizedBallot.create({
            data: {
              electionId,
              positionId: vote.positionId,
              candidateId: vote.candidateId,
            },
          });
        }
      });

      // Secure Receipt Log
      await logAuditAction(
        student.userId,
        "VOTE_RECEIPT_GENERATED",
        `Successfully submitted ballot for election. Positions voted: ${votes.length}`,
        ipAddress || null,
        "Election",
        electionId
      );

      return { success: true };
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes("Duplicate voting attempt")) {
         await logAuditAction(
            student.userId,
            "DUPLICATE_VOTE_BLOCKED",
            `Blocked duplicate voting attempt in election.`,
            ipAddress || null,
            "Election",
            electionId
         );
         throw new Error("You have already voted in this election or for this position.");
      }
      throw new Error("An error occurred while submitting your vote. Please try again.");
    }
  }
}
