# Deployment Guide

CUVote is built using Next.js (App Router) and can be deployed to any platform that supports Node.js or Docker, as well as serverless environments like Vercel.

## Vercel (Recommended)

1. Connect your GitHub repository to Vercel.
2. In the Vercel dashboard, configure the following Environment Variables:
   - `DATABASE_URL` (Connection string to your hosted PostgreSQL, e.g., Neon or Supabase)
   - `NEXTAUTH_URL` (The canonical URL of your deployment)
   - `AUTH_SECRET` (Generate using `openssl rand -base64 32`)
   - `NODE_ENV` (Set to `production`)
3. Set the build command to `npm run build`.
4. Deploy.

*Note: Ensure you run database migrations via `npx prisma migrate deploy` before accepting live traffic. You can add a `postbuild` script or run it manually depending on your DB hosting.*

## Linux Server / VPS / Docker

To deploy on a standard Linux server:

1. Clone the repository.
2. Install dependencies: `npm ci`
3. Configure the `.env` file (see `docs/environment.md`).
4. Run migrations: `npx prisma migrate deploy`
5. Build the application: `npm run build`
6. Start the server: `npm run start`

For production, it is highly recommended to use a process manager like **PM2** to keep the application alive and manage logs:
```bash
pm2 start npm --name "cuvote" -- run start
```

Also, use **Nginx** as a reverse proxy to handle HTTPS and route traffic from port 80/443 to the Node.js application running on `PORT`.
