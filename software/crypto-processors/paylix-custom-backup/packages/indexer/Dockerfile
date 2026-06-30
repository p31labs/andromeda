FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/indexer/package.json ./packages/indexer/
RUN corepack enable && corepack prepare pnpm@8.15.8 --activate
RUN pnpm install --prefer-offline

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/indexer/node_modules ./packages/indexer/node_modules
COPY packages/shared ./packages/shared
COPY packages/indexer ./packages/indexer
COPY package.json pnpm-workspace.yaml ./
RUN corepack enable && corepack prepare pnpm@8.15.8 --activate
RUN pnpm --filter ./packages/indexer build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 indexer

COPY --from=builder /app/packages/indexer/dist ./packages/indexer/dist
COPY --from=builder /app/packages/indexer/package.json ./packages/indexer/
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared ./packages/shared

# Fix pnpm workspace paths for runtime
RUN ETHERSPKG=$(ls /app/node_modules/.pnpm 2>/dev/null | grep '^ethers@' | head -1) && \
    if [ -n "$ETHERSPKG" ]; then ln -s /app/node_modules/.pnpm/${ETHERSPKG}/node_modules/ethers /app/node_modules/ethers; fi && \
    SHAREDPKG=$(ls /app/node_modules/.pnpm 2>/dev/null | grep '^@paylix+shared@' | head -1) && \
    if [ -n "$SHAREDPKG" ]; then ln -s /app/node_modules/.pnpm/${SHAREDPKG}/node_modules/@paylix/shared /app/node_modules/@paylix/shared; fi

USER indexer
CMD ["node", "packages/indexer/dist/index.js"]
