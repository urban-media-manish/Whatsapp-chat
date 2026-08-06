# Dockerfile for Enterprise Live Customer Support Platform
FROM node:20-alpine AS build

WORKDIR /app

# Copy root and client package files
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Install dependencies
RUN npm install
RUN cd client && npm install
RUN cd server && npm install

# Copy source files
COPY . .

# Build frontend asset bundle
RUN npm run build

EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

CMD ["npm", "start"]
