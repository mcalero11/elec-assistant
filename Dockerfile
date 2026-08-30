# syntax=docker/dockerfile:1

########## Stage 1: build the static export ##########
FROM node:24-alpine AS build

ENV NEXT_TELEMETRY_DISABLED=1
# Exact pin matching "packageManager"; npm not corepack (corepack is being unbundled from Node).
RUN npm install -g pnpm@10.30.3

WORKDIR /app

# Manifests first so `pnpm install` stays layer-cached until deps change.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/web/package.json    packages/web/
COPY packages/engine/package.json packages/engine/
COPY packages/data/package.json   packages/data/
RUN pnpm install --frozen-lockfile

COPY tsconfig.base.json ./
COPY packages/ packages/

# `next build && node scripts/build-sw.mjs` -> packages/web/out/
# next/font/google (Geist) downloads at build time — needs outbound network.
RUN pnpm build

########## Stage 2: static file server ##########
FROM nginxinc/nginx-unprivileged:1.29-alpine

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/packages/web/out/ /usr/share/nginx/html/

EXPOSE 8080
