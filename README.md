# CUVote V1 - Covenant University Electronic Voting System

CUVote is a secure, pseudonymous electronic voting platform built specifically for Covenant University.

## Architecture

CUVote is built on modern web technologies:
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL (via Prisma ORM)
- **Authentication**: NextAuth (Auth.js beta/v5)
- **Styling**: Tailwind CSS v4 + Shadcn/ui

### Security & Privacy Principles

1. **Pseudonymous Voting Model**: CUVote completely separates the Voter Ledger from the Ballot Box.
   - **The Ledger** tracks *who* voted to prevent double-voting.
   - **The Ballot Box** tracks *what* was voted for without any foreign keys or identifiers linking back to the user.
2. **Results Separation**: Live Vote Ingestion is strictly separated from Result Publication. Results and counts are never accessible to any user until an election is explicitly closed and results are generated.
3. **Data Isolation**: Department Admins are strictly scoped to their own `departmentId`.
4. **Lifecycle Immutability**: Active and past elections become completely read-only to preserve election integrity.

## Setup & Deployment

1. Clone the repository.
2. Run `npm install` to install dependencies.
3. Copy `.env.example` to `.env` and configure your `DATABASE_URL` and `AUTH_SECRET`.
4. Run `npx prisma db push` or `npx prisma migrate dev` to setup the PostgreSQL schema.
5. Seed initial admin accounts using the provided `scripts/seed.ts` (configured via `ADMIN_EMAIL` and `ADMIN_PASSWORD` env variables).
6. Run `npm run dev` to start the local development server.

## Production Build

Ensure that all type checks and linting pass before deploying:
```bash
npx tsc --noEmit
npm run build
```
Deploy via Docker or natively to platforms like Vercel (using the edge-compatible `@prisma/adapter-pg`).

