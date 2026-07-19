# =============================================================================
# Étape 1 — Build du front Astro (génère web/dist)
# =============================================================================
FROM oven/bun:1 AS web-build
WORKDIR /app/web
COPY web/package.json ./
RUN bun install
COPY web/ ./
# PUBLIC_API_BASE vide => front et API sur la même origine (défaut recommandé)
ARG PUBLIC_API_BASE=""
ENV PUBLIC_API_BASE=$PUBLIC_API_BASE
RUN bun run build

# =============================================================================
# Étape 2 — Serveur Hono (Bun) : sert le statique + /api/subscribe
# =============================================================================
FROM oven/bun:1 AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV STATIC_ROOT=/app/public

COPY server/package.json ./
RUN bun install --production
COPY server/ ./
# Le build Astro devient le dossier statique servi par Hono
COPY --from=web-build /app/web/dist ./public

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD bun -e "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["bun", "run", "src/index.ts"]
