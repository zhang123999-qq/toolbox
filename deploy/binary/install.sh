#!/bin/sh
# ============================================================================
# Toolbox 一键安装脚本（支持 curl | bash 管道执行）
#
# 最简用法（目标机以 root 执行）：
#   curl -fsSL https://github.com/zhang123999-qq/toolbox/releases/latest/download/install.sh | sudo bash
#
# 带参数（管道场景必须用 `bash -s --` 传参）：
#   ... | sudo bash -s -- --service
#   ... | sudo bash -s -- -v 0.0.1-beta --proxy http://127.0.0.1:10808
#
# 也支持先下载再执行（推荐，便于先审阅脚本内容）：
#   curl -fsSLO <上面的地址> && sudo bash install.sh --version 0.0.1-beta
#
# 参数：
#   -v, --version VER    指定版本（默认最新 Release），v 前缀可省略
#       --from URL|FILE  直接用指定的包，跳过版本解析（内网分发用）
#       --source URL     发布源基址（目录内需有 latest.txt 与包 + 校验文件）
#                        默认 https://github.com/<repo>/releases/latest/download
#       --proxy URL      下载走代理，例：http://127.0.0.1:10808
#       --mirror URL     GitHub 下载加速前缀，例：https://ghfast.top
#       --service        安装后启用开机自启并立即启动（会做 systemd 前置检查）
#       --no-start       只落地文件，不启动、不设自启
#       --port N         站点监听端口（默认 8081，同 Docker 形态）
#       --prefix DIR     站点安装根目录（默认 /opt/toolbox）
#       --bin-dir DIR    命令行入口目录（默认 /usr/local/bin）
#       --install-deps   自动安装系统依赖（apt-get install nginx）
#       --no-verify      跳过 sha256 校验（不推荐）
#       --dry-run        只打印将要执行的动作，不落地
#   -h, --help           显示帮助
#
# 环境变量（同名参数优先）：
#   GITHUB_TOKEN    访问私有仓库 Release 必需
#   TOOLBOX_REPO    覆盖仓库（默认 zhang123999-qq/toolbox）
#   TOOLBOX_PROXY   同 --proxy
#   TOOLBOX_MIRROR  同 --mirror
#   TOOLBOX_PORT    同 --port（默认 8081）
#
# 设计要点
#   • 安装源三选一，优先级：--from > --source > GitHub Releases。
#   • 先校验 sha256 再解包；缺少校验文件默认直接失败（--no-verify 才可跳过）。
#   • 真正的落地逻辑全部交给 bundle 内的 toolboxctl —— 「curl 一键装」与
#     「手动解包装」走的是同一条代码路径，不存在两套实现。
#   • 无交互：可在 `curl | bash` 这种 stdin 被占用的场景下运行。
#   • 无 systemd 的机器自动降级为「只落地不启动」，而不是装到一半失败。
# ============================================================================

# —— 非 bash 时自动切到 bash ——
# 保留 `sh install.sh`（先下载后执行）这一路径的可用性；纯管道 + sh 无法重读
# stdin，只能给出明确提示让用户改用 bash。
if [ -z "${BASH_VERSION:-}" ]; then
  if command -v bash >/dev/null 2>&1 && [ -r "$0" ]; then
    exec bash "$0" "$@"
  fi
  printf '\033[31m错误: 本脚本需要 bash。请用：curl -fsSL <脚本地址> | sudo bash\033[0m\n' >&2
  exit 1
fi
set -u

REPO=${TOOLBOX_REPO:-zhang123999-qq/toolbox}
# 发布源默认值：本仓库 Release 的 latest/download 基址。
# 目录内需有 latest.txt、toolbox-<ver>-linux-<arch>.tar.gz 及其 .sha256——
# GitHub Release 资产天然满足这个布局，因此装完即可直接用 toolboxctl 在线升级。
# 换自建源时改 TOOLBOX_REPO，或显式传 --source。
RELEASE_BASE=https://github.com/${REPO}/releases/latest/download
TOKEN=${GITHUB_TOKEN:-}

VERSION=""
SOURCE=""
FROM=""
PORT=${TOOLBOX_PORT:-}
PREFIX=""
BIN_DIR="/usr/local/bin"
INSTALL_DEPS=0
NO_START=0
DO_SERVICE=0
DRY_RUN=0
NO_VERIFY=0
# 代理：参数 > 专用环境变量 > 通用代理环境变量
PROXY=${TOOLBOX_PROXY:-${https_proxy:-${HTTPS_PROXY:-${http_proxy:-${HTTP_PROXY:-}}}}}
MIRROR=${TOOLBOX_MIRROR:-}

C_RESET='\033[0m'
C_RED='\033[31m'
C_GREEN='\033[32m'
C_YELLOW='\033[33m'

info() { printf '  %s\n' "$*"; }
ok()   { printf "${C_GREEN}  ✓ %s${C_RESET}\n" "$*"; }
warn() { printf "${C_YELLOW}  警告: %s${C_RESET}\n" "$*" >&2; }
die()  { printf "${C_RED}错误: %s${C_RESET}\n" "$*" >&2; exit 1; }
step() { printf '\n\033[1m%s\033[0m\n' "$*"; }

usage() {
  cat <<'USAGE'
Toolbox 一键安装（curl | bash）

用法:
  curl -fsSL <脚本地址> | sudo bash
  curl -fsSL <脚本地址> | sudo bash -s -- [选项]
  curl -fsSLO <脚本地址> && sudo bash install.sh [选项]

选项:
  -v, --version VER    安装指定版本（默认最新 Release），可写 v0.0.1-beta 或 0.0.1-beta
      --from URL|FILE  直接指定部署包（URL 或本地路径），跳过版本解析
      --source URL     发布源基址（目录内需有 latest.txt 与包 + .sha256）
                       默认 https://github.com/<repo>/releases/latest/download
      --proxy URL      下载走代理，例: http://127.0.0.1:10808
      --mirror URL     GitHub 下载加速前缀，例: https://ghfast.top
      --service        安装后启用开机自启并立即启动（额外做 systemd 前置检查）
      --no-start       只落地文件，不启动、也不设开机自启
      --port N         站点监听端口（默认 8081，同 Docker 形态）
      --prefix DIR     站点安装根目录（默认 /opt/toolbox）
      --bin-dir DIR    命令行入口目录（默认 /usr/local/bin）
      --install-deps   自动安装系统依赖（apt-get install nginx）
      --no-verify      跳过 sha256 校验（不推荐）
      --dry-run        只打印将要执行的动作
  -h, --help           显示本帮助

示例:
  # 默认安装（装到 /usr/local/bin，服务开机自启）
  curl -fsSL <脚本地址> | sudo bash

  # 指定版本
  curl -fsSL <脚本地址> | sudo bash -s -- -v 0.0.1-beta

  # 国内网络走代理
  curl -fsSL <脚本地址> | sudo bash -s -- --proxy http://127.0.0.1:10808

  # 组合：指定版本 + 代理 + 开机自启 + 换端口（默认 8081，这里示范换成 9090）
  curl -fsSL <脚本地址> | sudo bash -s -- -v 0.0.1-beta --proxy http://127.0.0.1:10808 --service --port 9090

环境变量:
  GITHUB_TOKEN    私有仓库取 Release 时需要
  TOOLBOX_REPO    覆盖仓库（默认 zhang123999-qq/toolbox）
  TOOLBOX_PROXY   同 --proxy
  TOOLBOX_MIRROR  同 --mirror
  TOOLBOX_PORT    同 --port（默认 8081）
USAGE
  exit 0
}

while [ $# -gt 0 ]; do
  case $1 in
    -v|--version)
      [ $# -ge 2 ] || die "-v/--version 需要一个版本号，例：-v 0.0.1-beta"
      VERSION=${2#v}; shift 2 ;;
    --version=*)     VERSION=$(printf '%s' "${1#*=}" | sed 's/^v//'); shift ;;
    --from)
      [ $# -ge 2 ] || die "--from 需要一个 URL 或文件路径"
      FROM=$2; shift 2 ;;
    --from=*)        FROM=${1#*=}; shift ;;
    --source)
      [ $# -ge 2 ] || die "--source 需要一个发布源基址"
      SOURCE=$2; shift 2 ;;
    --source=*)      SOURCE=${1#*=}; shift ;;
    --proxy)
      [ $# -ge 2 ] || die "--proxy 需要一个代理地址"
      PROXY=$2; shift 2 ;;
    --proxy=*)       PROXY=${1#*=}; shift ;;
    --mirror)
      [ $# -ge 2 ] || die "--mirror 需要一个加速前缀"
      MIRROR=$2; shift 2 ;;
    --mirror=*)      MIRROR=${1#*=}; shift ;;
    --port)
      [ $# -ge 2 ] || die "--port 需要一个端口号"
      PORT=$2; shift 2 ;;
    --port=*)        PORT=${1#*=}; shift ;;
    --prefix)
      [ $# -ge 2 ] || die "--prefix 需要一个目录"
      PREFIX=$2; shift 2 ;;
    --prefix=*)      PREFIX=${1#*=}; shift ;;
    --bin-dir)
      [ $# -ge 2 ] || die "--bin-dir 需要一个目录"
      BIN_DIR=$2; shift 2 ;;
    --bin-dir=*)     BIN_DIR=${1#*=}; shift ;;
    --install-deps)  INSTALL_DEPS=1; shift ;;
    --no-start)      NO_START=1; shift ;;
    --service)       DO_SERVICE=1; shift ;;
    --no-verify)     NO_VERIFY=1; shift ;;
    --dry-run)       DRY_RUN=1; shift ;;
    -h|--help)       usage ;;
    *) die "未知参数：$1（用 -h 查看用法）" ;;
  esac
done

# --service 与 --no-start 语义相反，同时给出说明用户意图不明
if [ "$DO_SERVICE" = "1" ] && [ "$NO_START" = "1" ]; then
  die "--service 与 --no-start 不能同时使用（前者要开机自启，后者只落地不启动）"
fi

printf '\n\033[1mToolbox 安装程序\033[0m\n'

# ============================================================================
# 1/6 环境检查
# ============================================================================
step '1/6 环境检查'

[ "$(id -u)" = "0" ] || die "需要 root 权限。请用：curl -fsSL <脚本地址> | sudo bash"
ok "权限：root"

[ "$(uname -s)" = "Linux" ] || die "仅支持 Linux（当前 $(uname -s)）"
ok "系统：Linux"

RAW_ARCH=$(uname -m)
case $RAW_ARCH in
  x86_64|amd64)   ARCH=amd64 ;;
  aarch64|arm64)  ARCH=arm64 ;;
  *) die "不支持的架构：$RAW_ARCH（当前发布 amd64 / arm64）" ;;
esac
ok "架构：$RAW_ARCH → $ARCH"

for c in tar sha256sum; do
  command -v "$c" >/dev/null 2>&1 || die "缺少必需命令：$c"
done
if command -v curl >/dev/null 2>&1; then
  DL=curl
elif command -v wget >/dev/null 2>&1; then
  DL=wget
else
  die "缺少 curl 或 wget（无法下载部署包）"
fi
ok "下载工具：$DL"

# systemd 探测：没有 systemd 时不能走「enable + restart」，否则会装到一半失败。
HAS_SYSTEMD=0
if [ -d /run/systemd/system ] && command -v systemctl >/dev/null 2>&1; then
  HAS_SYSTEMD=1
  ok "服务管理：systemd"
else
  warn "本机没有可用的 systemd，将只落地文件（等同 --no-start）"
  NO_START=1
fi

if [ -n "$PROXY" ]; then
  ok "代理：$PROXY"
  # 导出给子进程：--install-deps 的 apt-get、以及 bundle 内部的下载都认这两个变量
  export http_proxy="$PROXY" https_proxy="$PROXY"
fi
if [ -n "$MIRROR" ]; then
  ok "加速镜像：$MIRROR"
fi

# —— 下载封装：统一处理代理、超时、重试 ——
# 相对常见做法多做了两件事：失败自动重试 2 次；下载后由调用方做体积下限检查，
# 避免在受限网络里把「代理返回的 HTML 错误页」当成部署包继续安装。
fetch() { # fetch <url> <dest>
  if [ "$DL" = "curl" ]; then
    if [ -n "$TOKEN" ]; then
      curl -fsSL --connect-timeout 10 --max-time 300 --retry 2 --retry-delay 2 \
        ${PROXY:+-x "$PROXY"} \
        -H "Authorization: Bearer $TOKEN" \
        -H "Accept: application/octet-stream" \
        -o "$2" "$1"
    else
      curl -fsSL --connect-timeout 10 --max-time 300 --retry 2 --retry-delay 2 \
        ${PROXY:+-x "$PROXY"} \
        -o "$2" "$1"
    fi
  else
    if [ -n "$PROXY" ]; then
      http_proxy="$PROXY" https_proxy="$PROXY" \
        wget -q -T 30 --tries=3 -O "$2" "$1"
    else
      wget -q -T 30 --tries=3 -O "$2" "$1"
    fi
  fi
}

fetch_text() { # fetch_text <url> -> stdout
  if [ "$DL" = "curl" ]; then
    if [ -n "$TOKEN" ]; then
      curl -fsSL --connect-timeout 10 --max-time 60 --retry 2 \
        ${PROXY:+-x "$PROXY"} -H "Authorization: Bearer $TOKEN" "$1"
    else
      curl -fsSL --connect-timeout 10 --max-time 60 --retry 2 \
        ${PROXY:+-x "$PROXY"} "$1"
    fi
  else
    if [ -n "$PROXY" ]; then
      http_proxy="$PROXY" https_proxy="$PROXY" wget -qO- -T 30 --tries=3 "$1"
    else
      wget -qO- -T 30 --tries=3 "$1"
    fi
  fi
}

# GitHub 下载走加速镜像：只改写 github.com 的下载域名，其余（自建源 / API）不动
apply_mirror() { # apply_mirror <url>
  case $1 in
    https://github.com/*)
      if [ -n "$MIRROR" ]; then
        printf '%s/%s' "${MIRROR%/}" "$1"
      else
        printf '%s' "$1"
      fi
      ;;
    *) printf '%s' "$1" ;;
  esac
}

# ============================================================================
# 2/6 解析版本与下载地址
# ============================================================================
step '2/6 解析版本'

PKG_LOCAL=""

if [ -n "$FROM" ]; then
  case $FROM in
    http://*|https://*)
      PKG_URL=$(apply_mirror "$FROM")
      ok "来源：--from 指定的地址"
      info "$PKG_URL"
      ;;
    *)
      [ -f "$FROM" ] || die "--from 指向的文件不存在：$FROM"
      PKG_URL=""
      PKG_LOCAL=$FROM
      ok "来源：--from 指定的本地包 $PKG_LOCAL"
      ;;
  esac
elif [ -n "$SOURCE" ]; then
  base=${SOURCE%/}
  if [ -n "$VERSION" ]; then
    ASSET_VER=$VERSION
  else
    ASSET_VER=$(fetch_text "$base/latest.txt" 2>/dev/null | tr -d ' \t\r\n') || true
    [ -n "$ASSET_VER" ] || die "无法从 $base/latest.txt 取到版本号（检查发布源是否可用）"
  fi
  ok "来源：自建发布源 $base"
  PKG_URL="$base/toolbox-${ASSET_VER}-linux-${ARCH}.tar.gz"
  info "版本：$ASSET_VER"
else
  if [ -n "$VERSION" ]; then
    TAG="v${VERSION#v}"
    ASSET_VER=${TAG#v}
    ok "来源：GitHub Releases（指定版本）"
  else
    api="https://api.github.com/repos/${REPO}/releases/latest"
    body=$(fetch_text "$api" 2>/dev/null) || true
    TAG=$(printf '%s' "$body" | sed -n 's/.*"tag_name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)
    if [ -z "$TAG" ]; then
      # 常见原因：仓库私有且无 GITHUB_TOKEN、或网络不通。给可执行的下一步而不是干报错。
      die "无法确定最新版本。
  可任选其一：
    1) 显式指定版本   --version 0.0.1-beta
    2) 用自建发布源   --source http://<内网源>
    3) 私有仓库带 token  GITHUB_TOKEN=<token> $0"
    fi
    ASSET_VER=${TAG#v}
    ok "来源：GitHub Releases（最新）"
  fi
  PKG_URL=$(apply_mirror "https://github.com/${REPO}/releases/download/${TAG}/toolbox-${ASSET_VER}-linux-${ARCH}.tar.gz")
  info "版本：$ASSET_VER（tag $TAG）"
fi

if [ "$DRY_RUN" = "1" ]; then
  step '（--dry-run）将要执行的动作'
  if [ -n "$PKG_LOCAL" ]; then
    printf '  包      : 本地文件 %s\n' "$PKG_LOCAL"
  else
    printf '  包      : %s\n' "$PKG_URL"
  fi
  printf '  校验    : %s\n' "$([ "$NO_VERIFY" = "1" ] && echo '已跳过（--no-verify）' || echo '同名 .sha256，缺失即中止')"
  printf '  站点目录: %s\n' "${PREFIX:-/opt/toolbox}"
  printf '  命令入口: %s\n' "${BIN_DIR}"
  printf '  端口    : %s\n' "${PORT:-8081}"
  printf '  开机自启: %s\n' "$([ "$NO_START" = "1" ] && echo '否（--no-start）' || echo '是')"
  [ "$INSTALL_DEPS" = "1" ] && printf '  系统依赖: apt-get install -y nginx\n'
  printf '\n  --dry-run：以上动作均未执行\n\n'
  exit 0
fi

# ============================================================================
# 3/6 下载
# ============================================================================
step '3/6 下载部署包'

WORK=$(mktemp -d "${TMPDIR:-/tmp}/toolbox-install.XXXXXX")
trap 'rm -rf "$WORK"' EXIT INT TERM

if [ -n "$PKG_LOCAL" ]; then
  cp -f "$PKG_LOCAL" "$WORK/pkg.tar.gz" || die "读取本地包失败：$PKG_LOCAL"
  [ -f "${PKG_LOCAL}.sha256" ] && cp -f "${PKG_LOCAL}.sha256" "$WORK/pkg.sha256"
  ok "已使用本地包（跳过下载）"
else
  info "$PKG_URL"
  if ! fetch "$PKG_URL" "$WORK/pkg.tar.gz"; then
    if [ -n "$PROXY" ]; then
      die "下载失败。请检查代理是否可用：$PROXY"
    else
      die "下载失败。若在受限网络，可加 --proxy http://127.0.0.1:10808 或 --mirror https://ghfast.top"
    fi
  fi
  SIZE=$(wc -c < "$WORK/pkg.tar.gz" | tr -d ' ')
  # 部署包远大于 1KB：体积异常通常意味着拿到的是代理/网关返回的错误页
  if [ "${SIZE:-0}" -lt 1024 ]; then
    die "下载内容异常（仅 ${SIZE} 字节），通常是因为拿到了错误页而非部署包"
  fi
  ok "已下载 ${SIZE} 字节"
fi

# ============================================================================
# 4/6 校验
# ============================================================================
step '4/6 校验完整性'

if [ "$NO_VERIFY" = "1" ]; then
  warn "已按 --no-verify 跳过 sha256 校验"
elif [ -n "$PKG_LOCAL" ] && [ ! -f "$WORK/pkg.sha256" ]; then
  warn "本地包没有伴随 .sha256，跳过整包校验（bundle 内部仍会做逐文件校验）"
else
  if [ -z "$PKG_LOCAL" ]; then
    fetch "$PKG_URL.sha256" "$WORK/pkg.sha256" 2>/dev/null \
      || die "缺少校验文件 ${PKG_URL}.sha256 —— 出于安全考虑拒绝在无校验的情况下安装（可用 --no-verify 强制）"
  fi
  WANT=$(awk '{print $1}' "$WORK/pkg.sha256" | head -1)
  GOT=$(sha256sum "$WORK/pkg.tar.gz" | awk '{print $1}')
  [ -n "$WANT" ] || die "校验文件内容为空"
  [ "$WANT" = "$GOT" ] || die "sha256 校验失败
  期望 $WANT
  实际 $GOT
  包可能损坏或被篡改，已中止安装。"
  ok "sha256 校验通过（$GOT）"
fi

# ============================================================================
# 5/6 解包
# ============================================================================
step '5/6 解包'

mkdir -p "$WORK/x"
tar -xzf "$WORK/pkg.tar.gz" -C "$WORK/x" || die "解包失败，包可能已损坏"
CTL="$WORK/x/bin/toolboxctl"
if [ ! -x "$CTL" ]; then
  inner=$(find "$WORK/x" -maxdepth 2 -name toolboxctl -path '*/bin/*' 2>/dev/null | head -1)
  [ -n "$inner" ] || die "包结构异常：未找到 bin/toolboxctl"
  CTL=$inner
fi
ok "包结构正常（$CTL）"

# ============================================================================
# 6/6 安装
# ============================================================================
step '6/6 安装'

set -- install --from "$WORK/pkg.tar.gz"
[ -n "$PORT" ] && set -- "$@" --port "$PORT"
[ -n "$PREFIX" ] && set -- "$@" --prefix "$PREFIX"
[ "$INSTALL_DEPS" = "1" ] && set -- "$@" --install-deps
[ "$NO_START" = "1" ] && set -- "$@" --no-start

info "交给 bundle 内的 toolboxctl 落地：$*"
printf '\n'
sh "$CTL" "$@"

# —— 命令入口：让 `toolbox` / `toolboxctl` 在 PATH 里可直接调用 ——
# toolboxctl 自身会把 toolboxctl 链到 /usr/local/bin；这里补一个更短的 `toolbox` 别名，
# 并在 --bin-dir 不是默认路径时把两个入口都链到指定目录。
SITE_PREFIX=${PREFIX:-/opt/toolbox}
CTL_REAL="$SITE_PREFIX/current/bin/toolboxctl"
if [ -x "$CTL_REAL" ]; then
  mkdir -p "$BIN_DIR" 2>/dev/null || true
  ln -sfn "$CTL_REAL" "$BIN_DIR/toolboxctl" 2>/dev/null || true
  ln -sfn "$CTL_REAL" "$BIN_DIR/toolbox" 2>/dev/null || true
  ok "命令入口：$BIN_DIR/toolboxctl、$BIN_DIR/toolbox"
else
  warn "未找到 $CTL_REAL，跳过命令入口创建（安装可能未完整完成）"
fi

# —— 开机自启：--service 时额外确认单元确实已 enable ——
if [ "$DO_SERVICE" = "1" ] && [ "$NO_START" != "1" ]; then
  if [ "$HAS_SYSTEMD" = "1" ]; then
    if systemctl is-enabled toolbox.service >/dev/null 2>&1; then
      ok "开机自启：已启用（systemctl is-enabled toolbox.service = enabled）"
    else
      warn "服务单元未处于 enabled 状态，请执行：systemctl enable --now toolbox.service"
    fi
  fi
fi
if [ "$NO_START" = "1" ] && [ "$HAS_SYSTEMD" = "1" ]; then
  info "本次未启动、未设开机自启（--no-start）；需要时执行：systemctl enable --now toolbox.service"
fi

printf "\n${C_GREEN}\033[1m安装完成\033[0m${C_RESET}\n\n"
printf '  查看状态     toolboxctl status\n'
printf '  环境自检     toolboxctl doctor\n'
printf '  实时日志     toolboxctl logs -f\n'
printf '  在线升级     toolboxctl upgrade --source %s\n' "$RELEASE_BASE"
printf '  回滚上一版   toolboxctl rollback\n'
printf '  完全卸载     toolboxctl uninstall --purge\n'
printf '\n'
