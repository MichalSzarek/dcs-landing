# Build stage: checks the pages are in sync with partials/ and site.json (and
# that no company fact is empty), then compiles the stylesheet.
FROM node:22-alpine AS build
WORKDIR /src
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

COPY package*.json ./
RUN npm ci --omit=dev

COPY server.js ./
COPY index.html about.html briefcaster.html briefcaster-pl.html press.html contact.html 404.html ./
COPY pricing.html news.html ./
COPY briefcaster-privacy.html briefcaster-terms.html briefcaster-support.html briefcaster-delete-account.html ./
COPY lustre-privacy.html lustre-terms.html lustre-support.html ./
COPY robots.txt sitemap.xml favicon.svg ./
COPY me.PNG logo.png logo-background.png ./
COPY --from=build /src/app.css ./
COPY screens/ ./screens/
COPY voice-study/ ./voice-study/

EXPOSE 8080
CMD ["node", "server.js"]
