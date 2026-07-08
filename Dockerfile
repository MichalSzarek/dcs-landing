FROM nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy static site files
COPY index.html about.html 404.html /usr/share/nginx/html/
COPY briefcaster-privacy.html briefcaster-terms.html briefcaster-support.html /usr/share/nginx/html/
COPY me.PNG /usr/share/nginx/html/me.PNG

# Cloud Run requires port 8080
EXPOSE 8080
