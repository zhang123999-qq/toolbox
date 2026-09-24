#!/bin/sh
# ============================================================================
# verify-nginx-config.sh —— 在 Linux 容器里验证 bundle 的 nginx 配置可真实服务
#
# 为什么需要它：install/upgrade 依赖 systemd 与系统 nginx，不便在开发机上跑；
# 但「配置渲染 + nginx 能否起来 + 路由/压缩/404/健康检查是否正确」是最容易写错、
# 也最该在碰目标机之前验证的部分。本脚本只做这一层，不需要 systemd。
#
# 用法（宿主上）：
#   MSYS_NO_PATHCONV=1 docker run --rm -v "F:/max:/w" -w /w nginx:1.27-alpine \
#     sh /w/deploy/binary/tests/verify-nginx-config.sh /w/dist-release/toolbox-0.1.0-linux-amd64.tar.gz
#
# 参数：<bundle.tar.gz> [端口，默认 8088]
# ============================================================================
set -eu

TARBALL=${1:?用法: verify-nginx-config.sh <bundle.tar.gz> [port]}
PORT=${2:-8088}
WORK=${TMPDIR:-/tmp}/tbverify
PREFIX=$WORK/opt/toolbox

pass=0
fail=0
ok()   { pass=$((pass + 1)); printf '  [✓] %s\n' "$*"; }
bad()  { fail=$((fail + 1)); printf '  [✗] %s\n' "$*"; }
step() { printf '\n== %s\n' "$*"; }

chk() { # chk <描述> <期望> <实际>
  if [ "$2" = "$3" ]; then ok "$1（$3）"; else bad "$1：期望 [$2] 实际 [$3]"; fi
}

command -v nginx >/dev/null 2>&1 || { echo "需要在装有 nginx 的环境里运行" >&2; exit 1; }
[ -f "$TARBALL" ] || { echo "找不到 bundle：$TARBALL" >&2; exit 1; }

rm -rf "$WORK"
mkdir -p "$PREFIX/releases" "$PREFIX/shared" "$PREFIX/run" "$PREFIX/logs"

step "1. 解包 bundle"
mkdir -p "$WORK/extract"
tar -xzf "$TARBALL" -C "$WORK/extract"
VER=$(tr -d ' \t\r\n' < "$WORK/extract/VERSION" 2>/dev/null || tr -d ' \t\r\n' < "$WORK/extract/./VERSION")
[ -n "$VER" ] || { echo "bundle 缺 VERSION" >&2; exit 1; }
# 兼容 tar 内多一层目录
if [ ! -f "$WORK/extract/manifest.json" ]; then
  for d in "$WORK/extract"/*; do
    [ -d "$d" ] && [ -f "$d/manifest.json" ] && { mv "$d" "$WORK/extract2" && rm -rf "$WORK/extract" && mv "$WORK/extract2" "$WORK/extract"; break; }
  done
fi
[ -f "$WORK/extract/manifest.json" ] && ok "manifest.json 存在" || bad "缺 manifest.json"
printf '    bundle 版本：%s\n' "$VER"

step "2. 文件级校验和（sha256sum -c）"
if ( cd "$WORK/extract" && sha256sum -c checksums.txt ) >/dev/null 2>&1; then
  ok "checksums.txt 全部通过"
else
  bad "checksums.txt 校验失败"
  ( cd "$WORK/extract" && sha256sum -c checksums.txt ) 2>&1 | grep -v ': OK$' | head -10
fi

step "3. 按 releases/current 布局就位"
mkdir -p "$PREFIX/releases/$VER"
( cd "$WORK/extract" && cp -a . "$PREFIX/releases/$VER/" )
chmod +x "$PREFIX/releases/$VER/bin/toolboxctl"
ln -sfn "releases/$VER" "$PREFIX/current"
CTL="$PREFIX/current/bin/toolboxctl"
[ -x "$CTL" ] && ok "CLI 可执行：current/bin/toolboxctl" || bad "CLI 不可执行"
[ -f "$PREFIX/current/app/index.html" ] && ok "app/index.html 经软链可见" || bad "app 不可见"
[ -f "$PREFIX/current/conf/nginx.conf.tpl" ] && ok "current/conf 模板就位（install 走这个路径）" || bad "current/conf 缺模板"

step "4. 渲染配置（toolboxctl render）"
sh "$CTL" render --prefix "$PREFIX" --port "$PORT" --nginx-user nobody --version "$VER" --out "$PREFIX/shared" \
  || { bad "render 失败"; exit 1; }
[ -f "$PREFIX/shared/nginx.conf" ] && ok "nginx.conf 已生成" || bad "nginx.conf 缺失"
[ -f "$PREFIX/shared/toolbox.service" ] && ok "toolbox.service 已生成" || bad "toolbox.service 缺失"

step "5. 渲染结果检查"
grep -q "listen       $PORT;" "$PREFIX/shared/nginx.conf" && ok "监听端口已替换为 $PORT" || bad "端口占位符未替换"
grep -q "@[A-Z_]*@" "$PREFIX/shared/nginx.conf" && bad "仍存在未替换的占位符" || ok "无残留占位符"
grep -q "root  $PREFIX/current/app;" "$PREFIX/shared/nginx.conf" && ok "root 指向 current/app" || bad "root 指向不正确"
grep -q "ExecStart=.* -c $PREFIX/shared/nginx.conf" "$PREFIX/shared/toolbox.service" && ok "unit 引用渲染后的配置" || bad "unit 的 -c 路径不对"
grep -q "ok v$VER" "$PREFIX/shared/nginx.conf" && ok "健康检查端点含版本号 v$VER" || bad "健康检查版本号缺失"

step "6. nginx 语法校验 + 启动"
if nginx -t -c "$PREFIX/shared/nginx.conf" >/dev/null 2>&1; then
  ok "nginx -t 通过"
else
  bad "nginx -t 失败"; nginx -t -c "$PREFIX/shared/nginx.conf" 2>&1 | tail -5
  exit 1
fi
nginx -c "$PREFIX/shared/nginx.conf" -g 'daemon off;' &
NGINX_PID=$!
trap 'kill "$NGINX_PID" 2>/dev/null || true' EXIT INT TERM

i=0
while [ "$i" -lt 30 ]; do
  if curl -fsS --max-time 2 "http://127.0.0.1:$PORT/healthz" >/dev/null 2>&1; then break; fi
  i=$((i + 1)); sleep 0.3
done

HDRS=$(curl -s -D - -o /dev/null --max-time 5 "http://127.0.0.1:$PORT/" 2>/dev/null || true)

step "7. 路由与响应头断言"
code_of() { printf '%s' "$HDRS" | awk -v u="$1" 'BEGIN{c=""} /^HTTP/{c=$2} END{print c}'; }

chk "GET / 状态码" "200" "$(printf '%s' "$HDRS" | awk '/^HTTP/{c=$2} END{print c}')"
printf '%s' "$HDRS" | grep -qi 'content-type: text/html' && ok "首页 Content-Type 为 text/html" || bad "首页 Content-Type 错误"

for path in /tools /tools/json-formatter /c/dev /c/dev/data-format /robots.txt /sitemap.xml /images/hero-placeholder.svg; do
  c=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "http://127.0.0.1:$PORT$path" || echo 000)
  chk "GET $path" "200" "$c"
done

# /404.html 声明为 internal，只允许 error_page 内部跳转，直接访问应当 404
c=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "http://127.0.0.1:$PORT/404.html" || echo 000)
chk "GET /404.html（internal，应 404）" "404" "$c"

for path in /nonexistent-page /tools/does-not-exist /c/dev/not-a-category; do
  c=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "http://127.0.0.1:$PORT$path" || echo 000)
  chk "GET $path（应 404）" "404" "$c"
done

h=$(curl -s --max-time 5 "http://127.0.0.1:$PORT/healthz" || true)
chk "GET /healthz 响应体" "ok v$VER" "$(printf '%s' "$h" | tr -d '\r\n')"

t=$(curl -s --max-time 5 "http://127.0.0.1:$PORT/nonexistent-page" | grep -o '<title>[^<]*</title>' || true)
printf '%s' "$t" | grep -q '页面不存在' && ok "404 页面使用 SSG 产出的 404.html" || bad "404 内容不是定制页：$t"

d=$(curl -s --max-time 5 "http://127.0.0.1:$PORT/tools/json-formatter" | grep -c 'data-testid="input"' || true)
chk "工具页含真实预渲染 DOM" "1" "$d"

# 压缩与缓存：主 JS
JS=$(curl -s --max-time 5 "http://127.0.0.1:$PORT/" | grep -o 'assets/index-[^"]*\.js' | head -1 || true)
if [ -n "$JS" ]; then
  hd=$(curl -s -D - -o /dev/null -H 'Accept-Encoding: gzip' --max-time 5 "http://127.0.0.1:$PORT/$JS" || true)
  printf '%s' "$hd" | grep -qi 'content-encoding: gzip' && ok "JS 启用 gzip" || bad "JS 未启用 gzip"
  printf '%s' "$hd" | grep -qi 'immutable' && ok "JS 长缓存 immutable" || bad "JS 缺少 immutable 缓存头"
  printf '%s' "$hd" | grep -qi 'content-type: application/javascript' && ok "JS MIME 正确" || bad "JS MIME 错误"
else
  bad "首页未引用到 assets/index-*.js"
fi

printf '\n===== 结果：%d 通过 / %d 失败 =====\n' "$pass" "$fail"
[ "$fail" -eq 0 ] || exit 1
printf 'nginx 配置验证全部通过 ✅\n'
