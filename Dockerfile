# syntax=docker/dockerfile:1

# Giai đoạn 1: build giao diện React. frontend/dist không nằm trong git nên phải build trong image.
FROM node:24-alpine AS frontend-build
WORKDIR /build/frontend
# Chép file khóa trước để lớp "npm ci" được cache khi chỉ sửa mã nguồn.
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Giai đoạn 2: image chạy thật, chỉ có thư viện backend (không devDependencies) và bản build giao diện.
FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY config ./config
COPY migrations ./migrations
COPY seeds ./seeds
COPY scripts ./scripts
COPY src ./src
# tests có trong image để chạy "docker compose exec app npm test" ngay trong môi trường đã dựng
COPY tests ./tests
COPY --from=frontend-build /build/frontend/dist ./frontend/dist
# Không chạy bằng root.
USER node
EXPOSE 3000
CMD ["node", "scripts/docker-start.js"]
