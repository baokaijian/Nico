FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV VITE_APP_MODE=public
RUN npm run check && node scripts/check-public-release.mjs

FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node server/public-server.mjs ./server/public-server.mjs
COPY --chown=node:node shared/domain.mjs shared/publication.mjs ./shared/
USER node
ENV NODE_ENV=production NICO_PUBLIC_HOST=0.0.0.0 NICO_PUBLIC_PORT=8080
EXPOSE 8080
CMD ["node", "server/public-server.mjs"]
