# Operations Guide

This guide outlines standard operating procedures for maintaining CUVote in production.

## Monitoring & Observability

### Logging
CUVote outputs structured JSON logs in production (`NODE_ENV=production`).
Logs include a `correlationId` to track a single request across multiple functions.
Use log aggregation tools (like Datadog, AWS CloudWatch, or ELK stack) to ingest standard output from the Node.js process.

### Health Endpoints
Configure your load balancer or container orchestrator to utilize the following endpoints:
- **Liveness**: `/api/health/liveness` - Returns 200 OK if the Node process is running.
- **Readiness**: `/api/health/readiness` - Returns 200 OK only if the database is reachable. Use this to remove a node from rotation if the DB drops.
- **Deep Health**: `/api/health` - Detailed JSON describing system health metrics.

## Release Management

1. Ensure the CI pipeline is green.
2. Draft a new Release in GitHub tagging the commit (e.g., `v1.2.0`).
3. Deploy the application.
4. Verify using the `/api/health` endpoint.
