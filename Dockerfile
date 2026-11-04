# =============================================================================
# Toolbox - Production Multi-Stage Dockerfile
# =============================================================================
# Security Features:
# - Multi-stage build for minimal attack surface
# - Non-root user (nginx:nginx) in final stage
# - Read-only filesystem where possible
# - Dropped capabilities
# - Health checks
# - No unnecessary packages
# =============================================================================

# ---- Build Arguments ---------------------------------------------------------
ARG NODE_IMAGE=node:24-alpine
ARG NGINX_IMAGE=nginx:1.27-alpine
ARG BUILD_DATE
ARG VERSION
ARG VCS_REF

# ---- Stage 1: Builder --------------------------------------------------------
FROM ${NODE_IMAGE} AS builder

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && corepack enable && corepack prepare pnpm@12.3.4 --activate

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json .npmrc ./
COPY packages ./packages
COPY apps ./apps
COPY scripts ./scripts

# Install dependencies (frozen lockfile for reproducibility)
# P1-3：--ignore-scripts 跳过 apps/web 的 postinstall（不可控副作用）；显式物化
#   qpdf wasm 并断言文件存在（已发布包 files: ["dist"] 只含 dist/qpdf.wasm；
#   历史 postinstall 的 require('.../download.js') 恒 MODULE_NOT_FOUND 且被
#   catch{} 吞掉，见 apps/web/package.json 与 DEPLOYMENT.md 说明）。
RUN pnpm install --frozen-lockfile --ignore-scripts
RUN cd apps/web && node -e "const fs=require('fs');const path=require('path');const f=require.resolve('@neslinesli93/qpdf-wasm/dist/qpdf.js');const w=path.join(path.dirname(f),'qpdf.wasm');if(!fs.existsSync(w)){console.error('[qpdf][P1-3] wasm missing: '+w);process.exit(1)}console.log('[qpdf] wasm ok: '+w)" \
 && test -f "$(cd apps/web && node -p "require('path').join(require('path').dirname(require.resolve('@neslinesli93/qpdf-wasm/dist/qpdf.js')),'qpdf.wasm')")"

# Copy source
COPY . .

# Build arguments for SSG
ARG SITE_ORIGIN=https://006336.xyz
ENV SITE_ORIGIN=${SITE_ORIGIN}

# Full build via the single SSG chain (P0-1): sitemap → search-index →
#   client build → SSR build → prerender. The old inline chain omitted
#   generate:search-index, so search silently shipped empty; order is fixed
#   (see scripts/build-ssg.sh header). Use sh because the builder is Alpine.
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