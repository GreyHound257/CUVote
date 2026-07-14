import { describe, it, expect, vi, beforeEach } from "vitest";
import { VotingService } from "../src/services/votingService";
import { prisma } from "../src/lib/prisma";
import { logAuditAction } from "../src/lib/audit";
import { ElectionStatus, Prisma } from "@prisma/client";

const txMocks = {
  student: { findUnique: vi.fn() },
  election: { findUnique: vi.fn() },
  voteRecord: { findUnique: vi.fn(), create: vi.fn() },
  position: { findMany: vi.fn() },
  anonymizedBallot: { createMany: vi.fn() },
};

vi.mock("../src/lib/prisma", () => ({
  prisma: {
    student: { findUnique: vi.fn() },
    election: { findUnique: vi.fn(), findMany: vi.fn() },
    voteRecord: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    anonymizedBallot: { create: vi.fn(), groupBy: vi.fn() },
    $transaction: vi.fn((callback) => callback(txMocks)),
  },
}));

vi.mock("../src/lib/audit", () => ({
  logAuditAction: vi.fn(),
}));

const eligibleStudent = {
  id: "s1",
  isEligible: true,
  status: "ACTIVE",
  departmentId: "d1",
  userId: "u1",
  level: 200,
};

const openElection = {
  id: "e1",
  status: ElectionStatus.VOTING_OPEN,
  departmentId: "d1",
  eligibilityLevels: [] as number[],
  startTime: null,
  endTime: null,
};

const ballotPositions = [
  {
    id: "p1",
    electionId: "e1",
    candidates: [{ id: "c1" }],
  },
];

function mockSuccessfulBallot() {
  txMocks.student.findUnique.mockResolvedValue(eligibleStudent);
  txMocks.election.findUnique.mockResolvedValue(openElection);
  txMocks.voteRecord.findUnique.mockResolvedValue(null);
  txMocks.position.findMany.mockResolvedValue(ballotPositions);
  txMocks.voteRecord.create.mockResolvedValue({ id: "vr1", studentId: "s1", electionId: "e1" });
  txMocks.anonymizedBallot.createMany.mockResolvedValue({ count: 1 });
  (prisma.student.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(eligibleStudent);
}

describe("VotingService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("submitVote", () => {
    it("should throw an error if student is not eligible", async () => {
      txMocks.student.findUnique.mockResolvedValue({
        id: "s1",
        isEligible: false,
        status: "ACTIVE",
      });

      await expect(
        VotingService.submitVote("e1", "s1", [{ positionId: "p1", candidateId: "c1" }])
      ).rejects.toThrow("Student is not eligible to vote.");
    });

    it("should throw an error on duplicate voting attempt", async () => {
      mockSuccessfulBallot();
      txMocks.voteRecord.findUnique.mockResolvedValue({ id: "vr1" });

      await expect(
        VotingService.submitVote("e1", "s1", [{ positionId: "p1", candidateId: "c1" }])
      ).rejects.toThrow("You have already voted in this election.");

      expect(logAuditAction).toHaveBeenCalledWith(
        "u1",
        "DUPLICATE_VOTE_BLOCKED",
        "Blocked duplicate voting attempt in election.",
        null,
        "Election",
        "e1"
      );
    });

    it("should handle Prisma unique constraint violations as duplicate votes", async () => {
      mockSuccessfulBallot();
      txMocks.voteRecord.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
          code: "P2002",
          clientVersion: "5.0.0",
        })
      );

      await expect(
        VotingService.submitVote("e1", "s1", [{ positionId: "p1", candidateId: "c1" }])
      ).rejects.toThrow("You have already voted in this election.");
    });

    it("should successfully record votes and log receipt", async () => {
      mockSuccessfulBallot();

      const result = await VotingService.submitVote("e1", "s1", [
        { positionId: "p1", candidateId: "c1" },
      ]);

      expect(txMocks.voteRecord.create).toHaveBeenCalledWith({
        data: {
          studentId: "s1",
          electionId: "e1",
        },
      });
      expect(txMocks.anonymizedBallot.createMany).toHaveBeenCalled();
      expect(result).toEqual({ success: true });

      expect(logAuditAction).toHaveBeenCalledWith(
        "u1",
        "VOTE_RECEIPT_GENERATED",
        "Successfully submitted ballot for election. Positions voted: 1",
        null,
        "Election",
        "e1"
      );
    });
  });
});
