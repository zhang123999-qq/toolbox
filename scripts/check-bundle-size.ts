/**
 * 体积预算门禁（审计 P1：PRD §4.1 的工程化落地）。
 *
 * PRD 预算：首屏 JS gzip < 120 KB、单工具页 JS gzip < 30 KB。
 * 本脚本扫描 apps/web/dist/assets，统计：
 *  - 入口/index 相关 chunk 的 gzip 合计（近似首屏）
 *  - 每个 tool-* chunk 的 gzip（超 30 KB 即失败）
 * 用法：pnpm --filter @toolbox/web build 之后运行 `pnpm check:bundle-size`。
 * 若 dist 不存在，打印明确错误并失败（CI 顺序须在 Build 之后）。
 */
import { readdirSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const DIST = join(process.cwd(), 'apps/web/dist/assets')
const FIRST_SCREEN_BUDGET_KB = 120
const TOOL_BUDGET_KB = 30

if (!existsSync(DIST)) {
  console.error(`[check-bundle-size] dist 不存在：${DIST}（请先运行 web build）`)
  process.exit(1)
}

const files = readdirSync(DIST).filter((f) => f.endsWith('.js'))
if (files.length === 0) {
  console.error('[check-bundle-size] dist/assets 下无 JS 产物')
  process.exit(1)
}

const gzipKB = (f: string) => gzipSync(readFileSync(join(DIST, f))).length / 1024

let firstScreenKB = 0
const toolViolations: string[] = []
const toolChunks: Array<{ file: string; kb: number }> = []

for (const f of files) {
  const kb = gzipKB(f)
  if (f.startsWith('tool-')) {
    toolChunks.push({ file: f, kb })
    if (kb > TOOL_BUDGET_KB) toolViolations.push(`${f}: ${kb.toFixed(1)}KB > ${TOOL_BUDGET_KB}KB`)
  } else if (/^(index|vendor-react|app-core|chunk-)/.test(f)) {
    // 入口与首屏必载 chunk（近似口径：含 index、react vendor、app-core、未命中 manualChunks 的 chunk-*）
    firstScreenKB += kb
  }
}

console.log(
  `[check-bundle-size] 首屏近似 gzip: ${firstScreenKB.toFixed(1)}KB / 预算 ${FIRST_SCREEN_BUDGET_KB}KB`,
)
console.log(
  `[check-bundle-size] tool-* chunk 数: ${toolChunks.length}，最大: ${toolChunks.length ? Math.max(...toolChunks.map((t) => t.kb)).toFixed(1) : '0'}KB`,
)

const failures: string[] = []
if (firstScreenKB > FIRST_SCREEN_BUDGET_KB) {
  failures.push(`首屏 gzip ${firstScreenKB.toFixed(1)}KB 超过预算 ${FIRST_SCREEN_BUDGET_KB}KB`)
}
failures.push(...toolViolations)

if (failures.length > 0) {
  console.error('[check-bundle-size] 预算超标：')
  for (const f of failures) console.error(`  - ${f}`)
  process.exit(1)
}
console.log('[check-bundle-size] 全部在预算内 ✓')
