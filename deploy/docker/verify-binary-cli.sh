#!/usr/bin/env bash
# ============================================================================
# D 组：二进制部署的「运维命令行」全量测试
#
# 覆盖 toolboxctl 的全部子命令（help / version / status / config / list /
# doctor / health / logs / backup / render / install / uninstall /
# start / stop / restart / reload / check-update / upgrade / rollback）
# 与 install.sh 的常规功能与主要使用场景，并显式覆盖**临时代理**场景：
# 升级/检测走代理（--proxy 与 http_proxy 环境变量两种入口）。
#
# 与 A/B/C 组的分工：
#   A = CLI 的参数与非法输入行为（不需要已安装实例）
#   B = 二进制真实部署链路（下载→校验→落地→systemd→HTTP）
#   C = Docker 部署
#   D = 部署完成之后的**日常运维命令**（本组），含升级/回滚闭环与代理
#
# 幂等：可反复执行。结束时保证实例仍安装且运行在原始版本上。
# ============================================================================
set -u

TB=/tmp/tbv
SRC_DIR=$TB/dist-release
SRC_PORT=8899
SRC_URL="http://127.0.0.1:$SRC_PORT"
SRC_NEWER_DIR=$TB/src-newer
SRC_NEWER_URL="http://127.0.0.1:8900"
SRC_OLDER_DIR=$TB/src-older
SRC_OLDER_URL="http://127.0.0.1:8901"

PFX=/opt/toolbox
CTL=$PFX/current/bin/toolboxctl
PORT=8081
UNIT=toolbox.service

# 临时代理：仅下载环节需要（目标机直连 GitHub 超时）
PROXY=${PROXY:-http://192.168.200.4:10810}
GH_BASE=${GH_BASE:-https://github.com/zhang123999-qq/toolbox/releases/latest/download}

# 真实升级环节用的目标版本（本地源里的伪造包，不污染公开 Release）
NEW_VER=${NEW_VER:-0.0.2-verify}
OLD_VER=${OLD_VER:-0.0.0-alpha}

VER=$(tr -d ' \t\r\n' <"$SRC_DIR/latest.txt" 2>/dev/null || true)
[ -n "$VER" ] || {
  echo "找不到 $SRC_DIR/latest.txt，请先上传 dist-release/" >&2
  exit 2
}

OUT=$TB/d-result.log
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
  if [ "$rc" -eq 0 ]; then
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
    echo "EXPECT  : 断言成立（exit=0）"
    echo "ACTUAL  : exit=$rc"
    echo "VERDICT : $verdict"
    echo "OUTPUT  :"
    printf '%s\n' "$out" | head -20
    echo
  } | tee -a "$OUT"
}

banner() { echo; echo "##### $* #####" | tee -a "$OUT"; }

# healthz 期望值
health_of() { # health_of [端口]
  curl -s -m 5 --noproxy '*' "http://127.0.0.1:${1:-$PORT}/healthz" 2>/dev/null || true
}

svc_active_ts() { systemctl show "$UNIT" -p ActiveEnterTimestamp --value 2>/dev/null || true; }

releases_list() { ls -1 "$PFX/releases" 2>/dev/null | tr '\n' ' '; }

# ── 造一个「变体版本」的发布源：拷现有包、改 VERSION、重算校验和重新打包 ──
# 用来在**不改动公开 Release** 的前提下真实走一遍升级 / 回滚链路。
make_variant() { # make_variant <out-dir> <version>
  local out=$1 v=$2
  local w
  w=$(mktemp -d "$TB/variant.XXXXXX")
  tar -xzf "$SRC_DIR/toolbox-${VER}-linux-amd64.tar.gz" -C "$w" || return 1
  printf '%s\n' "$v" >"$w/VERSION"
  (
    cd "$w" && find . -type f ! -name checksums.txt | sed 's|^\./||' | LC_ALL=C sort | xargs sha256sum
  ) >"$w/checksums.txt"
  # 与 build-bundle.sh 同样的权限修法：staging 根若是 0700，tar 会把该模式记进归档，
  # 解包后 nginx worker 无法穿越 → 全站 403。造变体包时也要照做。
  chmod 0755 "$w"
  find "$w" -type d -exec chmod 0755 {} +
  rm -rf "$out"
  mkdir -p "$out"
  tar -czf "$out/toolbox-${v}-linux-amd64.tar.gz" -C "$w" .
  (cd "$out" && sha256sum "toolbox-${v}-linux-amd64.tar.gz") >"$out/toolbox-${v}-linux-amd64.tar.gz.sha256"
  printf '%s\n' "$v" >"$out/latest.txt"
  rm -rf "$w"
}

# ============================================================================
banner "D-00 准备本地发布源与版本变体"

# 幂等：确保实例已装（B 组跑过就直接复用）
if [ ! -x "$CTL" ]; then
  echo "未发现已安装实例（$CTL），请先跑 verify-binary-deploy.sh" >&2
  exit 2
fi

# 主发布源
if ! curl -fsS -m 3 "$SRC_URL/latest.txt" >/dev/null 2>&1; then
  (cd "$SRC_DIR" && nohup python3 -m http.server "$SRC_PORT" --bind 127.0.0.1 \
    >"$TB/httpd-d.log" 2>&1 & echo $! >"$TB/httpd-d.pid")
  sleep 2
fi

# 变体源（更高 / 更低各一个）
make_variant "$SRC_NEWER_DIR" "$NEW_VER" && make_variant "$SRC_OLDER_DIR" "$OLD_VER"
for p in 8900 8901; do
  d=$SRC_NEWER_DIR
  [ "$p" = "8901" ] && d=$SRC_OLDER_DIR
  if ! curl -fsS -m 3 "http://127.0.0.1:$p/latest.txt" >/dev/null 2>&1; then
    (cd "$d" && nohup python3 -m http.server "$p" --bind 127.0.0.1 \
      >"$TB/httpd-$p.log" 2>&1 & echo $! >"$TB/httpd-$p.pid")
  fi
done
sleep 2

assert_case D-00 "本地发布源可用（主源 + 更高版变体源 + 更低版变体源）" -- \
  sh -c "curl -fsS $SRC_URL/latest.txt >/dev/null &&
         curl -fsS $SRC_NEWER_URL/latest.txt >/dev/null &&
         curl -fsS $SRC_OLDER_URL/latest.txt >/dev/null"
assert_case D-00b "变体源内含整包与 sha256 伴生文件" -- \
  sh -c "curl -fsSI $SRC_NEWER_URL/toolbox-${NEW_VER}-linux-amd64.tar.gz >/dev/null &&
         curl -fsSI $SRC_NEWER_URL/toolbox-${NEW_VER}-linux-amd64.tar.gz.sha256 >/dev/null"

# Release 资产刷新后，`releases/latest/download` 会有一段 CDN 缓存期：这期间
# 一键安装下载到的是**旧包**（也就带着旧 CLI），D-30/D-30d 会以假阴性失败——
# 本轮实测就是这样（刚 clobber 完就跑，拿到 1296224 字节的旧包；几分钟后才追上）。
# 所以代理段之前先做一次「资产一致性」预热：最多等 90s，等 CDN 与本地制品对齐。
release_matches_local() {
  local l r
  l=$(awk '{print $1}' "$SRC_DIR/toolbox-${VER}-linux-amd64.tar.gz.sha256" 2>/dev/null)
  r=$(curl -fsSL -x "$PROXY" --max-time 30 \
    "$GH_BASE/toolbox-${VER}-linux-amd64.tar.gz.sha256" 2>/dev/null | awk '{print $1}')
  [ -n "$r" ] && [ "$l" = "$r" ]
}
i=0
while [ "$i" -lt 18 ] && ! release_matches_local; do
  i=$((i + 1))
  sleep 5
done
assert_case D-00c "Release 资产与本地构建同源（含 CDN 缓存预热等待）" -- release_matches_local

# ── D-01..D-04 帮助与版本 ────────────────────────────────
banner "D-01..D-04 帮助与版本"
assert_case D-01 "help 列出全部子命令与通用参数说明" -- \
  sh -c "bash $CTL help 2>&1 | grep -q 'install' && bash $CTL help 2>&1 | grep -q 'check-update' &&
         bash $CTL help 2>&1 | grep -q 'rollback' && bash $CTL help 2>&1 | grep -q -- '--prefix'"
assert_case D-02 "-h / --help 与 help 等价，均以 0 退出" -- \
  sh -c "bash $CTL -h  >/dev/null 2>&1 && bash $CTL --help >/dev/null 2>&1"
assert_case D-03 "version 同时给出 CLI 版本与已装版本" -- \
  sh -c "bash $CTL version 2>&1 | grep -q \"CLI 版本\" && bash $CTL version 2>&1 | grep -q \"已装版本\" &&
         bash $CTL version 2>&1 | grep -q \"$VER\""
exec_case D-04 "未知子命令以 2 退出并给出用法提示" 2 -- bash "$CTL" definitely-not-a-command

# ── D-05..D-12 只读信息类命令 ────────────────────────────
banner "D-05..D-12 只读信息类命令"
assert_case D-05 "status 给出服务状态/已装版本/端口，且版本一致" -- \
  sh -c "bash $CTL status 2>&1 | grep -q '服务状态' &&
         bash $CTL status 2>&1 | grep -q \"已装版本 : $VER\" &&
         bash $CTL status 2>&1 | grep -q \"监听端口 : $PORT\" &&
         bash $CTL status 2>&1 | grep -q '版本一致 : ✓'"
assert_case D-06 "config 输出全局配置与渲染后的 nginx 主配置" -- \
  sh -c "bash $CTL config 2>&1 | grep -q \"PREFIX='$PFX'\" &&
         bash $CTL config 2>&1 | grep -q 'listen' &&
         bash $CTL config 2>&1 | grep -q \"$PORT\""
assert_case D-07 "list 标记当前版本并用 * 标注" -- \
  sh -c "bash $CTL list 2>&1 | grep -q \"\\* $VER\""
assert_case D-08 "doctor 环境自检通过（exit 0）" -- bash "$CTL" doctor
assert_case D-09 "health 探测通过并报告运行版本" -- \
  sh -c "bash $CTL health 2>&1 | grep -q \"运行版本 v$VER\""
assert_case D-10 "logs 输出 nginx 访问/错误日志（服务日志之外的落盘位置）" -- \
  sh -c "bash $CTL logs 2>&1 | grep -q 'nginx'"
assert_case D-11 "logs -n N 生效（按行数取日志）" -- \
  sh -c "bash $CTL logs -n 5 2>&1 | grep -q '最近 5 行'"
exec_case D-12 "logs -n 传非数字应被拒绝（不能把错误值丢给 tail/journalctl）" 2 -- \
  bash "$CTL" logs -n abc

# ── D-13..D-16 运维命令 ─────────────────────────────────
banner "D-13..D-16 备份 / 渲染 / 参数校验"
rm -rf "$TB/backup-d"
assert_case D-13 "backup --output 生成可解开的备份归档（含 manifest 与渲染配置）" -- \
  sh -c "bash $CTL backup --output $TB/backup-d >/dev/null 2>&1 &&
         a=\$(ls -1 $TB/backup-d/toolbox-backup-*.tar.gz | head -1) &&
         tar -tzf \"\$a\" | grep -q 'toolbox/manifest.txt' &&
         tar -tzf \"\$a\" | grep -q 'toolbox/shared/nginx.conf' &&
         tar -tzf \"\$a\" | grep -q 'toolbox/toolbox.conf'"
assert_case D-14 "render 独立渲染配置并通过 nginx -t 语法校验" -- \
  sh -c "rm -rf $TB/render-d && bash $CTL render --tpl-dir $PFX/current/conf --out $TB/render-d >/dev/null &&
         nginx -t -c $TB/render-d/nginx.conf"
exec_case D-15 "--prefix 传相对路径应被拒绝（避免作用到意外目录）" 2 -- \
  bash "$CTL" status --prefix relative/path
exec_case D-16 "只读子命令传未知参数应被拒绝（不能静默忽略）" 2 -- \
  bash "$CTL" status --definitely-bogus

# ── D-17..D-20 服务控制 ─────────────────────────────────
banner "D-17..D-20 服务控制（reload / restart / stop / start）"
assert_case D-17 "reload 后服务仍 active（配置热重载）" -- \
  sh -c "bash $CTL reload >/dev/null 2>&1 && sleep 2 &&
         [ \"\$(systemctl is-active $UNIT)\" = active ] &&
         [ \"\$(curl -s -m 5 --noproxy '*' http://127.0.0.1:$PORT/healthz)\" = 'ok v$VER' ]"
assert_case D-18 "restart 后服务 active 且运行版本正确" -- \
  sh -c "bash $CTL restart >/dev/null 2>&1 && [ \"\$(systemctl is-active $UNIT)\" = active ] &&
         [ \"\$(curl -s -m 5 --noproxy '*' http://127.0.0.1:$PORT/healthz)\" = 'ok v$VER' ]"
assert_case D-19 "stop 后服务 inactive 且端口释放" -- \
  sh -c "bash $CTL stop >/dev/null 2>&1; sleep 1;
         [ \"\$(systemctl is-active $UNIT)\" != active ] && ! ss -lnt | grep -q ':$PORT '"
assert_case D-20 "start 后服务恢复 active 且健康" -- \
  sh -c "bash $CTL start >/dev/null 2>&1 && [ \"\$(systemctl is-active $UNIT)\" = active ] &&
         [ \"\$(curl -s -m 5 --noproxy '*' http://127.0.0.1:$PORT/healthz)\" = 'ok v$VER' ]"

# ── D-21..D-25 升级检测与「无新版本即跳过」 ──────────────
banner "D-21..D-25 升级检测与跳过行为"
assert_case D-21 "check-update 对同版本源报告已是最新" -- \
  sh -c "bash $CTL check-update --source $SRC_URL 2>&1 | grep -q '已是最新'"
assert_case D-22 "check-update 经代理访问 GitHub 默认发布源可用" -- \
  sh -c "http_proxy=$PROXY https_proxy=$PROXY bash $CTL check-update --source $GH_BASE 2>&1 | grep -qE '当前版本|源内最新版本'"

# 跳过行为的核心断言：不仅看输出，还要求**服务没被重启、releases 没变**。
ts_before=$(svc_active_ts)
rel_before=$(releases_list)
assert_case D-23 "upgrade（源版本=当前版本）跳过本次更新且不重启服务" -- \
  sh -c "bash $CTL upgrade --source $SRC_URL 2>&1 | grep -qE '跳过|已是最新' &&
         [ \"\$(systemctl is-active $UNIT)\" = active ]"
assert_case D-23b "跳过时未产生版本切换（ActiveEnterTimestamp 与 releases 均未变）" -- \
  sh -c "[ \"$(svc_active_ts)\" = \"$ts_before\" ] && [ \"$(releases_list)\" = \"$rel_before\" ]"

# 回退源：源内版本低于当前。**必须跳过**，不能静默降级。
assert_case D-24 "upgrade（源版本低于当前）跳过本次更新，不静默降级" -- \
  sh -c "bash $CTL upgrade --source $SRC_OLDER_URL 2>&1 | grep -qE '跳过' &&
         [ \"\$(bash $CTL version | sed -n 's/.*已装版本 *: *//p')\" = '$VER' ]"
assert_case D-24b "回退源未被落地为 release 目录" -- \
  sh -c "! ls -1 $PFX/releases | grep -qx '$OLD_VER'"
assert_case D-25 "跳过时给出 rollback / --force 的可行指引" -- \
  sh -c "bash $CTL upgrade --source $SRC_OLDER_URL 2>&1 | grep -qE 'rollback|--force'"

# ── D-26..D-29 真实升级与回滚闭环（本地源变体） ──────────
banner "D-26..D-29 真实升级 → 回滚闭环"
assert_case D-26 "check-update 发现更高版本并给出升级命令" -- \
  sh -c "bash $CTL check-update --source $SRC_NEWER_URL 2>&1 | grep -q \"$NEW_VER\" &&
         bash $CTL check-update --source $SRC_NEWER_URL 2>&1 | grep -q '有新版本可升级'"
exec_case D-27 "upgrade --source 更高版本源：升级成功" 0 -- \
  bash "$CTL" upgrade --source "$SRC_NEWER_URL"
assert_case D-27b "升级后 healthz 报告新版本" -- \
  sh -c "[ \"\$(curl -s -m 5 --noproxy '*' http://127.0.0.1:$PORT/healthz)\" = 'ok v$NEW_VER' ]"
assert_case D-28 "升级后 status 显示已装版本与运行版本一致（新版本）" -- \
  sh -c "bash $CTL status 2>&1 | grep -q \"已装版本 : $NEW_VER\" &&
         bash $CTL status 2>&1 | grep -q '版本一致 : ✓'"
exec_case D-29 "rollback 回到原版本" 0 -- bash "$CTL" rollback --to "$VER"
assert_case D-29b "回滚后 healthz 恢复到原版本" -- \
  sh -c "[ \"\$(curl -s -m 5 --noproxy '*' http://127.0.0.1:$PORT/healthz)\" = 'ok v$VER' ]"

# ── D-30..D-33 临时代理场景 ─────────────────────────────
banner "D-30..D-33 临时代理场景"
exec_case D-30 "install.sh 经代理从 GitHub 一键安装（--proxy 全链路）" 0 -- \
  bash "$TB/install.sh" --source "$GH_BASE" --proxy "$PROXY" --port "$PORT" --prefix "$PFX" --service
assert_case D-30b "经代理安装后服务 active 且版本正确" -- \
  sh -c "[ \"\$(systemctl is-active $UNIT)\" = active ] &&
         [ \"\$(curl -s -m 5 --noproxy '*' http://127.0.0.1:$PORT/healthz)\" = 'ok v$VER' ]"
# 一键脚本重跑是很常见的场景（修配置、重建实例）。过去 install 对已存在的
# 版本直接 die，`curl | bash` 重跑变成硬失败；现在应幂等复用。
assert_case D-30c "install 对已装版本幂等复用（一键脚本可重复执行）" -- \
  sh -c "bash $CTL install --from $SRC_DIR/toolbox-${VER}-linux-amd64.tar.gz --prefix $PFX --port $PORT 2>&1 |
           grep -q '复用已有 release'"
# 一键安装执行的是**包内自带的** toolboxctl，所以 Release 资产一旦落后于仓库，
# 线上装到的就是旧 CLI（本轮就踩到：包内还是「版本已存在即 die」的旧逻辑，
# 导致 D-30 稳定失败）。这里直接比对整包 sha256，把资产漂移卡在测试里。
assert_case D-30d "Release 资产与本地构建同源（防资产漂移）" -- \
  sh -c "l=\$(awk '{print \$1}' $SRC_DIR/toolbox-${VER}-linux-amd64.tar.gz.sha256);
         r=\$(curl -fsSL -x $PROXY --max-time 60 $GH_BASE/toolbox-${VER}-linux-amd64.tar.gz.sha256 2>/dev/null | awk '{print \$1}');
         [ -n \"\$r\" ] && [ \"\$l\" = \"\$r\" ]"
assert_case D-31 "代理环境变量存在时，本地健康探测仍绕开代理（回归）" -- \
  sh -c "http_proxy=$PROXY https_proxy=$PROXY bash $CTL health 2>&1 | grep -q \"运行版本 v$VER\""
assert_case D-32 "代理环境变量存在时 check-update 走代理可用" -- \
  sh -c "http_proxy=$PROXY https_proxy=$PROXY bash $CTL check-update 2>&1 | grep -qE '当前版本|源内最新版本'"
# 回归：resolve_update_source 是 `$(...)` 命令替换调用（子 shell），
# 若靠它给 SOURCE_KIND 赋值，打印出的「（url）」会恒为空括号。
assert_case D-32b "check-update 打印的升级源类型非空（子 shell 赋值回归）" -- \
  sh -c "bash $CTL check-update --source $SRC_URL 2>&1 | grep -qE '（(url|dir)）'"
exec_case D-33 "升级源不可达时应明确报错而非静默成功" 1 -- \
  bash "$CTL" check-update --source http://127.0.0.1:9/no-such-source

# ── D-34..D-36 异常与最终状态 ───────────────────────────
banner "D-34..D-36 权限 / 非法端口 / 最终状态"
exec_case D-34 "非 root 执行 restart 应被拒绝" 1 -- \
  su -s /bin/sh nobody -c "bash $CTL restart"
exec_case D-35 "install --port 越界应被拒绝（1-65535）" 1 -- \
  bash "$CTL" install --from "$SRC_DIR/toolbox-${VER}-linux-amd64.tar.gz" \
  --prefix "$PFX" --port 99999

final_health=$(health_of)
assert_case D-36 "收尾状态：服务 active + 版本正确 + 旧默认端口 80 未被占用" -- \
  sh -c "[ \"\$(systemctl is-active $UNIT)\" = active ] &&
         [ '$final_health' = 'ok v$VER' ] && ! ss -lnt | grep -q ':80 '"

# ── 收尾：停掉本次起的发布源 ────────────────────────────
for f in "$TB/httpd-d.pid" "$TB/httpd-8900.pid" "$TB/httpd-8901.pid"; do
  [ -f "$f" ] && kill "$(cat "$f")" 2>/dev/null
done

echo
echo "================ D 组汇总 ================"
echo "PASS=$pass_n  FAIL=$fail_n"
echo "=========================================="
[ "$fail_n" -eq 0 ]
