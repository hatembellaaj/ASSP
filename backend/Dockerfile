FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine
# Données de fuseaux horaires (TZ=Europe/Paris)
RUN apk add --no-cache tzdata
WORKDIR /app
COPY package*.json ./
RUN npm install
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY drizzle.config.ts ./
COPY src/db ./src/db
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 4000
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
