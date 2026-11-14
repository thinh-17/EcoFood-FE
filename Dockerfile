# dist/ is built on the CI runner (npm ci + vite build), same as the backend
# repo builds its jar before Docker ever starts — this just packages the
# already-built static files into nginx. See .github/workflows/*.yml.
FROM nginx:1.27-alpine
# nginx:1.27-alpine's own OS packages lag behind on CVE fixes (brotli-libs,
# libcrypto3, libssl3) — patch them at build time rather than waiting on a
# new upstream image tag.
RUN apk update && apk upgrade --no-cache
COPY dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
