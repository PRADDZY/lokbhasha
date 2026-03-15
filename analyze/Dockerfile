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
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch(`http://127.0.0.1:${process.env.PORT || process.env.ANALYZE_PORT || 5001}/health`).then((response) => response.ok ? response.json() : Promise.reject(new Error('bad status'))).then((payload) => { if (payload.status !== 'ok') { process.exit(1) } }).catch(() => process.exit(1))"
USER node
CMD ["npm", "start"]
