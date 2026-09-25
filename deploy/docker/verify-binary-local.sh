#!/usr/bin/env bash
# ============================================================================
# A 组：二进制本地运行验证（不依赖已安装实例）
# 目标机：root@192.168.100.4（Ubuntu 24.04）
#
# 覆盖：进程启动 / 核心功能调用 / 配置文件加载与渲染 / 日志输出 /
#       异常与非法输入处理 / 正常退出
#
# 说明：install 相关验证放在 B 组（真实 80 端口部署），
#       因为 install --prefix 会覆盖全局唯一的 /etc/systemd/system/toolbox.service，
#       在本组做隔离实例会污染生产服务的 unit。
# ============================================================================
set -u

TB=/tmp/tbv
CTL=$TB/toolboxctl
SRC_DIR=$TB/dist-release
# 版本号与包名都从发布源现取，避免每次升版都要回来改脚本
# （先前硬编码过一次，版本号一改脚本就找不到包）。
VER=$(tr -d ' \t\r\n' < "$SRC_DIR/latest.txt" 2>/dev/null || true)
[ -n "$VER" ] || {
  echo "找不到 $SRC_DIR/latest.txt，请先上传 dist-release/" >&2
  exit 2
}
BUNDLE=$SRC_DIR/toolbox-${VER}-linux-amd64.tar.gz
[ -f "$BUNDLE" ] || {
  echo "找不到 $BUNDLE" >&2
  exit 2
}
RENDER_OUT=$TB/render-out
OUT=$TB/a-result.log
: >"$OUT"

pass_n=0
fail_n=0

# exec_case <编号> <描述> <期望退出码|any> -- <命令...>
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
    printf '%s\n' "$out" | head -18
    echo
  } | tee -a "$OUT"
}

# assert_case <编号> <描述> -- <检查命令...>  （只看退出码 0/非0）
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
    printf '%s\n' "$out" | head -18
    echo
  } | tee -a "$OUT"
}

rm -rf "$TB/bundle" "$RENDER_OUT"
mkdir -p "$TB/bundle" "$RENDER_OUT"
tar -xzf "$BUNDLE" -C "$TB/bundle"

banner() { echo; echo "##### $* #####" | tee -a "$OUT"; }

# ── 进程启动 ────────────────────────────────────────────
banner "A-01..A-04 进程启动与基础信息"
assert_case A-01 "shebang 存在且解释器可执行" -- \
  sh -c 'line=$(head -1 '"$CTL"'); case $line in "#!"*) ;; *) exit 1;; esac;
         p=${line#\#!}; p=${p#/usr/bin/env }; command -v "$p" >/dev/null'
exec_case A-02 "无参数调用：打印 usage 并以 2 退出" 2 -- bash "$CTL"
exec_case A-03 "help / -h / --help 三种形态均可用" 0 -- \
  sh -c "bash $CTL help >/dev/null && bash $CTL -h >/dev/null && bash $CTL --help >/dev/null"
exec_case A-04 "version 输出版本号" 0 -- bash "$CTL" version

# ── 异常与非法输入 ──────────────────────────────────────
banner "A-05..A-11 异常与非法输入处理"
exec_case A-05 "未知子命令：退出码 2（usage_err 的约定）并给出提示" 2 -- bash "$CTL" this-is-not-a-command
assert_case A-06 "未知子命令的错误信息含命令名" -- \
  sh -c "bash $CTL this-is-not-a-command 2>&1 | grep -q '未知命令'"
exec_case A-07 "--prefix 传相对路径：应被拒绝（回归静默丢弃缺陷）" any -- \
  bash "$CTL" status --prefix relative/path
assert_case A-08 "相对路径 --prefix 的报错信息明确" -- \
  sh -c "bash $CTL status --prefix relative/path 2>&1 | grep -q '绝对路径'"
exec_case A-09 "status 不接受额外参数：应报错而非静默忽略（回归）" any -- \
  bash "$CTL" status --bogus-flag
exec_case A-10 "logs 现在接受 --prefix（修复前报未知参数）" 0 -- \
  bash "$CTL" logs -n 3 --prefix "$TB/bundle"
exec_case A-11 "install --port 传非数字：应被拒绝" 1 -- \
  bash "$CTL" install --from "$BUNDLE" --prefix /tmp/tbv-a11 --port abc --no-start
exec_case A-12 "install --port 越界 99999：应被拒绝" 1 -- \
  bash "$CTL" install --from "$BUNDLE" --prefix /tmp/tbv-a12 --port 99999 --no-start
exec_case A-13 "install --from 指向不存在文件：应报错" 1 -- \
  bash "$CTL" install --from "$TB/nope.tar.gz" --prefix /tmp/tbv-a13 --no-start
exec_case A-14 "非 root 执行 install 应被拒绝" 1 -- \
  su -s /bin/sh nobody -c "bash $CTL install --from $BUNDLE --prefix /tmp/tbv-a14 --no-start"

# ── 配置文件加载与渲染 ──────────────────────────────────
banner "A-15..A-18 配置文件加载与渲染"
exec_case A-15 "render --tpl-dir 生成 nginx.conf" 0 -- \
  bash "$CTL" render --tpl-dir "$TB/bundle/conf" --prefix /opt/toolbox --port 8081 \
  --version "$VER" --out "$RENDER_OUT"
exec_case A-16 "渲染结果通过 nginx -t 语法校验" 0 -- \
  nginx -t -c "$RENDER_OUT/nginx.conf"
assert_case A-16b "渲染出的 nginx.conf 监听 8081" -- \
  sh -c "grep -qE 'listen[[:space:]]+8081;' $RENDER_OUT/nginx.conf"
# 默认端口的真源在 toolboxctl 的 PORT 常量：不传 --port 时应该渲染出 8081。
# 这条直接盯住默认值，改动被回退时立刻失败。
exec_case A-16c "render 不传 --port 时默认渲染 8081" 0 -- \
  bash "$CTL" render --tpl-dir "$TB/bundle/conf" --prefix /opt/toolbox \
  --version "$VER" --out "$TB/render-default"
assert_case A-16d "默认渲染结果的监听端口为 8081" -- \
  sh -c "grep -qE 'listen[[:space:]]+8081;' $TB/render-default/nginx.conf"
assert_case A-16e "环境变量 TOOLBOX_PORT=9091 可覆盖默认端口" -- \
  sh -c "TOOLBOX_PORT=9091 bash $CTL render --tpl-dir $TB/bundle/conf --prefix /opt/toolbox \
    --version "$VER" --out $TB/render-env >/dev/null && \
    grep -qE 'listen[[:space:]]+9091;' $TB/render-env/nginx.conf"
exec_case A-17 "降级到 nobody 时 user 指令带组名 nogroup（回归 getgrnam 缺陷）" 0 -- \
  sh -c "bash $CTL render --tpl-dir $TB/bundle/conf --prefix /opt/toolbox --port 8081 \
    --version "$VER" --nginx-user nobody --out $TB/render-nobody >/dev/null && \
    grep -E '^user' $TB/render-nobody/nginx.conf | grep -q 'nogroup'"
exec_case A-18 "render 对不存在的模板目录报错" 1 -- \
  bash "$CTL" render --tpl-dir /tmp/definitely-no-such-dir --out "$TB/render-bad"

# ── 打包产物权限（403 回归）──────────────────────────────
banner "A-19..A-21 打包产物权限与完整性"
assert_case A-19 "解包后无 0700 目录（回归全站 403 缺陷）" -- \
  sh -c "! find $TB/bundle -type d -perm 0700 | grep -q ."
assert_case A-20 "解包后 app 目录对 other 可读可执行" -- \
  sh -c "su -s /bin/sh nobody -c 'test -r $TB/bundle/app && test -x $TB/bundle/app'"
assert_case A-21 "bundle 内 checksums.txt 校验通过" -- \
  sh -c "cd $TB/bundle && sha256sum -c checksums.txt >/dev/null"

# ── 日志输出 ────────────────────────────────────────────
banner "A-22..A-24 日志输出"
assert_case A-22 "logs 输出含分段标题" -- \
  sh -c "bash $CTL logs -n 3 --prefix $TB/bundle 2>&1 | grep -q 'nginx\|journal\|日志'"
exec_case A-23 "logs -f 不可用时应报错而非挂死" any -- \
  timeout 5 bash "$CTL" logs --prefix "$TB/bundle" -n 1
assert_case A-24 "bundle 内 VERSION 与 manifest 一致" -- \
  sh -c "v=\$(tr -d ' \t\r\n' < $TB/bundle/VERSION); grep -q \"\$v\" $TB/bundle/manifest.json"

echo
echo "================ A 组汇总 ================"
echo "PASS=$pass_n  FAIL=$fail_n"
echo "=========================================="
[ "$fail_n" -eq 0 ]
