#!/usr/bin/env bash
# auto-sync-merge-audit-tools.sh
#
# 定时自动化维护：同步分支 -> 合并可合并分支到 master -> 删除已完全合并的非保护分支
# -> 生成前 420 个（不足则全部）工具审计清单与进度文件。
#
# 本脚本只做「确定性、可回滚、非破坏」的 git 流程与清单初始化；
# 第六~十步（逐工具静态/功能/边界/集成/安全验证、最小修复、逐工具提交、最终报告）
# 由触发本次任务的自动化代理依据 tool-audit-progress.json 继续执行。
#
# 安全红线（硬编码，不可被参数覆盖）：
#   - 绝不 force push / 改写远程历史
#   - 绝不删除未完全合并到 master 的分支
#   - 保护分支：master、origin/HEAD、当前检出分支
#   - 不执行 rm -rf / git reset --hard / git clean -fdx
#   - 工作区不干净默认停止（除非显式 ALLOW_STASH=1，且仅使用可恢复的 stash）
#   - 复杂/二进制/大规模冲突一律 merge --abort 并记为阻塞，不强行解决
#
# 可用环境变量：
#   REPO_DIR      仓库目录（默认脚本所在仓库根）
#   ALLOW_STASH   1 = 工作区有改动时允许 git stash -u（默认 0 = 直接停止）
#   GIT_PROXY     形如 http://127.0.0.1:10809；设置后 push/fetch 走该代理
#   TOOL_LIMIT    审计工具上限，默认 420
#   SKIP_PNPM     1 = 合并后跳过 pnpm 快速检查（默认 0）

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="${REPO_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
TOOL_LIMIT="${TOOL_LIMIT:-420}"
ALLOW_STASH="${ALLOW_STASH:-0}"
SKIP_PNPM="${SKIP_PNPM:-0}"
PROTECTED_REGEX='^(master|main)$'
cd "$REPO_DIR" || { echo "[FATAL] 无法进入仓库目录: $REPO_DIR"; exit 2; }

TS="$(date +%Y%m%d-%H%M%S)"
REPORT_MD="$REPO_DIR/auto-maintain-report-$TS.md"
PROGRESS_JSON="$REPO_DIR/tool-audit-progress.json"
MERGED_LIST=()
BLOCKED_BRANCHES=()
DELETED_LOCAL=()
DELETED_REMOTE=()
KEPT_BRANCHES=()

GIT=(git)
if [ -n "${GIT_PROXY:-}" ]; then
  GIT=(git -c http.proxy="$GIT_PROXY" -c https.proxy="$GIT_PROXY")
fi

log() { printf '[%s] %s\n' "$(date +%H:%M:%S)" "$*"; }
section() { printf '\n===== %s =====\n' "$*"; }

# ----------------------------------------------------------------------------
# 第二步：执行前检查
# ----------------------------------------------------------------------------
section "第二步 执行前检查"
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "[BLOCKED] 当前目录不是 Git 仓库: $REPO_DIR" | tee "$REPORT_MD"
  exit 3
fi
REMOTE_URL="$(git remote get-url origin 2>/dev/null || echo '(无 origin)')"
ORIG_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
PRE_HASH="$(git rev-parse HEAD)"
log "远程: $REMOTE_URL"
log "当前分支: $ORIG_BRANCH"
log "同步前 commit: $PRE_HASH"

if [ -n "$(git status --porcelain)" ]; then
  if [ "$ALLOW_STASH" = "1" ]; then
    log "工作区不干净，ALLOW_STASH=1：执行可恢复的 git stash -u"
    git stash push -u -m "auto-maintain-$TS" || { echo "[BLOCKED] stash 失败，停止"; exit 4; }
    STASHED=1
  else
    echo "[BLOCKED] 工作区存在未提交改动，按安全红线停止（如需可恢复暂存请设 ALLOW_STASH=1）："
    git status --short
    exit 4
  fi
else
  STASHED=0
fi

# ----------------------------------------------------------------------------
# 第三步：同步所有分支
# ----------------------------------------------------------------------------
section "第三步 同步所有分支"
log "git fetch --all --prune"
"${GIT[@]}" fetch --all --prune || { echo "[BLOCKED] fetch 失败（网络/权限），停止"; exit 5; }

log "确保位于 master 且快进同步"
git checkout master || { echo "[BLOCKED] 无法 checkout master，停止"; exit 6; }
git pull --ff-only origin master || { echo "[BLOCKED] master 非快进更新，按红线停止，不强制"; exit 6; }
POST_SYNC_HASH="$(git rev-parse HEAD)"
log "同步后 master commit: $POST_SYNC_HASH"

# 记录同步后所有分支快照
git branch -vv
git branch -r

# ----------------------------------------------------------------------------
# 第四步：合并所有可合并分支
# ----------------------------------------------------------------------------
section "第四步 合并候选分支到 master"

is_protected() {
  local b="$1"
  case "$b" in
    master|main|HEAD|"$ORIG_BRANCH") return 0 ;;
  esac
  echo "$b" | grep -Eq "$PROTECTED_REGEX" && return 0
  return 1
}

# 规范化远程分支名为本地名 origin/foo -> foo
candidate_local() {
  git for-each-ref --format='%(refname:short)' refs/heads
}
candidate_remote() {
  git for-each-ref --format='%(refname:short)' refs/remotes/origin \
    | grep -v -E '^origin/(HEAD|master|main)$'
}

declare -A SEEN=()
merge_one() {
  local ref="$1" kind="$2" localname
  if [ "$kind" = remote ]; then localname="${ref#origin/}"; else localname="$ref"; fi
  [ -n "${SEEN[$localname]:-}" ] && return 0
  SEEN[$localname]=1
  if is_protected "$localname"; then KEPT_BRANCHES+=("$localname(保护分支)"); return 0; fi

  # 远程分支先取到本地 FETCH_HEAD 之外的临时只读判断；用 origin/<name> 直接判断祖先关系
  local cmpref="$ref"
  if git merge-base --is-ancestor "$cmpref" master 2>/dev/null; then
    log "已合并，标记可删除（不重复合并）: $ref"
    DELETABLE+=("$ref")
    return 0
  fi

  log "未合并，尝试合并: $ref"
  if git merge --no-ff --no-edit "$cmpref"; then
    local mc
    mc="$(git rev-parse HEAD)"
    MERGED_LIST+=("$ref -> $mc")
    log "合并成功: $ref @ $mc"
  else
    log "合并冲突，执行 git merge --abort 并记为阻塞: $ref"
    git merge --abort 2>/dev/null || true
    BLOCKED_BRANCHES+=("$ref(合并冲突，已 abort，未删除)")
  fi
}

DELETABLE=()
while IFS= read -r b; do [ -n "$b" ] && merge_one "$b" local; done < <(candidate_local)
while IFS= read -r b; do [ -n "$b" ] && merge_one "$b" remote; done < <(candidate_remote)

if [ "${#MERGED_LIST[@]}" -gt 0 ] && [ "$SKIP_PNPM" != "1" ]; then
  section "合并后快速检查"
  if command -v pnpm >/dev/null 2>&1; then
    log "pnpm check:tools"
    pnpm check:tools || { echo "[BLOCKED] 合并后 check:tools 失败，停止推送"; exit 7; }
  else
    log "未找到 pnpm，跳过快速检查（SKIP_PNPM）"
  fi
fi

section "推送 master"
if [ "${#MERGED_LIST[@]}" -gt 0 ]; then
  if "${GIT[@]}" push origin master; then
    log "master 已推送"
  else
    echo "[BLOCKED] push origin master 失败，按红线停止后续远程分支删除"
    exit 8
  fi
else
  log "无新合并提交，master 已是最新（无需推送合并）"
fi
PUSHED_HASH="$(git rev-parse HEAD)"

# ----------------------------------------------------------------------------
# 第五步：删除已完全合并的非保护分支
# ----------------------------------------------------------------------------
section "第五步 删除已完全合并分支"
delete_one() {
  local ref="$1"
  local localname="${ref#origin/}"
  if is_protected "$localname"; then KEPT_BRANCHES+=("$localname(保护分支)"); return 0; fi

  # 删除前再次确认完全合并
  if ! git merge-base --is-ancestor "$ref" master 2>/dev/null; then
    KEPT_BRANCHES+=("$ref(未完全合并，保留)")
    return 0
  fi

  if [[ "$ref" == origin/* ]]; then
    local rh
    rh="$(git rev-parse "$ref" 2>/dev/null || echo unknown)"
    log "删除远程分支 $localname ($rh)"
    if "${GIT[@]}" push origin --delete "$localname"; then
      DELETED_REMOTE+=("$localname@${rh:0:10}")
    else
      KEPT_BRANCHES+=("$ref(远程删除失败，不强推)")
    fi
  else
    if git show-ref --verify --quiet "refs/heads/$localname"; then
      log "删除本地分支 $localname"
      if git branch -d "$localname"; then
        DELETED_LOCAL+=("$localname")
      else
        KEPT_BRANCHES+=("$ref(本地 -d 失败，保留)")
      fi
    fi
  fi
}

for ref in "${DELETABLE[@]:-}"; do [ -n "${ref:-}" ] && delete_one "$ref"; done

log "fetch --all --prune 复核"
"${GIT[@]}" fetch --all --prune || true

# ----------------------------------------------------------------------------
# 第六步：确定工具清单（注册表顺序，前 TOOL_LIMIT 个；不足则全部）
# ----------------------------------------------------------------------------
section "第六步 生成工具审计清单"
REG="packages/catalog/src/tools.generated.ts"
if [ ! -f "$REG" ]; then
  echo "[BLOCKED] 找不到工具注册表: $REG"
else
  node - "$REG" "$PROGRESS_JSON" "$TOOL_LIMIT" <<'NODE'
const fs = require('fs');
const [reg, out, limitStr] = process.argv.slice(2);
const s = fs.readFileSync(reg, 'utf8');
const ids = [...s.matchAll(/id:\s*'([^']+)'/g)].map((m) => m[1]);
const limit = Math.min(parseInt(limitStr, 10) || 420, ids.length);
const picked = ids.slice(0, limit);
const progress = {
  generatedAt: new Date().toISOString(),
  orderRule: 'tools.generated.ts 注册表顺序',
  totalRegistered: ids.length,
  requestedLimit: parseInt(limitStr, 10) || 420,
  planned: picked.length,
  note: ids.length < (parseInt(limitStr, 10) || 420) ? '注册表总数不足上限，处理全部' : '',
  done: 0,
  passed: 0,
  fixed: 0,
  blocked: 0,
  failed: 0,
  tools: picked.map((id, i) => ({
    index: i + 1,
    id,
    dir: `apps/web/src/tools/${id}`,
    status: 'pending',
    issues: [],
    fixes: [],
    commits: [],
    tests: '',
  })),
};
fs.writeFileSync(out, JSON.stringify(progress, null, 2) + '\n', 'utf8');
console.log(`注册总数=${ids.length} 计划审计=${picked.length} 进度文件=${out}`);
NODE
fi

# ----------------------------------------------------------------------------
# 输出 git 阶段报告（第十步的第 2-5、9 项由代理补充工具结果后成文）
# ----------------------------------------------------------------------------
section "生成 git 阶段报告"
{
  echo "# 自动维护报告（git 阶段） $TS"
  echo
  echo "- 远程: \`$REMOTE_URL\`"
  echo "- 同步前 commit: \`$PRE_HASH\`"
  echo "- 同步后 commit: \`$POST_SYNC_HASH\`"
  echo "- 推送后 commit: \`$PUSHED_HASH\`"
  echo "- stash: $STASHED"
  echo
  echo "## 合并"
  echo "- 成功合并: ${#MERGED_LIST[@]}"
  printf '  - %s\n' "${MERGED_LIST[@]:-}"
  echo "- 冲突阻塞: ${#BLOCKED_BRANCHES[@]}"
  printf '  - %s\n' "${BLOCKED_BRANCHES[@]:-}"
  echo
  echo "## 删除"
  echo "- 已删除本地: ${#DELETED_LOCAL[@]}"
  printf '  - %s\n' "${DELETED_LOCAL[@]:-}"
  echo "- 已删除远程: ${#DELETED_REMOTE[@]}"
  printf '  - %s\n' "${DELETED_REMOTE[@]:-}"
  echo "- 保留:"
  printf '  - %s\n' "${KEPT_BRANCHES[@]:-}"
  echo
  echo "## 待代理继续"
  echo "- 逐工具审计清单: \`$PROGRESS_JSON\`"
  echo "- 修复提交规范: fix(tools)/test(tools)/docs(tools): <工具名> ..."
} > "$REPORT_MD"

echo
echo "[GIT_STAGE_DONE] 报告: $REPORT_MD"
echo "[NEXT] 代理依据 $PROGRESS_JSON 执行第七~十步（逐工具验证、最小修复、提交、最终报告）。"
