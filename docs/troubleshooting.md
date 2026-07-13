# Troubleshooting Guide

Common issues and remediation steps for the CUVote production environment.

## 1. Application Fails to Start

**Symptoms**: Application crashes immediately. Logs show "Invalid environment variables".
**Cause**: The application uses strict `zod` validation on startup. A required variable is missing from `.env`.
**Fix**: Check `docs/environment.md`. Ensure `AUTH_SECRET` and `DATABASE_URL` are provided.

## 2. Database Connection Refused

**Symptoms**: `503 Service Unavailable` on endpoints; `/api/health/readiness` fails.
**Cause**: The Node server cannot reach PostgreSQL.
**Fix**:
1. Verify the PostgreSQL service is running.
2. Check network policies or firewall rules.
3. Validate `DATABASE_URL` credentials.

## 3. Users Cannot Login

**Symptoms**: Login attempts silently fail or throw a 500 error.
**Cause**: Authentication relies on `NEXTAUTH_URL` and `AUTH_SECRET`.
**Fix**:
1. Ensure `NEXTAUTH_URL` exactly matches the public-facing URL (including `https://`).
2. Verify the `AUTH_SECRET` has not changed between deployments. Changing the secret invalidates all existing sessions.

## 4. High CPU / Memory Usage

**Symptoms**: API latency increases; Next.js process consumes excessive resources.
**Cause**: Potential unpaginated queries or large CSV exports loading directly into memory.
**Fix**: Review logs for long-running queries. Ensure process limits are set in PM2 or Docker. Restart the instance to clear memory if critical.
