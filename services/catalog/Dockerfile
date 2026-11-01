FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server.js openapi.yaml ./
COPY src ./src

USER node
EXPOSE 3001
CMD ["node", "server.js"]
