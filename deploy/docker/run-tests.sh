#!/usr/bin/env bash
# 容器内的全量测试驱动脚本。
#
# 设计要点：
# 1. 每个阶段独立记日志，失败不中断后续阶段——一轮跑完就拿得到「全量」结果，
#    而不是修一个再跑一轮才发现下一个（迭代成本差一个数量级）。
# 2. 只做「跑 + 记」，不改任何用例、不跳过任何阶段；退出码 = 是否有失败阶段。
# 3. 日志写到 $LOG_DIR（由 compose 挂载到宿主机 .agent/test-logs），容器删了也在。
set -uo pipefail

LOG_DIR="${LOG_DIR:-/app/.agent/test-logs/current}"
WEB_BASE_URL="${WEB_BASE_URL:-}"
E2E_RETRIES="${E2E_RETRIES:-0}"

mkdir -p "$LOG_DIR"
SUMMARY="$LOG_DIR/summary.tsv"
: >"$SUMMARY"
printf 'STATUS\tSTAGE\tSECONDS\tLOG\n' >>"$SUMMARY"

overall=0

run_stage() {
  local name="$1"
  shift
  local log="$LOG_DIR/$name.log"
  local start end dur status
  start=$(date +%s)
  echo "==> [$name] $*"
  if "$@" >"$log" 2>&1; then
    status=PASS
  else
    status=FAIL
    overall=1
  fi
  end=$(date +%s)
  dur=$((end - start))
  printf '%s\t%s\t%s\t%s\n' "$status" "$name" "$dur" "$name.log" >>"$SUMMARY"
  printf '    [%s] %s (%ss) -> %s\n' "$status" "$name" "$dur" "$log"
  if [ "$status" = FAIL ]; then
    echo '    ---- 失败输出（末尾 40 行）----'
    tail -n 40 "$log" | sed 's/^/    | /'
    echo '    ------------------------------'
  fi
}

cd /app

# ── 0. 依赖对齐 ────────────────────────────────────────────
# 镜像构建时源码还没拷进来（为了让 chromium 层不被源码改动作废），
# 所以这里按 Dockerfile 里的同一份清单再装一次；锁文件不一致会直接失败，
# 保证「跑测试用的依赖」与「锁文件」严格一致。
run_stage deps pnpm install --frozen-lockfile --ignore-scripts

# ── 1. 静态门禁（快，先跑）───────────────────────────────
run_stage gate-tools pnpm check:tools
run_stage gate-source-org pnpm check:source-org
run_stage gate-env pnpm check:env
run_stage gate-docs pnpm check:docs
run_stage gate-licenses pnpm check:licenses
run_stage gate-deploy-scripts bash deploy/docker/verify-deploy-scripts.sh

# ── 2. 代码质量 ───────────────────────────────────────────
run_stage lint pnpm lint
run_stage format pnpm format:check
run_stage typecheck pnpm typecheck

# ── 3. 单元 / 组件测试 ────────────────────────────────────
run_stage unit pnpm test

# ── 4. 全量构建（客户端 + SSR + 预渲染）───────────────────
run_stage build-ssg pnpm build:ssg

# ── 5. 二进制部署链路：打 bundle + 真起 nginx 验证 ──────────
# 这条是「一键安装 / toolboxctl upgrade」落地效果的唯一自动化覆盖：
# 解包 → 校验和 → 渲染 nginx 配置 → 真起服务 → 断言路由/404/gzip/健康检查。
run_stage bundle bash deploy/binary/build-bundle.sh --skip-build
bundle_tar=$(ls dist-release/*.tar.gz 2>/dev/null | head -1 || true)
if [ -n "$bundle_tar" ]; then
  run_stage deploy-nginx sh deploy/binary/tests/verify-nginx-config.sh "$bundle_tar" 8088
else
  printf 'FAIL\tbundle\t0\t-\n' >>"$SUMMARY"
  echo '==> [deploy-nginx] 跳过：dist-release 下没有 bundle（build-bundle 失败）'
  overall=1
fi

# ── 6. E2E（真实浏览器跑核心业务流程）──────────────────────
E2E_RETRIES="$E2E_RETRIES" \
  run_stage e2e pnpm --filter @toolbox/web test:e2e

# ── 7. 产物冒烟：preview 直出 ─────────────────────────────
if [ -d apps/web/dist ]; then
  # 用 4174 避开 playwright webServer 占用的 4173，避免两个 preview 抢端口
  pnpm --filter @toolbox/web preview --port 4174 --host 127.0.0.1 >"$LOG_DIR/preview-server.log" 2>&1 &
  preview_pid=$!
  for _ in $(seq 1 40); do
    if node -e 'fetch("http://127.0.0.1:4174/").then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))' 2>/dev/null; then
      break
    fi
    sleep 1
  done
  # vite preview 自带 SPA 回退（未知路径返回 200 + 应用外壳），与 nginx 的硬 404 语义不同，
  # 用 SMOKE_SPA_FALLBACK 让冒烟按 preview 语义断言
  SMOKE_BASE_URL=http://127.0.0.1:4174 SMOKE_SPA_FALLBACK=1 \
    run_stage smoke-preview node deploy/docker/smoke.mjs
  kill "$preview_pid" 2>/dev/null || true
else
  printf 'SKIP\tsmoke-preview\t0\t-\n' >>"$SUMMARY"
  echo '==> [smoke-preview] 跳过：apps/web/dist 不存在（构建阶段失败）'
  overall=1
fi

# ── 7. 产物冒烟：compose 里真实部署的 nginx 容器 ───────────
if [ -n "$WEB_BASE_URL" ]; then
  SMOKE_BASE_URL="$WEB_BASE_URL" run_stage smoke-nginx node deploy/docker/smoke.mjs
fi

echo
echo '================ 汇总 ================'
column -t -s $'\t' "$SUMMARY" 2>/dev/null || cat "$SUMMARY"
fail_count=$(grep -c '^FAIL' "$SUMMARY" || true)
pass_count=$(grep -c '^PASS' "$SUMMARY" || true)
echo "PASS=$pass_count FAIL=$fail_count"
echo "日志目录：$LOG_DIR"

exit "$overall"
