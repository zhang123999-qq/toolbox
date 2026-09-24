#!/bin/sh
# ============================================================================
# verify-release-source.sh —— 校验「发布源默认值」在脚本与文档里是同一个值
#
# 为什么需要它：一键安装与在线升级的发布源默认值分散在三处（install.sh、
# toolboxctl、若干文档），改一处漏一处就会出现「文档里的命令装不上 /
# 装完提示的升级源不对」。这类漂移靠人眼审不出来，只能机检。
#
# 用法（在仓库内任意位置）：
#   sh deploy/binary/tests/verify-release-source.sh
#
# 只做静态检查，不需要 nginx / systemd / 网络。
# ============================================================================
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../../.." && pwd)
CANON=https://github.com/zhang123999-qq/toolbox/releases/latest/download
ONE_LINER="curl -fsSL $CANON/install.sh | sudo bash"

pass=0
fail=0
ok()  { pass=$((pass + 1)); printf '  [✓] %s\n' "$*"; }
bad() { fail=$((fail + 1)); printf '  [✗] %s\n' "$*"; }
step() { printf '\n== %s\n' "$*"; }

# 统计文件里某段文本出现几次（没有匹配时返回 0，不要把 grep 的退出码带进 set -e）
count_in() {
  grep -c -F -- "$2" "$1" 2>/dev/null || true
}

# chk_contains <描述> <文件> <文本>
chk_contains() {
  if [ "$(count_in "$2" "$3")" -ge 1 ]; then
    ok "$1"
  else
    bad "$1 —— $2 里找不到：$3"
  fi
}

step '1. 脚本里的发布源默认值指向本仓库'
chk_contains 'install.sh 的仓库默认值' "$ROOT/deploy/binary/install.sh" \
  'REPO=${TOOLBOX_REPO:-zhang123999-qq/toolbox}'
chk_contains 'install.sh 的发布源基址' "$ROOT/deploy/binary/install.sh" \
  'RELEASE_BASE=https://github.com/${REPO}/releases/latest/download'
chk_contains 'toolboxctl 的发布源默认值' "$ROOT/deploy/binary/toolboxctl" \
  "DEFAULT_UPDATE_SOURCE=$CANON"

step '2. check-update / upgrade 都回落到该默认值'
# 两处都要回落，少一处就会让其中一个子命令仍然要求必传 --source
if [ "$(count_in "$ROOT/deploy/binary/toolboxctl" '${UPDATE_SOURCE:-$DEFAULT_UPDATE_SOURCE}')" -ge 2 ]; then
  ok 'check-update 与 upgrade 均回落 DEFAULT_UPDATE_SOURCE'
else
  bad '回落 DEFAULT_UPDATE_SOURCE 的地方少于 2 处（check-update / upgrade 各需一处）'
fi

step '3. 文档里的一键安装命令指向同一条直链'
for f in README.md README.en.md docs/README.md docs/README.en.md deploy/binary/README.md; do
  chk_contains "$f 含一键安装命令" "$ROOT/$f" "$ONE_LINER"
done

step '4. 不允许再出现占位式的一键命令（防回退）'
# 只拦「默认一键命令」写成占位符的情况；`http://<发布源>/…` 这种自建源示例是本意，不拦
for f in README.md README.en.md docs/README.md docs/README.en.md deploy/binary/README.md; do
  if [ "$(count_in "$ROOT/$f" 'curl -fsSL <发布源>/install.sh')" -ge 1 ] ||
     [ "$(count_in "$ROOT/$f" 'curl -fsSL <release-source>/install.sh')" -ge 1 ]; then
    bad "$f 里仍有占位式的一键命令（curl -fsSL <发布源>/install.sh）"
  else
    ok "$f 无占位式一键命令"
  fi
done

printf '\n'
if [ "$fail" = "0" ]; then
  printf '发布源默认值校验通过：%s 项 ✅\n' "$pass"
  exit 0
fi
printf '发布源默认值校验失败：%s 项通过、%s 项失败\n' "$pass" "$fail" >&2
exit 1
