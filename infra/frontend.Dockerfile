FROM node:22-bookworm-slim

ENV NEXT_TELEMETRY_DISABLED=1 \
    API_INTERNAL_URL=http://api:8000 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend ./
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
