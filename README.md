# CUVote V1

CUVote is a secure online voting system for Covenant University.

Version 1 focuses on departmental elections while ensuring the architecture can easily expand to faculty-level and university-wide elections in the future. The system allows administrators to create elections, manage candidates, manage eligible students, conduct secure voting, calculate results accurately, and maintain complete audit logs.

## Project Goals

The platform must inspire trust. Security and correctness are prioritized over implementing features quickly.
The software must be:
- Production-ready
- Scalable
- Modular
- Secure
- Responsive
- Accessible
- Maintainable
- Professionally documented

## Tech Stack

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **Backend:** Next.js Route Handlers
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** Auth.js (NextAuth)
- **Validation:** Zod
- **Forms:** React Hook Form
- **Tables:** TanStack Table
- **Charts:** Recharts
- **Icons:** Lucide React
- **Notifications:** Sonner

## Architecture & Principles

This project strictly adheres to:
- Clean Architecture
- SOLID Principles
- DRY (Don't Repeat Yourself)
- KISS (Keep It Simple, Stupid)
- Separation of Concerns
- Reusable Components
- Composition over duplication
- Single Responsibility Principle
- Low coupling and High cohesion

## Getting Started

First, install dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.