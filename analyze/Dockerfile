FROM node:20-bookworm-slim

WORKDIR /app

COPY analyze/package*.json ./analyze/

WORKDIR /app/analyze
RUN npm ci

WORKDIR /app
COPY --chown=node:node analyze ./analyze
COPY --chown=node:node sqlite ./sqlite

ENV NODE_ENV=production

WORKDIR /app/analyze
USER node
CMD ["npm", "start"]
