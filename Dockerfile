FROM node:20-slim

# Instala dependências necessárias para o Chromium rodar no Docker
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-freefont-ttf \
    libnss3 \
    libatk-bridge2.0-0 \
    libxss1 \
    libgtk-3-0 \
    libgbm1 \
    libasound2 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# O Railway e Puppeteer precisam saber onde o Chromium está
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package*.json ./

# Instala dependências (incluindo as de desenvolvimento para o build)
RUN npm install

COPY . .

# Compila o TypeScript
RUN npm run build

# O Railway usa a porta 8080 por padrão se você subir um servidor HTTP, 
# mas como é um bot de WhatsApp, não é obrigatório expor porta.

CMD ["node", "dist/index.js"]