import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResultService } from '../src/services/resultService';
import { prisma } from '../src/lib/prisma';
import { logAuditAction } from '../src/lib/audit';
import { ElectionStatus } from '@prisma/client';

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    election: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    anonymizedBallot: {
      groupBy: vi.fn(),
    },
    electionResult: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(prisma)),
  },
}));

vi.mock('../src/lib/audit', () => ({
  logAuditAction: vi.fn(),
}));

describe('ResultService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateResults', () => {
    it('should correctly tally votes and mark ties', async () => {
      // Mock election data
      (prisma.election.findUnique as any).mockResolvedValue({
        id: 'e1',
        status: ElectionStatus.VOTING_CLOSED,
        departmentId: 'd1',
        positions: [
          {
            id: 'p1',
            candidates: [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }],
          },
        ],
      });

      // Mock aggregated votes: c1 (50), c2 (50), c3 (20) -> tie for first place
      (prisma.anonymizedBallot.groupBy as any).mockResolvedValue([
        { positionId: 'p1', candidateId: 'c1', _count: { candidateId: 50 } },
        { positionId: 'p1', candidateId: 'c2', _count: { candidateId: 50 } },
        { positionId: 'p1', candidateId: 'c3', _count: { candidateId: 20 } },
      ]);

      const result = await ResultService.generateResults('e1', 'admin1', {
        role: 'SUPER_ADMIN',
        departmentId: null,
      });

      expect(prisma.electionResult.deleteMany).toHaveBeenCalledWith({ where: { electionId: 'e1' } });

      const createManyCall = (prisma.electionResult.createMany as any).mock.calls[0][0];
      const data = createManyCall.data;

      expect(data).toHaveLength(3);

      const c1Result = data.find((r: any) => r.candidateId === 'c1');
      const c2Result = data.find((r: any) => r.candidateId === 'c2');
      const c3Result = data.find((r: any) => r.candidateId === 'c3');

      expect(c1Result.voteCount).toBe(50);
      expect(c1Result.isTie).toBe(true);

      expect(c2Result.voteCount).toBe(50);
      expect(c2Result.isTie).toBe(true);

      expect(c3Result.voteCount).toBe(20);
      expect(c3Result.isTie).toBe(false);

      expect(prisma.election.update).toHaveBeenCalledWith({
        where: { id: 'e1' },
        data: { status: ElectionStatus.RESULTS_GENERATED },
      });

      expect(logAuditAction).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });
});
