# =============================================================================
# SSG 全量构建链（审计 P0-1）—— scripts/build-ssg.sh 的 Windows 镜像。
# -----------------------------------------------------------------------------
# 内容与 build-ssg.sh 完全一致，本文件只为 PowerShell 本机存在。
# 顺序不能反：sitemap → search-index → client build → SSR build → prerender
# （search-index 是 P0-1：deploy/docker/Dockerfile 旧链漏掉，之前控制器和构建顺序说明见 .sh）。
# catalog check 由 CI 另一条门禁负责，不在此。
# =============================================================================
$ErrorActionPreference = 'Stop'

pnpm generate:sitemap
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
pnpm generate:search-index
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
pnpm --filter @toolbox/web build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
pnpm --filter @toolbox/web build:ssr
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
pnpm prerender
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
