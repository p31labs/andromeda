FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/
RUN corepack enable && corepack prepare pnpm@8.15.8 --activate
RUN pnpm install --prefer-offline

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
COPY package.json pnpm-workspace.yaml ./
RUN corepack enable && corepack prepare pnpm@8.15.8 --activate
RUN pnpm --filter ./apps/web build

FROM node:20-alpine AS runner
WORKDIR /app/apps/web
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/public ./public
COPY --from=builder /app/apps/web/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared ./packages/shared

# Fix pnpm workspace paths for runtime
RUN NEXT_PKG=$(ls /app/apps/web/node_modules/.pnpm | grep '^next@') && \
    ln -s /app/apps/web/node_modules/.pnpm/${NEXT_PKG}/node_modules/next /app/apps/web/node_modules/next && \
    ln -sf /app/apps/web/node_modules/next/dist/bin/next /app/apps/web/node_modules/.bin/next

USER nextjs
EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"
CMD ["node_modules/.bin/next", "start", "-p", "3000"]
