# ── Stage 1: build ──────────────────────────────────────────────────────────
FROM node:22-slim AS builder

WORKDIR /app

# Copia manifests e instala dependências
COPY package*.json ./
RUN npm ci --ignore-scripts

# Copia o restante do código fonte
COPY . .

# Gera o build de produção (TanStack Start + Cloudflare adapter)
RUN npm run build

# ── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
# PORT padrão do Coolify
ENV PORT=3000

# Instala wrangler globalmente no container para servir a aplicação
RUN npm install -g wrangler@latest --ignore-scripts

# Copia os artefatos gerados pelo build
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/wrangler.jsonc ./wrangler.jsonc
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

# Cria arquivo .dev.vars injetando todas as variáveis de ambiente do sistema 
# para que o motor do wrangler/Cloudflare consiga ler os secrets (Supabase, Resend, etc) na VPS.
CMD sh -c 'env > .dev.vars && wrangler dev dist/server/index.js --port 3000 --local --no-bundle --compatibility-date 2025-09-24 --compatibility-flag nodejs_compat --ip 0.0.0.0'
