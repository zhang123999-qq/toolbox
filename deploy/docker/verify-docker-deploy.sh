#!/usr/bin/env bash
# ============================================================================
# C 组：Docker 真实部署验证（目标机 root@192.168.100.4）
#
# 镜像由本机 docker save 导出后在目标机 docker load，等价于「制品传输 → 部署」。
# 验证：启动方式、运行时依赖、文件权限与属主、端口占用、容器运行状态、
#       日志落盘、HTTP 功能、异常（端口冲突）、停止与清理。
# ============================================================================
set -u

TB=/tmp/tbv
IMG_TAR=$TB/web-image.tar
IMG=toolbox-web:dev
NAME=tbv-docker-verify
CPORT=8081 # 容器内 nginx 监听端口（镜像里写死，与二进制部署默认端口一致）
# 版本号从发布源现取（镜像的 /healthz 由 deploy/binary/VERSION 在构建期注入）
VER=$(tr -d ' \t\r\n' < "$TB/dist-release/latest.txt" 2>/dev/null || true)
[ -n "$VER" ] || {
  echo "找不到 $TB/dist-release/latest.txt，请先上传 dist-release/" >&2
  exit 2
}
HPORT=8082 # 宿主机映射端口：**故意错开** 8081，好让二进制部署（默认 8081）
#            与 Docker 部署能在同一台机器上串行验证，不抢端口。
VVOL_PORT=8083 # 日志卷那个临时容器的宿主端口，再错开一位
LOGVOL=$TB/docker-nginx-logs
OUT=$TB/c-result.log
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
    printf '%s\n' "$out" | head -16
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
    printf '%s\n' "$out" | head -16
    echo
  } | tee -a "$OUT"
}

banner() { echo; echo "##### $* #####" | tee -a "$OUT"; }

# ── C-01 镜像加载 ───────────────────────────────────────
banner "C-01 镜像加载"
exec_case C-01 "docker load 导入镜像" 0 -- docker load -i "$IMG_TAR"
assert_case C-02 "镜像出现在本地镜像列表" -- sh -c "docker images --format '{{.Repository}}:{{.Tag}}' | grep -qx '$IMG'"

# ── C-03 容器启动 ───────────────────────────────────────
banner "C-03..C-06 启动方式与运行状态"
docker rm -f "$NAME" >/dev/null 2>&1 || true
docker rm -f tbv-docker-dup >/dev/null 2>&1 || true
docker rm -f tbv-docker-vol >/dev/null 2>&1 || true
# 主容器**不挂载**日志卷：镜像默认把 access.log 软链到 /dev/stdout，
# 一旦把宿主机目录挂到 /var/log/nginx，软链被真实目录取代，日志就不再走
# stdout —— docker logs 会变空。两条日志路径要分开验证（见 C-16 / C-18）。
exec_case C-03 "docker run 启动容器（$HPORT:$CPORT）" 0 -- \
  docker run -d --name "$NAME" -p "$HPORT":"$CPORT" "$IMG"
# 等健康检查
for _ in $(seq 1 30); do
  [ "$(docker inspect -f '{{.State.Health.Status}}' "$NAME" 2>/dev/null)" = "healthy" ] && break
  sleep 2
done
assert_case C-04 "容器状态为 running" -- \
  sh -c "[ \"\$(docker inspect -f '{{.State.Running}}' $NAME)\" = true ]"
assert_case C-05 "内置 HEALTHCHECK 变为 healthy" -- \
  sh -c "[ \"\$(docker inspect -f '{{.State.Health.Status}}' $NAME)\" = healthy ]"
assert_case C-06 "宿主机 $HPORT 端口监听（端口映射生效）" -- sh -c "ss -lnt | grep -q ':$HPORT '"
assert_case C-06b "容器内 nginx 实际监听 $CPORT（镜像端口已随默认端口调整）" -- \
  sh -c "docker exec $NAME ss -lnt 2>/dev/null | grep -q ':$CPORT ' || \
         docker exec $NAME netstat -lnt 2>/dev/null | grep -q ':$CPORT '"

# ── C-07..C-09 运行时依赖与权限属主 ─────────────────────
banner "C-07..C-09 运行时依赖、权限与属主"
assert_case C-07 "容器内 nginx 可执行且配置就位" -- \
  sh -c "docker exec $NAME sh -c 'command -v nginx >/dev/null && [ -s /etc/nginx/conf.d/default.conf ]'"
assert_case C-08 "静态产物目录对 other 可读可执行（403 回归）" -- \
  sh -c "docker exec $NAME sh -c 'stat -c %a /usr/share/nginx/html | grep -qE \"^(755|777)\$\" && \
         su -s /bin/sh nginx -c \"test -r /usr/share/nginx/html/index.html\"'"
assert_case C-09 "容器内 nginx worker 以非 root 运行" -- \
  sh -c "docker exec $NAME sh -c 'ps -o user=,args= | grep \"[n]ginx: worker\" | grep -qv \"^root\"'"

# ── C-10..C-15 HTTP 功能 ────────────────────────────────
banner "C-10..C-15 HTTP 核心功能"
B="http://127.0.0.1:$HPORT"
assert_case C-10 "GET / 返回 200" -- sh -c "[ \"\$(curl -s -o /dev/null -w '%{http_code}' $B/)\" = 200 ]"
assert_case C-11 "工具页 /tools/json-formatter/ 返回 200" -- \
  sh -c "[ \"\$(curl -s -o /dev/null -w '%{http_code}' $B/tools/json-formatter/)\" = 200 ]"
assert_case C-12 "/healthz 返回 200 且内容正确" -- \
  sh -c "curl -fsS $B/healthz | grep -qx 'ok v$VER'"
assert_case C-13 "未知路径返回真 404" -- \
  sh -c "[ \"\$(curl -s -o /dev/null -w '%{http_code}' $B/definitely-not-a-real-page/)\" = 404 ]"
assert_case C-14 "sitemap.xml 与 robots.txt 可访问" -- \
  sh -c "curl -fsS -o /dev/null $B/sitemap.xml && curl -fsS -o /dev/null $B/robots.txt"
assert_case C-15 "gzip 生效" -- \
  sh -c "curl -sI -H 'Accept-Encoding: gzip' $B/ | grep -qi 'content-encoding: gzip'"

# ── C-16..C-18 日志落盘 ─────────────────────────────────
banner "C-16..C-18 日志落盘"
assert_case C-16 "docker logs 取到 nginx 访问日志（stdout 路径）" -- \
  sh -c "docker logs $NAME 2>&1 | grep -q 'GET /'"
assert_case C-17 "宿主机容器日志文件存在且有内容（真实落盘位置）" -- \
  sh -c "f=\$(docker inspect -f '{{.LogPath}}' $NAME); [ -s \"\$f\" ]"
# 换一个容器验证「挂载卷 → 文件落盘」；注意此时 stdout 路径会失效，
# 所以两条路径必须用不同容器分别断言，不能指望同一个容器两者兼得。
mkdir -p "$LOGVOL"
rm -f "$LOGVOL"/*
docker run -d --name tbv-docker-vol -p "$VVOL_PORT":"$CPORT" -v "$LOGVOL":/var/log/nginx "$IMG" >/dev/null
sleep 3
curl -s -o /dev/null "http://127.0.0.1:$VVOL_PORT/"
sleep 1
assert_case C-18 "挂载卷内有 nginx 日志且写入了访问记录" -- \
  sh -c "[ -s $LOGVOL/access.log ] && grep -q 'GET /' $LOGVOL/access.log"
docker rm -f tbv-docker-vol >/dev/null 2>&1 || true

# ── C-19 异常：端口冲突 ─────────────────────────────────
banner "C-19 异常输入：端口冲突"
exec_case C-19 "复用已占用端口启动应失败并报错" any -- \
  docker run -d --name tbv-docker-dup -p "$HPORT":"$CPORT" "$IMG"
assert_case C-19b "冲突容器未处于 running（启动确实失败）" -- \
  sh -c "[ \"\$(docker inspect -f '{{.State.Running}}' tbv-docker-dup 2>/dev/null)\" != true ]"

# ── C-20..C-21 停止与清理 ───────────────────────────────
banner "C-20..C-21 停止与清理"
exec_case C-20 "docker stop 正常退出（退出码 0）" 0 -- docker stop "$NAME"
assert_case C-21 "停止后宿主机 $HPORT 端口释放" -- sh -c "! ss -lnt | grep -q ':$HPORT '"
docker rm -f "$NAME" tbv-docker-dup >/dev/null 2>&1 || true

echo
echo "================ C 组汇总 ================"
echo "PASS=$pass_n  FAIL=$fail_n"
echo "=========================================="
[ "$fail_n" -eq 0 ]
