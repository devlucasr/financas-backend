FROM node:18-slim AS builder
WORKDIR /app

# Instala dependências (inclui dev para build) e compila
COPY package*.json tsconfig.json ./
COPY src ./src
COPY supabase.d.ts ./supabase.d.ts
RUN npm ci
RUN npm run build

# Runtime enxuto com apenas deps de produção
FROM node:18-slim
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

# Copia artefatos compilados
COPY --from=builder /app/dist ./dist

# Pasta de sessão do WhatsApp; monte um volume nela no Railway
RUN mkdir -p /app/.wwebjs_auth
VOLUME ["/app/.wwebjs_auth"]

CMD ["node", "dist/index.js"]

