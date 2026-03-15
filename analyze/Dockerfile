FROM node:20-bookworm-slim

WORKDIR /app

COPY analyze/package*.json ./analyze/

WORKDIR /app/analyze
RUN npm ci

WORKDIR /app
COPY analyze ./analyze
COPY sqlite ./sqlite

ENV NODE_ENV=production

WORKDIR /app/analyze
CMD ["npm", "start"]
