FROM node:20-alpine

# Build the backend from the `backend/` subfolder
WORKDIR /usr/src/app/backend

# Install dependencies
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci --only=production || npm install --production

# Copy backend source
COPY backend .

ENV NODE_ENV=production

# Render provides a PORT env var; fallback to 5000
EXPOSE 5000

CMD ["npm", "start"]
