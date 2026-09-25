# 基础镜像可通过 --build-arg 覆盖（国内可换镜像加速源）：
#   docker build --build-arg NODE_IMAGE=docker.m.daocloud.io/library/node:24-alpine ...
# 注意：ARG 必须在第一个 FROM 之前声明，否则对后续 FROM 不可见
ARG NODE_IMAGE=node:24-alpine
ARG NGINX_IMAGE=nginx:1.27-alpine

# ---- Stage 1: 构建 ----------------------------------------------------------
FROM ${NODE_IMAGE} AS build

WORKDIR /app

# corepack 下载 pnpm 二进制默认走 registry.npmjs.org，国内/离线环境常失败。
# 用 COREPACK_NPM_REGISTRY 覆盖为国内镜像；同时构建期代理走 Docker 预定义
# 的 http_proxy/https_proxy（注意大小写都要传，corepack/undici 只读小写）。
ARG COREPACK_NPM_REGISTRY=https://registry.npmmirror.com
ENV COREPACK_NPM_REGISTRY=${COREPACK_NPM_REGISTRY}
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

# 启用 corepack 以锁定 pnpm 版本（与 package.json 的 packageManager 一致）
RUN corepack enable && corepack prepare pnpm@12.3.4 --activate

# 先拷贝依赖清单，充分利用镜像层缓存
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json .npmrc ./
COPY packages ./packages
COPY apps ./apps
COPY scripts ./scripts

RUN pnpm install --frozen-lockfile

COPY . .

# 站点域名：决定 sitemap 的 <loc> 与 SSG 注入的 canonical / JSON-LD url。
# 默认值 = packages/catalog/src/site.ts 里的正式域名（站点尚未上线，见 docs/guide/getting-started.md）。
# 预发 / 临时环境用 --build-arg SITE_ORIGIN=https://... 覆盖。
ARG SITE_ORIGIN=https://006336.xyz
ENV SITE_ORIGIN=${SITE_ORIGIN}

# 全量构建：客户端产物 → SSR 产物 → 静态预渲染（SSG）
# 顺序不能反：sitemap 要先生成才会被 build 拷进 dist；prerender 依赖 dist/index.html。
RUN pnpm generate:sitemap \
 && pnpm --filter @toolbox/web build \
 && pnpm --filter @toolbox/web build:ssr \
 && pnpm prerender

# ---- Stage 2: 运行 ----------------------------------------------------------
FROM ${NGINX_IMAGE}

# 静态产物
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
# 版本号来源（构建期注入 /healthz，见下方 RUN）
COPY --from=build /app/deploy/binary/VERSION /tmp/toolbox-VERSION

# Nginx 配置：SPA fallback + gzip + 缓存策略 + WASM MIME
COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf

# 健康检查端点要能报出版本号，占位符在构建期按仓库里的 VERSION 注入。
# 不要在这里硬编码版本：会与 deploy/binary/VERSION 漂移。
RUN set -eux; \
    v=$(tr -d ' \t\r\n' < /tmp/toolbox-VERSION); \
    [ -n "$v" ] || { echo 'VERSION 为空，拒绝构建' >&2; exit 1; }; \
    sed -i "s|@TOOLBOX_VERSION@|${v}|g" /etc/nginx/conf.d/default.conf; \
    rm -f /tmp/toolbox-VERSION; \
    grep -q "ok v${v}" /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
