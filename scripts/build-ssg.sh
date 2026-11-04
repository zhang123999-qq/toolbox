#!/bin/sh
# =============================================================================
# SSG 全量构建链（审计 P0-1）——唯一串口，别再在 Dockerfile / CI 各抄一份。
# -----------------------------------------------------------------------------
# 顺序不能反（与旧的 pnpm build:ssg 内联链逐条对应）：
#   1. generate:sitemap      public/sitemap.xml + robots.txt 写进 apps/web/public
#   2. generate:search-index public/search-index.json（搜索 Worker 运行时加载）
#                            ——P0-1：deploy/docker/Dockerfile 旧链漏了这一步，
#                            预览站 hero 搜索永远搜不到东西；必须在 client build 之前。
#   3. web build             client 产物，把 public/ 拷进 dist
#   4. web build:ssr         SSR 产物 dist-ssr（prerender 的输入）
#   5. prerender             依赖 dist/index.html，逐页预渲染
# catalog check（pnpm generate:catalog --check）由 CI 另一条门禁负责，
# 不在此脚本里——别用本脚本顺手加别的东西。
#
# 运行：sh scripts/build-ssg.sh        （根 package.json 的 build:ssg 调的就是它）
#   Windows 本机：Git Bash/WSL 里 `sh scripts/build-ssg.sh`，或 PowerShell 用
#   scripts/build-ssg.ps1（内容与本脚本完全一致）。`pnpm build:ssg` 选 sh，
#   换 PowerShell 时用 `pnpm build:ssg:ps1`。
#   原内联链（fallback，脚本不可用时可直接粘贴）：
#   pnpm generate:sitemap && pnpm generate:search-index && pnpm --filter @toolbox/web build && pnpm --filter @toolbox/web build:ssr && pnpm prerender
# 域名由 SITE_ORIGIN 环境变量决定（预发用 --build-arg SITE_ORIGIN=https://... 覆盖）。
# =============================================================================
set -eu

pnpm generate:sitemap \
  && pnpm generate:search-index \
  && pnpm --filter @toolbox/web build \
  && pnpm --filter @toolbox/web build:ssr \
  && pnpm prerender
