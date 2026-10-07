# syntax=docker/dockerfile:1@sha256:4edf897a3ffa55b89f906fc8cc78afdb3f1834cc9c7083565e611a8a7d5fe99e
# Base images are pinned by digest (tag kept for Dependabot): a re-pushed tag cannot change what we build.
FROM node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1 AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1 AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_SITE_URL=https://pdfduzenle.tr
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
# Rewrites are resolved at build time in standalone output.
ARG GATEWAY_URL=http://gateway:8080
ENV GATEWAY_URL=$GATEWAY_URL
# Optional analytics and search engine verification; pages are static, so these are baked in at build time.
ARG NEXT_PUBLIC_GA_ID= NEXT_PUBLIC_CLARITY_ID= GOOGLE_SITE_VERIFICATION= BING_SITE_VERIFICATION= YANDEX_SITE_VERIFICATION=
ENV NEXT_PUBLIC_GA_ID=$NEXT_PUBLIC_GA_ID NEXT_PUBLIC_CLARITY_ID=$NEXT_PUBLIC_CLARITY_ID \
    GOOGLE_SITE_VERIFICATION=$GOOGLE_SITE_VERIFICATION BING_SITE_VERIFICATION=$BING_SITE_VERIFICATION \
    YANDEX_SITE_VERIFICATION=$YANDEX_SITE_VERIFICATION
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1 AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
USER app
EXPOSE 3000
CMD ["node", "server.js"]
