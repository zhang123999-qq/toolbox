# =============================================================================
# Toolbox - Production Multi-Stage Dockerfile
# =============================================================================
# 全仓库唯一的生产 Dockerfile（2026-11-05 合并）：此前根 Dockerfile 与
# deploy/docker/Dockerfile 内容漂移 124 行，各修一半。为何保留这一份：
# - 含镜像标签 LABEL、非 root USER nginx（compose 的 read_only/cap_drop 按此假设）；
# - 含 COREPACK_NPM_REGISTRY（合并自 deploy 版，国内本地构建用）；
# - docker-compose.yml / docker-compose.test.yml / docker-compose.dev.yml /
#   CI docker-smoke 全部指向这一份。
# 安全特性：
# - 多阶段构建，最小攻击面；构建阶段的工具链不进最终镜像
# - 最终镜像非 root 用户（nginx）
# - 人体工程约束（USER/nginx 端口）见 deploy/nginx/default.conf
# =============================================================================

# 基础镜像可通过 --build-arg 覆盖（国内可换镜像加速源）：
#   docker build --build-arg NODE_IMAGE=docker.m.daocloud.io/library/node:24-alpine ...
# 注意：ARG 必须在第一个 FROM 之前声明，否则对后续 FROM 不可见。
ARG NODE_IMAGE=node:24-alpine
ARG NGINX_IMAGE=nginx:1.27-alpine
ARG BUILD_DATE
ARG VERSION
ARG VCS_REF
ARG SITE_ORIGIN=https://006336.xyz

# ---- Stage 1: Builder --------------------------------------------------------
FROM ${NODE_IMAGE} AS builder

WORKDIR /app

# corepack 下载 pnpm 二进制默认走 registry.npmjs.org，国内/离线环境常失败。
# 用 COREPACK_NPM_REGISTRY 覆盖为国内镜像；同时构建期代理走 Docker 预定义
# 的 http_proxy/https_proxy（注意大小写都要传，corepack/undici 只读小写）。
# CI 显式传 https://registry.npmjs.org（npmmirror 对 GH runner 慢）。
ARG COREPACK_NPM_REGISTRY=https://registry.npmmirror.com
ENV COREPACK_NPM_REGISTRY=${COREPACK_NPM_REGISTRY}
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

# 启用 corepack 以锁定 pnpm 版本（与 package.json 的 packageManager 一致）
# 说明：构建链（tsx/vite）不需要 python3/make/g++，故不再装 apk 构建依赖——
# 减一层、快一层，且镜像历史更小。esbuild 等原生二进制由可选依赖提供。
RUN corepack enable && corepack prepare pnpm@12.3.4 --activate

# 先拷贝依赖清单，充分利用镜像层缓存
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json .npmrc ./
COPY packages ./packages
COPY apps ./apps
COPY scripts ./scripts

# Install dependencies (frozen lockfile for reproducibility)
# P1-3：--ignore-scripts 跳过 apps/web 的 postinstall（不可控副作用）；显式物化
#   qpdf wasm 并断言文件存在（已发布包 files: ["dist"] 只含 dist/qpdf.wasm；
#   历史 postinstall 的 require('.../download.js') 恒 MODULE_NOT_FOUND 且被
#   catch{} 吞掉）。注意 Docker 构建无需 registry override 即可（.npmrc 镜像在本地/受限
#   环境更快）；CI 的 registry 覆盖走 setup composite，只影响本地 CI job 的安装步，
#   这里的 build 镜像内安装默认走 .npmrc。
RUN pnpm install --frozen-lockfile --ignore-scripts
RUN cd apps/web && node -e "const fs=require('fs');const path=require('path');const f=require.resolve('@neslinesli93/qpdf-wasm/dist/qpdf.js');const w=path.join(path.dirname(f),'qpdf.wasm');if(!fs.existsSync(w)){console.error('[qpdf][P1-3] wasm missing: '+w);process.exit(1)}console.log('[qpdf] wasm ok: '+w)" \
 && test -f "$(cd apps/web && node -p "require('path').join(require('path').dirname(require.resolve('@neslinesli93/qpdf-wasm/dist/qpdf.js')),'qpdf.wasm')")"

# Copy source
COPY . .

# Build arguments for SSG：站点域名决定 sitemap 的 <loc> 与 SSG 注入的 canonical / JSON-LD url。
# 默认值 = packages/catalog/src/site.ts 里的正式域名。
ARG SITE_ORIGIN
ENV SITE_ORIGIN=${SITE_ORIGIN}

# Full build via the single SSG chain (P0-1): sitemap → search-index →
#   client build → SSR build → prerender. Use sh because the builder is Alpine.
RUN sh scripts/build-ssg.sh

# ---- Stage 2: Production Runtime ---------------------------------------------
FROM ${NGINX_IMAGE} AS production

# Labels for traceability
LABEL org.opencontainers.image.title="Toolbox" \
      org.opencontainers.image.description="870 client-side online tools - local-first, static deployment, bilingual" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.source="https://github.com/zhang123999-qq/toolbox" \
      org.opencontainers.image.licenses="MIT"

# Create non-root user (nginx user exists in nginx:alpine)
# Ensure nginx user has proper permissions
RUN set -eux; \
    # Verify nginx user exists
    getent passwd nginx >/dev/null || { \
        addgroup -g 101 -S nginx && \
        adduser -S -D -H -u 101 -h /var/cache/nginx -s /sbin/nologin -G nginx nginx; \
    }; \
    # Create directories with proper ownership
    mkdir -p /usr/share/nginx/html /var/cache/nginx /var/log/nginx /run/nginx; \
    chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/log/nginx /run/nginx

# Copy static assets from builder
COPY --from=builder --chown=nginx:nginx /app/apps/web/dist /usr/share/nginx/html

# Copy nginx configuration
COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf

# Copy version for health check
COPY --from=builder /app/deploy/binary/VERSION /tmp/toolbox-VERSION

# Inject version into nginx config at build time
RUN set -eux; \
    v=$(tr -d ' \t\r\n' < /tmp/toolbox-VERSION); \
    [ -n "$v" ] || { echo 'VERSION is empty, refusing to build' >&2; exit 1; }; \
    sed -i "s|@TOOLBOX_VERSION@|${v}|g" /etc/nginx/conf.d/default.conf; \
    rm -f /tmp/toolbox-VERSION; \
    grep -q "ok v${v}" /etc/nginx/conf.d/default.conf

# Switch to non-root user
USER nginx

# Expose port (non-privileged)
EXPOSE 8081

# Health check (P0-2): probe the exact /healthz endpoint that answers
# "ok v<VERSION>" (see deploy/nginx/default.conf) and assert the body —
# a bare HTTP 200 on / would only prove the SPA fallback responded.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1:8081/healthz | grep -q '^ok '

# Run nginx
CMD ["nginx", "-g", "daemon off;"]
