# ---- Build stage: install deps (better-sqlite3 may need to compile) ----
FROM node:22-bookworm-slim AS deps

WORKDIR /app

# Build toolchain for native modules (better-sqlite3). Prebuilds are used when
# available; these packages are the fallback so the image never fails to build.
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

# ---- Runtime stage: slim final image ----
FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

# Copy installed modules and source.
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Persist the SQLite database outside the container layer.
VOLUME ["/app/data"]

# Dashboard port (only used when DASHBOARD_ENABLED=true).
EXPOSE 3000

# Run as the non-root "node" user shipped with the base image.
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node

CMD ["node", "src/index.js"]
