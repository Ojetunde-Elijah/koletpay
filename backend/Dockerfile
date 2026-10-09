FROM node:20-alpine

WORKDIR /usr/src/app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production || npm install --production

# Copy source
COPY . .

ENV NODE_ENV=production

# Render provides the PORT env var. Default in this project is 5000.
EXPOSE 5000

CMD ["npm", "start"]
