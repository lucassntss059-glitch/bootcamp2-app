FROM nginx:1.27-alpine

# Configuração com compressão gzip e cache de CSS/JS
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY . /usr/share/nginx/html
RUN rm -f /usr/share/nginx/html/nginx.conf

# Docker passa a saber se o site está respondendo
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost/ >/dev/null || exit 1

EXPOSE 80