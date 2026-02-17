FROM node:18-slim AS builder
WORKDIR /app

COPY package*.json tsconfig.json ./
COPY src ./src
COPY supabase.d.ts ./supabase.d.ts
RUN npm ci
RUN npm run build

FROM node:18-slim
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

RUN mkdir -p /app/.wwebjs_auth

CMD ["node", "dist/index.js"]
