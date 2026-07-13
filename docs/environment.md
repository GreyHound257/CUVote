# Environment Configuration

CUVote uses `zod` for strict environment variable validation at runtime. If required variables are missing or misconfigured, the application will fail fast during startup to prevent undefined behavior in production.

## Environment Variables

### Core Configuration
- `NODE_ENV`: Represents the current environment (`development`, `test`, `production`). Defaults to `development`.
- `PORT`: The port the application will run on. Defaults to `3000`.

### Database
- `DATABASE_URL`: Connection string for PostgreSQL database. Includes credentials and connection parameters.
  - Example: `postgresql://user:password@localhost:5432/cuvote`

### Authentication (NextAuth)
- `NEXTAUTH_URL`: The canonical URL of the application. Required for authentication redirects.
  - Default (dev): `http://localhost:3000`
- `AUTH_SECRET`: Used to encrypt session tokens and hashes. Must be a randomly generated, secure string in production. You can generate one via `openssl rand -base64 32`.

### Logging
- `LOG_LEVEL`: Configures the threshold for logging. Can be `debug`, `info`, `warn`, or `error`. Defaults to `info`.

## Setting up Locally

1. Copy `.env.example` to `.env.local` (or `.env`):
   ```bash
   cp .env.example .env.local
   ```
2. Update the `.env.local` variables with your specific database credentials and an `AUTH_SECRET`.
