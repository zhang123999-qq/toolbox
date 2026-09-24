#!/bin/sh
# ============================================================================
# Toolbox 一键安装脚本
#
# 用法（在目标机上以 root 执行）：
#   curl -fsSL https://raw.githubusercontent.com/zhang123999-qq/toolbox/master/deploy/binary/install.sh | sudo sh
#   curl -fsSL .../install.sh | sudo sh -s -- --port 8080 --install-deps
#
# 也可以先下载再执行（推荐，便于审阅脚本内容）：
#   curl -fsSLO https://raw.githubusercontent.com/zhang123999-qq/toolbox/master/deploy/binary/install.sh
#   sudo sh install.sh --version 0.0.1
#
# 安装源（三选一，按优先级）：
#   1. --from   <url|本地文件>   直接指定某个 bundle 包
#   2. --source <base-url>      内网/自建发布源（目录内需有 latest.txt 与包+校验文件）
#   3. 默认                      GitHub Releases（仓库需公开；私有仓库用 GITHUB_TOKEN）
#
# 设计要点
#   • 先校验 sha256 再解包，校验不过绝不安装。
#   • 不就地修改任何系统文件；真正的落地逻辑全部交给 bundle 内的 toolboxctl，
#     保证「curl 一键装」与「手动解包装」走的是同一条代码路径。
#   • 无交互：可在 `curl | sh` 这种 stdin 被占用的场景下运行。
#   • 全程可 `--dry-run` 预览将要执行的动作。
# ============================================================================
set -eu

REPO=${TOOLBOX_REPO:-zhang123999-qq/toolbox}
RAW_BASE=${TOOLBOX_RAW_BASE:-https://raw.githubusercontent.com/${REPO}/master}
TOKEN=${GITHUB_TOKEN:-}

VERSION=""
SOURCE=""
FROM=""
PORT=""
PREFIX=""
INSTALL_DEPS=0
NO_START=0
DRY_RUN=0

info() { printf '[install] %s\n' "$*"; }
warn() { printf '[install] 警告: %s\n' "$*" >&2; }
die()  { printf '[install] 错误: %s\n' "$*" >&2; exit 1; }

usage() {
  cat <<'USAGE'
Toolbox 一键安装

  --version V      指定版本（默认取最新）
  --from URL|FILE  直接指定 bundle 包地址或本地路径
  --source URL     指定发布源基址（含 latest.txt 与包文件）
  --port N         监听端口（默认 80）
  --prefix DIR     安装根目录（默认 /opt/toolbox）
  --install-deps   自动安装系统依赖（apt-get install nginx）
  --no-start       只落地不启动
  --dry-run        只打印将要执行的动作
  -h, --help       显示本帮助

环境变量：
  GITHUB_TOKEN     访问私有仓库 Release 时必需
  TOOLBOX_REPO     覆盖仓库（默认 zhang123999-qq/toolbox）
USAGE
}

while [ $# -gt 0 ]; do
  case $1 in
    --version=*) VERSION=${1#*=} ;;
    --version) shift; VERSION=${1:-} ;;
    --from=*) FROM=${1#*=} ;;
    --from) shift; FROM=${1:-} ;;
    --source=*) SOURCE=${1#*=} ;;
    --source) shift; SOURCE=${1:-} ;;
    --port=*) PORT=${1#*=} ;;
    --port) shift; PORT=${1:-} ;;
    --prefix=*) PREFIX=${1#*=} ;;
    --prefix) shift; PREFIX=${1:-} ;;
    --install-deps) INSTALL_DEPS=1 ;;
    --no-start) NO_START=1 ;;
    --dry-run) DRY_RUN=1 ;;
    -h|--help) usage; exit 0 ;;
    *) die "未知参数：$1（用 --help 查看用法）" ;;
  esac
  shift
done

# —— 环境前提 ——
[ "$(id -u)" = "0" ] || die "需要 root 权限。请用：curl -fsSL <脚本地址> | sudo sh"
[ "$(uname -s)" = "Linux" ] || die "仅支持 Linux（当前 $(uname -s)）"

RAW_ARCH=$(uname -m)
case $RAW_ARCH in
  x86_64|amd64) ARCH=amd64 ;;
  aarch64|arm64) ARCH=arm64 ;;
  *) die "不支持的架构：$RAW_ARCH（当前发布 amd64 / arm64）" ;;
esac

for c in tar sha256sum; do
  command -v "$c" >/dev/null 2>&1 || die "缺少必需命令：$c"
done
if ! command -v curl >/dev/null 2>&1 && ! command -v wget >/dev/null 2>&1; then
  die "缺少 curl 或 wget"
fi

# curl 优先（便于带 token）；退化到 wget
fetch() { # fetch <url> <dest>
  if command -v curl >/dev/null 2>&1; then
    if [ -n "$TOKEN" ]; then
      curl -fsSL --max-time 300 \
        -H "Authorization: Bearer $TOKEN" \
        -H "Accept: application/octet-stream" \
        -o "$2" "$1"
    else
      curl -fsSL --max-time 300 -o "$2" "$1"
    fi
  else
    wget -qO "$2" --timeout=300 --header="Authorization: Bearer $TOKEN" "$1"
  fi
}

fetch_text() { # fetch_text <url> -> stdout
  if command -v curl >/dev/null 2>&1; then
    if [ -n "$TOKEN" ]; then
      curl -fsSL --max-time 60 -H "Authorization: Bearer $TOKEN" "$1"
    else
      curl -fsSL --max-time 60 "$1"
    fi
  else
    wget -qO- --timeout=60 "$1"
  fi
}

# —— 解析版本与下载地址 ——
TAG=""
ASSET_VER=""

if [ -n "$FROM" ]; then
  case $FROM in
    http://*|https://*)
      PKG_URL=$FROM
      info "使用 --from 指定的地址：$PKG_URL"
      ;;
    *)
      [ -f "$FROM" ] || die "--from 指向的文件不存在：$FROM"
      PKG_URL=""
      PKG_LOCAL=$FROM
      info "使用 --from 指定的本地包：$PKG_LOCAL"
      ;;
  esac
elif [ -n "$SOURCE" ]; then
  base=${SOURCE%/}
  if [ -n "$VERSION" ]; then
    ASSET_VER=$VERSION
    info "使用指定版本 $ASSET_VER（源：$base）"
  else
    ASSET_VER=$(fetch_text "$base/latest.txt" 2>/dev/null | tr -d ' \t\r\n') || true
    [ -n "$ASSET_VER" ] || die "无法从 $base/latest.txt 取到版本号（检查发布源）"
    info "从发布源解析到最新版本：$ASSET_VER"
  fi
  PKG_URL="$base/toolbox-${ASSET_VER}-linux-${ARCH}.tar.gz"
else
  if [ -n "$VERSION" ]; then
    TAG="v${VERSION#v}"
    ASSET_VER=${TAG#v}
    info "使用指定版本 $ASSET_VER"
  else
    api="https://api.github.com/repos/${REPO}/releases/latest"
    body=$(fetch_text "$api" 2>/dev/null) || true
    if [ -z "$body" ]; then
      warn "取 latest release 失败（私有仓库需 GITHUB_TOKEN，或改用 --source / --from）"
    fi
    TAG=$(printf '%s' "$body" | sed -n 's/.*"tag_name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)
    [ -n "$TAG" ] || die "无法确定最新版本。请显式指定 --version，或改用 --source / --from。"
    ASSET_VER=${TAG#v}
    info "解析到最新 Release：$TAG"
  fi
  PKG_URL="https://github.com/${REPO}/releases/download/${TAG}/toolbox-${ASSET_VER}-linux-${ARCH}.tar.gz"
fi

if [ -z "$PKG_URL" ]; then
  info "跳过下载，直接用本地包"
else
  info "包地址：$PKG_URL"
fi

if [ "$DRY_RUN" = "1" ]; then
  info "--dry-run：以下动作将不会真正执行"
  printf '  下载   : %s\n' "${PKG_URL:-（本地文件 $PKG_LOCAL）}"
  printf '  校验   : 同名 .sha256\n'
  printf '  解包   : /tmp/toolbox-install.XXXXXX\n'
  printf '  安装   : toolboxctl install --from <包> --port %s --prefix %s\n' "${PORT:-80}" "${PREFIX:-/opt/toolbox}"
  [ "$INSTALL_DEPS" = "1" ] && printf '  依赖   : apt-get install -y nginx\n'
  exit 0
fi

WORK=$(mktemp -d "${TMPDIR:-/tmp}/toolbox-install.XXXXXX")
trap 'rm -rf "$WORK"' EXIT INT TERM

# —— 下载 + 校验 ——
if [ -n "${PKG_LOCAL:-}" ]; then
  cp -f "$PKG_LOCAL" "$WORK/pkg.tar.gz"
  if [ -f "${PKG_LOCAL}.sha256" ]; then
    cp -f "${PKG_LOCAL}.sha256" "$WORK/pkg.sha256"
  fi
else
  info "下载中…"
  fetch "$PKG_URL" "$WORK/pkg.tar.gz" \
    || die "下载失败：$PKG_URL
  常见原因：仓库为私有（需 GITHUB_TOKEN）、版本不存在、或网络不通。"
  if ! fetch "$PKG_URL.sha256" "$WORK/pkg.sha256" 2>/dev/null; then
    die "缺少校验文件 ${PKG_URL}.sha256 —— 出于安全考虑拒绝在无校验的情况下安装"
  fi
fi

if [ -f "$WORK/pkg.sha256" ]; then
  want=$(awk '{print $1}' "$WORK/pkg.sha256")
  got=$(sha256sum "$WORK/pkg.tar.gz" | awk '{print $1}')
  if [ "$want" != "$got" ]; then
    die "sha256 校验失败
  期望 $want
  实际 $got
  包可能损坏或被篡改，已中止安装。"
  fi
  info "sha256 校验通过（${got}）"
else
  warn "无 .sha256 伴随文件，跳过整包校验（bundle 内部仍会做逐文件校验）"
fi

# —— 解包 ——
info "解包…"
mkdir -p "$WORK/x"
tar -xzf "$WORK/pkg.tar.gz" -C "$WORK/x" || die "解包失败，包可能损坏"
CTL="$WORK/x/bin/toolboxctl"
if [ ! -x "$CTL" ]; then
  # 兼容包内多一层目录
  inner=$(find "$WORK/x" -maxdepth 2 -name toolboxctl -path '*/bin/*' 2>/dev/null | head -1)
  [ -n "$inner" ] || die "包结构异常：未找到 bin/toolboxctl"
  CTL=$inner
fi

# —— 交给 bundle 内的 toolboxctl 落地 ——
set -- install --from "$WORK/pkg.tar.gz"
[ -n "$PORT" ] && set -- "$@" --port "$PORT"
[ -n "$PREFIX" ] && set -- "$@" --prefix "$PREFIX"
[ "$INSTALL_DEPS" = "1" ] && set -- "$@" --install-deps
[ "$NO_START" = "1" ] && set -- "$@" --no-start

info "开始安装（toolboxctl $*）"
sh "$CTL" "$@"

info "完成。常用命令："
printf '  toolboxctl status\n  toolboxctl logs -f\n  toolboxctl upgrade --source <发布源>\n'
