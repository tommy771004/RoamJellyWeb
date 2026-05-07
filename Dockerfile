FROM node:20-alpine AS builder
WORKDIR /app
COPY RoamJellyApp/package*.json ./
RUN npm install
COPY RoamJellyApp/ .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY RoamJellyApp/package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/scripts ./scripts
EXPOSE 3000
CMD ["node", "dist/server.cjs"]
