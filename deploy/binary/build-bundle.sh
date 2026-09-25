#!/usr/bin/env bash
# ============================================================================
# build-bundle.sh —— 把项目打成一个可离线部署的二进制 bundle
#
# 产物（<out>/）：
#   toolbox-<ver>-linux-<arch>.tar.gz          自包含部署包
#   toolbox-<ver>-linux-<arch>.tar.gz.sha256   整包校验值（升级前校验用）
#   latest.txt                                  最新版本号（升级源需要）
#   index.json                                  已发布版本索引
#
# bundle 内部结构：
#   VERSION / manifest.json / checksums.txt / README.md
#   app/            预构建静态产物（apps/web/dist）
#   bin/toolboxctl  管理 CLI
#   conf/           nginx 主配置模板、systemd unit 模板、MIME 表
#
# 用法：
#   deploy/binary/build-bundle.sh [--version X.Y.Z] [--arch amd64]
#                                 [--out DIR] [--skip-build] [--no-index]
# ============================================================================
set -euo pipefail

HERE=$(cd -- "$(dirname -- "$0")" && pwd)
ROOT=$(cd -- "$HERE/../.." && pwd)

VERSION=$(tr -d ' \t\r\n' < "$HERE/VERSION")
ARCH=$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/')
OS=linux
OUT="$ROOT/dist-release"
SKIP_BUILD=0
WRITE_INDEX=1

while [ $# -gt 0 ]; do
  case $1 in
    --version=*) VERSION=${1#*=} ;;
    --version) shift; VERSION=${1:-} ;;
    --arch=*) ARCH=${1#*=} ;;
    --arch) shift; ARCH=${1:-} ;;
    --out=*) OUT=${1#*=} ;;
    --out) shift; OUT=${1:-} ;;
    --skip-build) SKIP_BUILD=1 ;;
    --no-index) WRITE_INDEX=0 ;;
    -h|--help) sed -n '2,25p' "$0"; exit 0 ;;
    *) echo "未知参数：$1" >&2; exit 2 ;;
  esac
  shift
done

[ -n "$VERSION" ] || { echo "版本号为空" >&2; exit 1; }

PKG="toolbox-${VERSION}-${OS}-${ARCH}"
DIST="$ROOT/apps/web/dist"

say() { printf '[bundle] %s\n' "$*"; }
die() { printf '[bundle] 错误: %s\n' "$*" >&2; exit 1; }

# —— 1. 静态产物 ——
if [ "$SKIP_BUILD" = "1" ]; then
  [ -f "$DIST/index.html" ] || die "--skip-build 但 $DIST/index.html 不存在"
  say "跳过构建，复用已有产物"
else
  # 不走 root 的 `pnpm build:ssg`：它经 turbo 编排，在本机 Windows 沙箱下会因
  # 管道范例耗尽失败（os error 231）。这里直接对 web 包跑等价的三步，产物一致。
  say "构建静态产物（client → SSR → prerender）"
  ( cd "$ROOT" \
      && pnpm --filter @toolbox/web build >/dev/null \
      && pnpm --filter @toolbox/web build:ssr >/dev/null \
      && pnpm prerender >/dev/null ) || die "构建失败"
fi

for f in index.html 404.html robots.txt; do
  [ -f "$DIST/$f" ] || die "产物缺少 $f，构建可能不完整"
done

# —— 2. 组装 staging ——
STAGE=$(mktemp -d "${TMPDIR:-/tmp}/toolbox-bundle.XXXXXX")
trap 'rm -rf "$STAGE"' EXIT INT TERM

say "组装 bundle → $STAGE"
mkdir -p "$STAGE/app" "$STAGE/bin" "$STAGE/conf"
cp -a "$DIST/." "$STAGE/app/"
cp -f "$HERE/toolboxctl" "$STAGE/bin/toolboxctl"
chmod 0755 "$STAGE/bin/toolboxctl"
cp -f "$HERE/packaging/nginx.conf.tpl" "$STAGE/conf/"
cp -f "$HERE/packaging/toolbox.service.tpl" "$STAGE/conf/"
cp -f "$HERE/packaging/mime.types" "$STAGE/conf/"
[ -f "$HERE/README.md" ] && cp -f "$HERE/README.md" "$STAGE/" || true
printf '%s\n' "$VERSION" > "$STAGE/VERSION"

# —— 3. manifest ——
GIT_COMMIT=$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo unknown)
BUILT_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
APP_BYTES=$(du -sb "$STAGE/app" 2>/dev/null | awk '{print $1}')
FILE_COUNT=$(find "$STAGE" -type f | wc -l | tr -d ' ')

cat > "$STAGE/manifest.json" <<EOF
{
  "name": "toolbox",
  "version": "$VERSION",
  "os": "$OS",
  "arch": "$ARCH",
  "builtAt": "$BUILT_AT",
  "gitCommit": "$GIT_COMMIT",
  "appBytes": ${APP_BYTES:-0},
  "fileCount": ${FILE_COUNT:-0},
  "runtime": { "kind": "nginx", "configTemplate": "conf/nginx.conf.tpl" },
  "layout": {
    "releases": "releases/<version>",
    "current": "current -> releases/<version>",
    "app": "current/app"
  },
  "healthPath": "/healthz",
  "repository": "https://github.com/zhang123999-qq/toolbox"
}
EOF

# —— 4. 文件级校验和（不含 checksums.txt 自身）——
say "生成 checksums.txt"
( cd "$STAGE" && find . -type f ! -name checksums.txt | sed 's|^\./||' | LC_ALL=C sort | xargs sha256sum ) > "$STAGE/checksums.txt"

# —— 5. 打包 ——
# 必须先把 staging 根目录（及其子目录）修成 0755 再打包：
# STAGE 来自 mktemp -d，默认 0700，而 tar 会把 `./` 这条目录项的模式原样记进归档。
# 解包后 releases/<version> 就是 drwx------，nginx worker（nobody/toolbox）
# 连 stat 都过不去 → **全站 403**（只有 /healthz 这类 return 型 location 正常）。
# 这个坑只在「真起 nginx」时才暴露，静态看文件权限看不出来。
chmod 0755 "$STAGE"
find "$STAGE" -type d -exec chmod 0755 {} +
mkdir -p "$OUT"
TARBALL="$OUT/${PKG}.tar.gz"
say "打包 → $TARBALL"
rm -f "$TARBALL" "$TARBALL.sha256"
tar -czf "$TARBALL" -C "$STAGE" .
( cd "$OUT" && sha256sum "${PKG}.tar.gz" ) > "$TARBALL.sha256"

# —— 6. 升级源索引 ——
printf '%s\n' "$VERSION" > "$OUT/latest.txt"

# 一键安装脚本：README 里 `curl … | bash` 指的就是这个文件，必须与仓库同源。
# 以前它不在打包产物里，靠手工上传，于是发布出去的常常是旧版
# （历史上一键装到旧脚本出现过不止一次）。这里每次打包强制同步。
cp -f "$HERE/install.sh" "$OUT/install.sh"
if [ "$WRITE_INDEX" = "1" ]; then
  {
    printf '{\n  "name": "toolbox",\n  "latest": "%s",\n  "releases": [\n' "$VERSION"
    first=1
    for f in $(ls -1 "$OUT"/toolbox-*-${OS}-*.tar.gz 2>/dev/null | LC_ALL=C sort -V); do
      base=${f##*/}
      v=$(printf '%s' "$base" | sed -n "s/^toolbox-\(.*\)-${OS}-.*\.tar\.gz$/\1/p")
      sum=$(awk '{print $1}' "$f.sha256" 2>/dev/null || echo "")
      [ "$first" = "1" ] || printf ',\n'
      first=0
      printf '    { "version": "%s", "file": "%s", "sha256": "%s" }' "$v" "$base" "$sum"
    done
    printf '\n  ]\n}\n'
  } > "$OUT/index.json"
fi

SIZE=$(du -h "$TARBALL" | awk '{print $1}')
say ""
say "打包完成 ✅"
say "  包文件   : $TARBALL（$SIZE，$FILE_COUNT 个文件）"
say "  校验文件 : ${PKG}.tar.gz.sha256"
say "  升级源   : $OUT（含 latest.txt / index.json，可直接用静态服务器托管）"
say "  版本     : $VERSION  commit=$GIT_COMMIT"
say ""
say "部署到目标机："
say "  scp $TARBALL.sha256 $TARBALL root@<host>:/root/"
say "  ssh root@<host> 'tar -xzf /root/${PKG}.tar.gz -C /root/pkg && /root/pkg/bin/toolboxctl install --from /root/${PKG}.tar.gz --install-deps'"
