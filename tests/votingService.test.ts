import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VotingService } from '../src/services/votingService';
import { prisma } from '../src/lib/prisma';
import { logAuditAction } from '../src/lib/audit';
import { Prisma } from '@prisma/client';

// Mock dependencies
vi.mock('../src/lib/prisma', () => ({
  prisma: {
    student: {
      findUnique: vi.fn(),
    },
    election: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    voteRecord: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    anonymizedBallot: {
      create: vi.fn(),
      groupBy: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(prisma)),
  },
}));

vi.mock('../src/lib/audit', () => ({
  logAuditAction: vi.fn(),
}));

describe('VotingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('submitVote', () => {
    it('should throw an error if student is not eligible', async () => {
      (prisma.student.findUnique as any).mockResolvedValue({ id: 's1', isEligible: false, status: 'ACTIVE' });

      await expect(VotingService.submitVote('e1', 's1', [{ positionId: 'p1', candidateId: 'c1' }])).rejects.toThrow('Student is not eligible to vote.');
    });

    it('should throw an error on duplicate voting attempt', async () => {
      (prisma.student.findUnique as any)
        .mockResolvedValueOnce({ id: 's1', isEligible: true, status: 'ACTIVE', departmentId: 'd1', userId: 'u1' })
        .mockResolvedValueOnce({ id: 's1', userId: 'u1' });
      (prisma.election.findUnique as any).mockResolvedValue({ id: 'e1', status: 'VOTING_OPEN', departmentId: 'd1' });
      (prisma.voteRecord.findUnique as any).mockResolvedValue({ id: 'vr1' });

      await expect(VotingService.submitVote('e1', 's1', [{ positionId: 'p1', candidateId: 'c1' }])).rejects.toThrow('You have already voted in this election.');

      expect(logAuditAction).toHaveBeenCalledWith(
        'u1',
        'DUPLICATE_VOTE_BLOCKED',
        'Blocked duplicate voting attempt in election.',
        null,
        'Election',
        'e1'
      );
    });

    it('should handle Prisma unique constraint violations as duplicate votes', async () => {
      (prisma.student.findUnique as any)
        .mockResolvedValueOnce({ id: 's1', isEligible: true, status: 'ACTIVE', departmentId: 'd1', userId: 'u1' })
        .mockResolvedValueOnce({ id: 's1', userId: 'u1' });
      (prisma.election.findUnique as any).mockResolvedValue({ id: 'e1', status: 'VOTING_OPEN', departmentId: 'd1' });
      (prisma.voteRecord.findUnique as any).mockResolvedValue(null);
      (prisma.voteRecord.create as any).mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '5.0.0',
        })
      );

      await expect(VotingService.submitVote('e1', 's1', [{ positionId: 'p1', candidateId: 'c1' }])).rejects.toThrow('You have already voted in this election.');
    });

    it('should successfully record votes and log receipt', async () => {
      (prisma.student.findUnique as any)
        .mockResolvedValueOnce({ id: 's1', isEligible: true, status: 'ACTIVE', departmentId: 'd1', userId: 'u1' })
        .mockResolvedValueOnce({ id: 's1', userId: 'u1' });
      (prisma.election.findUnique as any).mockResolvedValue({ id: 'e1', status: 'VOTING_OPEN', departmentId: 'd1' });
      (prisma.voteRecord.findUnique as any).mockResolvedValue(null);
      (prisma.voteRecord.create as any).mockResolvedValue({ id: 'vr1', studentId: 's1', electionId: 'e1' });
      (prisma.anonymizedBallot.create as any).mockResolvedValue({ id: 'ab1' });

      const result = await VotingService.submitVote('e1', 's1', [{ positionId: 'p1', candidateId: 'c1' }]);

      expect(prisma.voteRecord.create).toHaveBeenCalledWith({
        data: {
          studentId: 's1',
          electionId: 'e1',
        },
      });
      expect(prisma.anonymizedBallot.create).toHaveBeenCalled();
      expect(result).toEqual({ success: true });

      expect(logAuditAction).toHaveBeenCalledWith(
        'u1',
        'VOTE_RECEIPT_GENERATED',
        'Successfully submitted ballot for election. Positions voted: 1',
        null,
        'Election',
        'e1'
      );
    });
  });
});
