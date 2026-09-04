FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

COPY package*.json ./
RUN npm ci --omit=dev

COPY server.js ./
COPY index.html about.html briefcaster.html briefcaster-pl.html press.html maths.html contact.html 404.html ./
COPY pricing.html news.html ./
COPY briefcaster-privacy.html briefcaster-terms.html briefcaster-support.html briefcaster-delete-account.html ./
COPY robots.txt sitemap.xml favicon.svg ./
COPY me.PNG logo.png logo-background.png ./
COPY screens/ ./screens/
COPY voice-study/ ./voice-study/

EXPOSE 8080
CMD ["node", "server.js"]
