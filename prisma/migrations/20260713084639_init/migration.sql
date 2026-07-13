-- CreateIndex
CREATE INDEX "AnonymizedBallot_electionId_positionId_candidateId_idx" ON "AnonymizedBallot"("electionId", "positionId", "candidateId");

-- CreateIndex
CREATE INDEX "AnonymizedBallot_electionId_idx" ON "AnonymizedBallot"("electionId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
