#!/usr/bin/env bash
# ============================================================================
# B 组：二进制真实部署验证（目标机 root@192.168.100.4，端口 80）
#
# 走「发布源下载 → sha256 校验 → 解包 → 落地 → 渲染配置 → systemd 启服务」
# 完整链路。发布源用本机 http.server 托管 dist-release（等价于 Release 下载目录），
# 这样既不改动公开 Release，又真实覆盖下载与校验环节。
# ============================================================================
set -u

TB=/tmp/tbv
SRC_DIR=$TB/dist-release
SRC_PORT=8899
SRC_URL="http://127.0.0.1:$SRC_PORT"
PFX=/opt/toolbox
CTL=$PFX/current/bin/toolboxctl
PORT=80
OUT=$TB/b-result.log
: >"$OUT"

pass_n=0
fail_n=0

exec_case() {
  local id=$1 desc=$2 exp=$3
  shift 4
  local cmdstr="$*"
  local out rc
  out=$("$@" 2>&1)
  rc=$?
  local verdict
  if [ "$exp" = "any" ] || [ "$rc" = "$exp" ]; then
    verdict=PASS
    pass_n=$((pass_n + 1))
  else
    verdict=FAIL
    fail_n=$((fail_n + 1))
  fi
  {
    echo "===== CASE $id ====="
    echo "DESC    : $desc"
    echo "CMD     : $cmdstr"
    echo "EXPECT  : exit=$exp"
    echo "ACTUAL  : exit=$rc"
    echo "VERDICT : $verdict"
    echo "OUTPUT  :"
    printf '%s\n' "$out" | head -20
    echo
  } | tee -a "$OUT"
}

assert_case() {
  local id=$1 desc=$2
  shift 3
  local cmdstr="$*"
  local out rc
  out=$("$@" 2>&1)
  rc=$?
  local verdict
  if [ "$rc" -eq 0 ]; then verdict=PASS; pass_n=$((pass_n + 1)); else verdict=FAIL; fail_n=$((fail_n + 1)); fi
  {
    echo "===== CASE $id ====="
    echo "DESC    : $desc"
    echo "CMD     : $cmdstr"
    echo "EXPECT  : 断言成立（exit=0）"
    echo "ACTUAL  : exit=$rc"
    echo "VERDICT : $verdict"
    echo "OUTPUT  :"
    printf '%s\n' "$out" | head -20
    echo
  } | tee -a "$OUT"
}

banner() { echo; echo "##### $* #####" | tee -a "$OUT"; }

# ── 启动本地发布源 ──────────────────────────────────────
banner "B-00 准备本地发布源"

# 幂等：已装过就先卸干净，保证本脚本可反复执行（回归验证要重跑）。
# 注意 uninstall 读的是全局配置 /etc/toolbox/toolbox.conf 里的 PREFIX：
# 若之前用 --prefix 装过别的实例，卸载的会是那个实例而不是 /opt/toolbox，
# 所以这里两种入口都试一遍，最后再把目录挪走兜底。
if [ -d "$PFX" ]; then
  bash "$PFX/current/bin/toolboxctl" uninstall --purge >/dev/null 2>&1 || true
  bash "$TB/toolboxctl" uninstall --purge --prefix "$PFX" >/dev/null 2>&1 || true
fi
rm -rf /opt/toolbox.bak.regression
[ -d "$PFX" ] && mv "$PFX" /opt/toolbox.bak.regression
rm -f /etc/toolbox/toolbox.conf

(cd "$SRC_DIR" && nohup python3 -m http.server "$SRC_PORT" --bind 127.0.0.1 \
  >"$TB/httpd.log" 2>&1 & echo $! >"$TB/httpd.pid")
sleep 2
assert_case B-00 "发布源可访问且含 latest.txt 与校验文件" -- \
  sh -c "curl -fsS $SRC_URL/latest.txt >/dev/null && curl -fsSI $SRC_URL/toolbox-0.0.1-linux-amd64.tar.gz.sha256 >/dev/null"

# ── B-01 dry-run ────────────────────────────────────────
banner "B-01 安装前 dry-run"
exec_case B-01 "install.sh --dry-run 只打印不落地" 0 -- \
  bash "$TB/install.sh" --source "$SRC_URL" --port "$PORT" --prefix "$PFX" --dry-run

# ── B-02 真实安装 ───────────────────────────────────────
banner "B-02 真实部署（下载→校验→落地→启服务）"
exec_case B-02 "install.sh --service --port 80 完整安装" 0 -- \
  bash "$TB/install.sh" --source "$SRC_URL" --port "$PORT" --prefix "$PFX" --service

# ── B-03..B-07 文件布局、权限与属主 ──────────────────────
banner "B-03..B-07 文件布局、权限与属主"
assert_case B-03 "目录结构完整（releases/current/logs/shared/run）" -- \
  sh -c "for d in releases current logs shared run; do [ -e $PFX/\$d ] || exit 1; done"
assert_case B-04 "current 指向存在的 release 且含 app/ 与 bin/" -- \
  sh -c "[ -d $PFX/current/app ] && [ -x $PFX/current/bin/toolboxctl ]"
assert_case B-05 "解包后无 0700 目录（回归全站 403）" -- \
  sh -c "! find $PFX/releases -type d -perm 0700 | grep -q ."
assert_case B-06 "运行用户 toolbox 存在，且能穿越到 app 读取首文件（403 回归）" -- \
  sh -c "id toolbox >/dev/null && f=\$(find $PFX/current/app -name 'index.html' | head -1) && \
         su -s /bin/sh toolbox -c \"test -r \\\"\$f\\\"\""
assert_case B-07 "日志目录属主为运行用户（保证 worker 可写）" -- \
  sh -c "stat -c '%U' $PFX/logs | grep -qx toolbox"

# ── B-08..B-11 进程、端口、服务单元 ─────────────────────
banner "B-08..B-11 进程、端口与服务单元"
assert_case B-08 "systemd 单元 active 且 enabled" -- \
  sh -c "[ \"\$(systemctl is-active toolbox)\" = active ] && [ \"\$(systemctl is-enabled toolbox)\" = enabled ]"
assert_case B-09 "nginx master 为 root、worker 为 toolbox" -- \
  sh -c "ps -o user=,cmd= -C nginx | grep -q '^root .*master process' && \
         ps -o user=,cmd= -C nginx | grep -q '^toolbox .*worker process'"
assert_case B-10 "端口 80 处于监听" -- sh -c "ss -lnt | grep -q ':80 '"
assert_case B-11 "运行时依赖：nginx 可执行文件与自带 MIME 表均就位" -- \
  sh -c "command -v nginx >/dev/null && [ -s $PFX/current/conf/mime.types ]"

# ── B-12..B-17 HTTP 功能 ────────────────────────────────
banner "B-12..B-17 HTTP 核心功能"
assert_case B-12 "GET / 返回 200" -- sh -c "[ \"\$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:$PORT/)\" = 200 ]"
assert_case B-13 "工具页 /tools/json-formatter/ 返回 200" -- \
  sh -c "[ \"\$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:$PORT/tools/json-formatter/)\" = 200 ]"
assert_case B-14 "/healthz 返回 200 且内容为 ok v0.0.1" -- \
  sh -c "curl -fsS http://127.0.0.1:$PORT/healthz | grep -qx 'ok v0.0.1'"
assert_case B-15 "未知路径返回真 404（非软 404）" -- \
  sh -c "[ \"\$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:$PORT/definitely-not-a-real-page/)\" = 404 ]"
assert_case B-16 "sitemap.xml 与 robots.txt 可访问" -- \
  sh -c "curl -fsS -o /dev/null http://127.0.0.1:$PORT/sitemap.xml && curl -fsS -o /dev/null http://127.0.0.1:$PORT/robots.txt"
assert_case B-17 "gzip 生效（带 Accept-Encoding 返回 gzip）" -- \
  sh -c "curl -s -H 'Accept-Encoding: gzip' -o /dev/null -w '%{content_type}' \
         http://127.0.0.1:$PORT/ | grep -qi gzip || \
         curl -sI -H 'Accept-Encoding: gzip' http://127.0.0.1:$PORT/ | grep -qi 'content-encoding: gzip'"

# ── B-18..B-20 日志落盘 ─────────────────────────────────
banner "B-18..B-20 日志落盘"
assert_case B-18 "access.log 已写入内容" -- sh -c "[ -s $PFX/logs/access.log ]"
assert_case B-19 "error.log 存在" -- sh -c "[ -f $PFX/logs/error.log ]"
assert_case B-20 "logs 子命令可读取日志" -- bash "$CTL" logs -n 3

# ── B-21..B-24 运维子命令 ───────────────────────────────
banner "B-21..B-24 运维子命令"
exec_case B-21 "status 正常输出" 0 -- bash "$CTL" status
exec_case B-22 "config 打印生效配置" 0 -- bash "$CTL" config
exec_case B-23 "list 列出版本" 0 -- bash "$CTL" list
exec_case B-24 "doctor 自检通过（服务已运行）" 0 -- bash "$CTL" doctor

# ── B-25..B-28 生命周期 ─────────────────────────────────
banner "B-25..B-28 服务生命周期"
exec_case B-25 "restart 后健康检查通过" 0 -- bash "$CTL" restart
exec_case B-26 "reload 后仍健康" 0 -- bash "$CTL" reload
exec_case B-27 "stop 后端口释放" 0 -- \
  sh -c "bash $CTL stop >/dev/null 2>&1; sleep 1; ! ss -lnt | grep -q ':80 '"
exec_case B-28 "start 后恢复服务" 0 -- bash "$CTL" start

# ── B-29..B-31 配置文件与入口 ───────────────────────────
banner "B-29..B-31 配置文件与命令入口"
assert_case B-29 "全局配置文件存在且记录了 prefix/port" -- \
  sh -c "grep -q \"PREFIX='$PFX'\" /etc/toolbox/toolbox.conf && grep -q \"PORT='$PORT'\" /etc/toolbox/toolbox.conf"
assert_case B-30 "命令入口软链可用（toolbox / toolboxctl）" -- \
  sh -c "command -v toolbox >/dev/null && toolbox version >/dev/null"
assert_case B-31 "渲染出的 nginx 配置通过语法校验" -- nginx -t -c "$PFX/shared/nginx.conf"

# ── 收尾：停掉发布源 ────────────────────────────────────
if [ -f "$TB/httpd.pid" ]; then kill "$(cat "$TB/httpd.pid")" 2>/dev/null || true; fi

echo
echo "================ B 组汇总 ================"
echo "PASS=$pass_n  FAIL=$fail_n"
echo "=========================================="
[ "$fail_n" -eq 0 ]
