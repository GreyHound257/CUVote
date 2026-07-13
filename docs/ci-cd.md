# Continuous Integration & Delivery

CUVote uses GitHub Actions to enforce code quality and ensure the application remains deployable.

## The CI Pipeline

The configuration is located at `.github/workflows/ci.yml`. It runs automatically on pushes and pull requests to the `main` or `master` branches.

### Jobs Performed:

1. **Dependency Installation**: Runs `npm ci` using an isolated npm cache.
2. **Linting**: Runs `npm run lint` to enforce ESLint rules.
3. **Type Checking**: Runs `npx tsc --noEmit` to ensure TypeScript types are sound without generating build artifacts.
4. **Testing**: Runs `npx vitest run` to execute all unit and integration test suites.
5. **Production Build**: Runs `npm run build` to verify the Next.js application compiles successfully.

### Enforcing Quality

Branch protection rules should be enabled in GitHub to prevent merging PRs unless the CI pipeline completes successfully.

## Continuous Deployment (CD)

CD is typically handled by the hosting platform (e.g., Vercel or Render). Once the CI pipeline passes and code is merged to `main`, the hosting platform will automatically trigger a build and deployment.
