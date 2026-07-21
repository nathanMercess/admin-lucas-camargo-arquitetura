# syntax=docker/dockerfile:1

FROM node:24-alpine AS build

WORKDIR /app

RUN corepack enable && corepack prepare yarn@1.22.22 --activate

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --non-interactive

COPY . .
RUN yarn build --configuration production

FROM nginxinc/nginx-unprivileged:stable-alpine

COPY deploy/nginx-admin.conf /etc/nginx/conf.d/default.conf
COPY --from=build --chown=101:101 /app/dist/admin/browser/ /usr/share/nginx/html/

EXPOSE 8080

USER 101:101
