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
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy source
COPY . .

# Build arguments for SSG
ARG SITE_ORIGIN=https://006336.xyz
ENV SITE_ORIGIN=${SITE_ORIGIN}

# Full build: client -> SSR -> prerender (SSG)
RUN pnpm generate:sitemap \
    && pnpm --filter @toolbox/web build \
    && pnpm --filter @toolbox/web build:ssr \
    && pnpm prerender

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

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1:8081/healthz >/dev/null || exit 1

# Run nginx
CMD ["nginx", "-g", "daemon off;"]