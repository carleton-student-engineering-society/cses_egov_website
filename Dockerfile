FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build app
RUN npm run build

EXPOSE 3000

# Command to run your application
CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "3000"]