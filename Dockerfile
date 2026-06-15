# syntax=docker/dockerfile:1

# ---- Stage 1: install deps + build the web bundle ----
FROM oven/bun:1 AS builder
WORKDIR /app

# Manifests first so the install layer caches across source-only changes.
COPY package.json bun.lock tsconfig.base.json ./
COPY web/package.json ./web/
COPY bff/package.json ./bff/
RUN bun install --frozen-lockfile

# Build the frontend (needs the devDeps installed above: vite, tsc, tailwind).
COPY web ./web
COPY bff ./bff
RUN cd web && bun run build

# ---- Stage 2: runtime ----
FROM oven/bun:1-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Bun runs the BFF's TypeScript directly — no compile step. Carry over the
# installed deps, the server source, and the built web bundle only.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/tsconfig.base.json ./tsconfig.base.json
COPY --from=builder /app/bff ./bff
COPY --from=builder /app/web/dist ./web/dist

# Serve the static bundle from the same process as /api (see bff/src/static.ts).
ENV WEB_DIST=/app/web/dist
ENV PORT=3010
EXPOSE 3010

# Drop to the non-root user the base image ships with.
USER bun

CMD ["bun", "run", "bff/src/index.ts"]
