FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 WRANGLER_SEND_METRICS=false
COPY package.json package-lock.json ./
COPY apps/storefront/package.json ./apps/storefront/package.json
COPY apps/hub/package.json ./apps/hub/package.json
COPY packages/catalog/package.json ./packages/catalog/package.json
RUN npm ci --cache /tmp/npm-cache --no-audit --no-fund && node -e "const fs=require('fs'),crypto=require('crypto');fs.writeFileSync('node_modules/.dream-lock-hash',crypto.createHash('sha256').update(fs.readFileSync('package-lock.json')).digest('hex'))"
COPY . .
EXPOSE 3000 8787
