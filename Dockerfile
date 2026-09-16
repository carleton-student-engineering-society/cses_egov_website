FROM node:20-slim
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev
RUN npm install -g serve

EXPOSE 3000
CMD ["npx", "--yes", "serve", "-s", "dist", "-l", "3000"]