FROM node:20-alpine
WORKDIR /app

# Install only production deps
COPY package.json ./
RUN npm install --omit=dev

# Copy app source
COPY . .

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node","src/server.js"]

