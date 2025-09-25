# Use a small, official Node.js image
FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package files first (for better layer caching)
COPY . .
# Install dependencies (no dev dependencies if NODE_ENV=production)
RUN npm ci --omit=dev

# Expose the port your backend runs on (e.g., 3000)
EXPOSE 5000

# Start the app
CMD ["npm", "run", "start"]