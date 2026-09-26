#Build the application
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

#Run the production server
FROM node:20-slim
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/proxy/server.js ./server.js

EXPOSE 3000
CMD ["node", "server.js"]