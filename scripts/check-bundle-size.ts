/**
 * 体积预算门禁（审计 P1：PRD §4.1 的工程化落地）。
 *
 * PRD 预算：首屏 JS gzip < 120 KB、单工具页 JS gzip < 30 KB。
 * 本脚本扫描 apps/web/dist/assets，统计：
 *  - 首屏必载 chunk 的 gzip 合计：index / vendor-react / app-core /
 *    rolldown-runtime（工具页专属与共享的 chunk-* 都是懒加载，不计入首屏）
 *  - 每个 tool-* chunk 的 gzip（超上限即失败）
 * 用法：pnpm --filter @toolbox/web build 之后运行 `pnpm check:bundle-size`。
 * 若 dist 不存在，打印明确错误并失败（CI 顺序须在 Build 之后）。
 *
 * Ratchet 说明（当前预算尚未达标）：
 *  - 首屏实测约 286 KB，距 PRD 120 KB 预算有真实差距（index 含 799 工具
 *    元数据、app-core 含应用壳）。达标需要架构改造（元数据/目录懒加载），
 *    在此之前设现状上限锁死增长率，避免门禁长期红灯被绕过或废弃。
 *  - 以下重型工具依赖重量级库或词典数据（pdf-lib、zxcvbn 密码词典、
 *    中文词典、svgo、mathjs 等），gzip 物理上压不进 30 KB，同样按
 *    「实测值 + 10% 余量」设上限。瘦身后应下调对应上限；未列出的工具
 *    仍按 30 KB 通用预算判定。
 */
import { readdirSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const DIST = join(process.cwd(), 'apps/web/dist/assets')
const FIRST_SCREEN_BUDGET_KB = 120 // PRD §4.1 目标（当前未达标，见上方 Ratchet 说明）
const FIRST_SCREEN_CEILING_KB = 315 // 现状上限：实测 286.3 KB + 10% 余量
const TOOL_BUDGET_KB = 30
/** 共享 vendor chunk 的 gzip 上限（ratchet）：防大包从未归因的前缀里静默增长 */
const SHARED_CHUNK_CEILING_KB = 600

/** 重型工具现状上限（tool id -> gzip KB 上限，2026-11-05 实测值 + 10% 余量）。 */
const TOOL_CEILINGS_KB: Record<string, number> = {
  'zh-convert': 551, // 实测 500.4 KB：中文简繁/拼音词典
  'password-strength': 423, // 实测 384.5 KB：zxcvbn 密码词典
  calculator: 194, // 实测 176.3 KB：mathjs
  'code-to-pdf': 191, // 实测 173.1 KB：pdf-lib + 代码高亮
  'embedding-vis': 188, // 实测 170.9 KB：向量可视化依赖
  'svg-optimize-img': 178, // 实测 161.6 KB：svgo
  'doc-convert': 154, // 实测 139.4 KB：文档转换依赖
  pinyin: 153, // 实测 138.6 KB：拼音词典
  sentiment: 150, // 实测 136.0 KB：情感词典
  'pdf-compare': 143, // 实测 129.5 KB：pdf-lib
  'pdf-to-ppt': 135, // 实测 122.2 KB：pdf-lib
  'barcode-scan': 128, // 实测 116.2 KB：zxing
  'pdf-to-word': 108, // 实测 98.0 KB：pdf-lib
  'markdown-preview': 45, // 实测 40.5 KB：markdown 渲染
  statistics: 35, // 实测 31.1 KB：统计依赖（临界）
}

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

/**
 * tool-<id>-<hash>.js -> 匹配现状上限 key。Rollup hash 固定 8 字符且可能
 * 含 '-'/'_'（如 DsoGlb-f），无法按 '-' 切分 id，改为「最长 key 前缀 +
 * 恰好 8 字符 hash」精确匹配；未命中即按通用预算判定（误判只会偏严）。
 */
const ceilingKeyOf = (f: string): string | undefined => {
  const stem = f.slice('tool-'.length, -'.js'.length)
  const keys = Object.keys(TOOL_CEILINGS_KB).sort((a, b) => b.length - a.length)
  for (const k of keys) {
    if (stem.startsWith(`${k}-`) && stem.length - k.length - 1 === 8) return k
  }
  return undefined
}

let firstScreenKB = 0
const failures: string[] = []
const toolChunks: Array<{ file: string; kb: number }> = []
const seenCeilings = new Set<string>()
let unassigned = 0

for (const f of files) {
  const kb = gzipKB(f)
  if (f.startsWith('tool-')) {
    toolChunks.push({ file: f, kb })
    const key = ceilingKeyOf(f)
    const ceiling = (key !== undefined && TOOL_CEILINGS_KB[key]) || TOOL_BUDGET_KB
    if (key !== undefined) seenCeilings.add(key)
    if (kb > ceiling) {
      failures.push(
        `${f} (${key ?? '通用预算'}): ${kb.toFixed(1)}KB > 上限 ${ceiling}KB` +
          (key !== undefined ? '（现状上限被突破，请瘦身或评估后调高上限）' : ''),
      )
    }
  } else if (/^(index|vendor-react|app-core|rolldown-runtime)-/.test(f)) {
    // 首屏必载：入口、react vendor、应用壳、运行时
    firstScreenKB += kb
  } else if (f.startsWith('vendor-')) {
    // 共享 vendor chunk（如 vendor-echarts / vendor-mermaid）：归因在此，
    // 只设 ratchet 上限防增长，不设 30KB 预算（见 vite.config manualChunks）。
    if (kb > SHARED_CHUNK_CEILING_KB) {
      failures.push(`${f}: ${kb.toFixed(1)}KB > 共享 chunk 上限 ${SHARED_CHUNK_CEILING_KB}KB`)
    }
  } else {
    // 未归因 chunk：默认 chunk（rollup 产物名 chunk-*/lib-*）尚无预算归因。
    // 仍按共享 chunk 上限约束，防大包从未归因的前缀里静默增长；
    // 归因补齐（manualChunks 显式命名）后应消除此类 chunk。
    unassigned++
    if (kb > SHARED_CHUNK_CEILING_KB) {
      failures.push(`${f}: ${kb.toFixed(1)}KB > 未归因 chunk 上限 ${SHARED_CHUNK_CEILING_KB}KB`)
    }
  }
}

console.log(
  `[check-bundle-size] 首屏 gzip: ${firstScreenKB.toFixed(1)}KB / PRD 预算 ${FIRST_SCREEN_BUDGET_KB}KB / 现状上限 ${FIRST_SCREEN_CEILING_KB}KB`,
)
if (firstScreenKB > FIRST_SCREEN_BUDGET_KB) {
  console.log(
    '[check-bundle-size] 提示：首屏尚未达到 PRD 120KB 预算（index 含工具元数据、app-core 为应用壳，需懒加载改造），门禁仅防新增增长',
  )
}
console.log(
  `[check-bundle-size] tool-* chunk 数: ${toolChunks.length}，最大: ${toolChunks.length ? Math.max(...toolChunks.map((t) => t.kb)).toFixed(1) : '0'}KB，现状上限工具: ${seenCeilings.size}`,
)
if (unassigned > 0) {
  console.log(
    `[check-bundle-size] 提示：${unassigned} 个未归因 chunk（chunk-*/lib-*），尚未设预算归因`,
  )
}
if (firstScreenKB > FIRST_SCREEN_CEILING_KB) {
  failures.push(`首屏 gzip ${firstScreenKB.toFixed(1)}KB 超过现状上限 ${FIRST_SCREEN_CEILING_KB}KB`)
}

// 上限已失效（工具瘦身到通用预算内）或工具不存在的条目：提示收紧 ratchet
for (const id of Object.keys(TOOL_CEILINGS_KB)) {
  if (!seenCeilings.has(id)) {
    console.log(
      `[check-bundle-size] 提示：上限条目 ${id} 本次无对应 chunk，可从 TOOL_CEILINGS_KB 删除`,
    )
  }
}

if (failures.length > 0) {
  console.error('[check-bundle-size] 预算超标：')
  for (const f of failures) console.error(`  - ${f}`)
  process.exit(1)
}
console.log('[check-bundle-size] 全部在预算内 ✓')
