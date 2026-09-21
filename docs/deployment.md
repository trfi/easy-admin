# Deployment Guide

This project is deployed to Dokploy as a single Docker container serving both the static web frontend and the BFF API.

## Dokploy Deployment Script

Automated deployment is handled by `scripts/deploy.ts` via:

```bash
bun run deploy
# or
bun run scripts/deploy.ts
```

### Environment Variables

Configure these variables in your shell or `.env` file:

| Variable | Description | Default / Example |
| --- | --- | --- |
| `DOKPLOY_URL` | Base URL of the Dokploy instance | `http://15.235.192.183:3000` |
| `DOKPLOY_API_KEY` | Dokploy API key generated from Dokploy settings | (required) |
| `DOKPLOY_APP_ID` | Dokploy application ID for easy-admin | (required) |
| `VERIFY_URL` | Live URL for post-deployment health check | Optional (e.g. `https://admin.easyquiz.cc/`) |

### Pipeline Stages

1. **Typecheck (`bun run typecheck`)**: Ensures all TypeScript code across `bff` and `web` passes without errors before building.
2. **Build Archive (`deploy.zip`)**: Uses 7-Zip to package application source code, excluding `node_modules`, `.git`, `.env`, build artifacts (`dist`), documentation, and local agent directories.
3. **Upload**: Sends `deploy.zip` to Dokploy via the `/api/application.dropDeployment` endpoint.
4. **Monitor**: Polls Dokploy deployment status every 2.5s until `done`, or logs failure details if `error`/`failed`/`cancelled`.
5. **Verify**: When `VERIFY_URL` is set, verifies that the deployed endpoint responds with HTTP 200 OK across multiple consecutive requests.

### CLI Options

| Flag | Description |
| --- | --- |
| `--skip-typecheck`, `--no-typecheck` | Skip TypeScript type checking |
| `--skip-build` | Skip creating `deploy.zip` and upload existing archive |
| `--skip-verify` | Skip live healthcheck verification |
| `--clean` | Delete `deploy.zip` after successful deployment |
| `--help`, `-h` | Display usage instructions |
