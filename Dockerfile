FROM node:24-alpine
WORKDIR /app

COPY --chown=node:node build.mjs index.html _headers robots.txt sitemap.xml ./
COPY --chown=node:node assets/css/omid-os.css ./assets/css/omid-os.css
COPY --chown=node:node assets/data/portfolio.js ./assets/data/portfolio.js
COPY --chown=node:node assets/js/omid-terminal.js ./assets/js/omid-terminal.js
COPY --chown=node:node assets/cv ./assets/cv
COPY --chown=node:node assets/vendor/xterm ./assets/vendor/xterm
RUN node build.mjs

COPY --chown=node:node server.mjs ./server.mjs
COPY --chown=node:node netlify/functions/chat.mjs ./netlify/functions/chat.mjs

ENV HOST=0.0.0.0
ENV PUBLIC_DIR=/app/dist
EXPOSE 8888

USER node
CMD ["node", "server.mjs"]
