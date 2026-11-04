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

# 受限环境（Windows 沙箱 / 企业代理）esbuild postinstall 会 EBUSY，故 --ignore-scripts；
# 包运行时二进制来自平台可选包，不需要该脚本（见 CI 同款写法）。
# P1-3：--ignore-scripts 也跳过了 apps/web 的 postinstall——旧写法把缺 wasm 的错误
#   catch{} 吞掉，pdf 工具运行时才在用户面前崩。用显式可追踪的步骤替代：
#   已发布 @neslinesli93/qpdf-wasm（package.json files: ["dist"]）只发 dist/，
#   历史 postinstall 的 require('.../download.js') 恒 MODULE_NOT_FOUND（本地已验），
#   故从解析到的 dist/qpdf.js 断言同目录 qpdf.wasm 文件存在（test -f）。
#   若上游改回 download.js 模式，把下一行换成 require('.../download.js') 即可。
RUN pnpm install --frozen-lockfile --ignore-scripts
RUN cd apps/web && node -e "const fs=require('fs');const path=require('path');const f=require.resolve('@neslinesli93/qpdf-wasm/dist/qpdf.js');const w=path.join(path.dirname(f),'qpdf.wasm');if(!fs.existsSync(w)){console.error('[qpdf][P1-3] wasm missing: '+w);process.exit(1)}console.log('[qpdf] wasm ok: '+w)" \
 && test -f "$(cd apps/web && node -p "require('path').join(require('path').dirname(require.resolve('@neslinesli93/qpdf-wasm/dist/qpdf.js')),'qpdf.wasm')")"

COPY . .

# 站点域名：决定 sitemap 的 <loc> 与 SSG 注入的 canonical / JSON-LD url。
# 默认值 = packages/catalog/src/site.ts 里的正式域名（站点尚未上线，见 docs/guide/getting-started.md）。
# 预发 / 临时环境用 --build-arg SITE_ORIGIN=https://... 覆盖。
ARG SITE_ORIGIN=https://006336.xyz
ENV SITE_ORIGIN=${SITE_ORIGIN}

# P0-1：全量构建走统一链 scripts/build-ssg.sh（sitemap → search-index →
#   client build → SSR build → prerender）。旧链漏了 generate:search-index，
#   产物搜索页为空面板。scripts/ 已在上面 COPY，本阶段可用；顺序不能反（见脚本头注释）。
RUN sh scripts/build-ssg.sh

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

EXPOSE 8081

# 健康检查走 8081（容器内 nginx 监听端口与二进制形态一致）。
# P0-2：旧探针 wget / 只证明 SPA 回了 200 index.html，挂了也会绿。
# 改探精确路径 /healthz（location = /healthz，见 deploy/nginx/default.conf，
# 返回体为 "ok v<VERSION>\\n"），且断言响应体以 ok 开头。
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8081/healthz | grep -q '^ok '

CMD ["nginx", "-g", "daemon off;"]
