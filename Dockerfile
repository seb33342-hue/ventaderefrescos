FROM node:24-alpine

RUN echo "os-refresh 2026-11-20" && apk upgrade --no-cache

WORKDIR /app

COPY --chown=node:node package.json server.js pagina_web_refresco_V0.22_SOLO_HUELLA.html ./

ENV NODE_ENV=production

USER node

EXPOSE 3000

CMD ["node", "server.js"]
