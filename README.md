This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Pseudonymous Voting Model
CUVote utilizes a Pseudonymous Voting Model. Voter eligibility is rigorously verified, but the identity of the voter must remain permanently decoupled from the stored ballot. The architecture ensures that there is no traceable mapping between a candidate and specific voters in the database.

## Master Architecture Update: Results Separation
The platform separates Live Vote Ingestion from Result Publication. While voting is open, votes are accepted and stored anonymously. No results, counts, or charts should be accessible to any user (including administrators) until the election moves strictly to a VOTING_CLOSED state and results are explicitly compiled.

## Privacy Model (Pseudonymous Ballots)
To ensure complete ballot secrecy while strictly preventing duplicate votes:
- **The Ledger**: Track who has voted by saving a record linking the Student to the Election (and optionally the specific Position). This acts as the checklist preventing double-voting.
- **The Ballot Box**: Track what was voted for by saving selections in a completely separate table that contains no foreign keys, identifiers, or tracking mechanisms back to the original Student or User tables.
