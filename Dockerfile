FROM node:20-slim
WORKDIR /app
COPY . .
RUN cd client && npm ci --include=dev && npm run build && cd ../server && npm ci --omit=dev
ENV NODE_ENV=production
CMD ["sh", "-c", "cd server && npm start"]
