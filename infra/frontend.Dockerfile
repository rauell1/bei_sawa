# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim

ENV NEXT_TELEMETRY_DISABLED=1 \
    API_INTERNAL_URL=http://api:8000 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    npm ci --no-audit --no-fund
COPY frontend ./
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
