# ── Stage 1: build ──────────────────────────────────────────────────────────
FROM node:22-slim AS builder

WORKDIR /app

# Recebe as variáveis do Coolify durante o build e repassa pro Vite
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Copia manifests e instala dependências
COPY package*.json ./
RUN npm ci --ignore-scripts

# Copia o restante do código fonte
COPY . .

# Gera o build de produção (TanStack Start configurado para Node)
RUN npm run build

# ── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
# PORT padrão do Coolify
ENV PORT=3000

# Instala apenas dependências de produção (incluindo o @hono/node-server)
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copia os artefatos gerados pelo build e o script do servidor Node
COPY --from=builder /app/dist ./dist
COPY server.mjs ./

EXPOSE 3000

# Roda o servidor Node nativo, que lê variáveis de ambiente diretamente do OS
CMD ["node", "server.mjs"]
