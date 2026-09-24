/**
 * 源码组织规范校验（docs/source-organization.md）
 *
 * 机器执行《源码组织规范》里的六条可静态判定规则：
 *   1. 目录 ↔ catalog：apps/web/src/tools/ 下每个子目录必须对应一个工具 id
 *   2. 标准文件集：8 个文件缺一不可，且不允许多余文件
 *   3. 跨工具 import：相对路径里出现 ../<其它工具>/ 即违规
 *   4. 多工具混放：同一目录出现多份 *Tool.tsx
 *   5. 命名合规：kebab-case、与 catalog id 一致、与 meta.ts 的 id 一致、全局唯一
 *   6. 公共层反向依赖：lib/ components/ i18n/ theme/ 反向 import 某个具体工具目录
 *      （这是「业务逻辑外置 / 倒灌」唯一能静态判定的形态）
 *
 * 用法：
 *   pnpm check:source-org            只校验，违规退出码 1
 *   pnpm check:source-org --report   额外写出 .agent/reports/source-org-audit.md
 *
 * 退出码：0 合规 / 1 违规。
 */
import { existsSync, readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import { TOOLS } from '@toolbox/catalog'

const ROOT = resolve(import.meta.dirname, '..')
const TOOLS_DIR = join(ROOT, 'apps/web/src/tools')

/** 规范 §2：工具文件夹内固定 8 个文件，缺一即违规，多一个同样违规 */
const STANDARD_FILES = [
  'meta.ts',
  'schema.ts',
  'utils.ts',
  'Tool.tsx',
  'test.ts',
  'Tool.test.tsx',
  'e2e.spec.ts',
  'README.md',
] as const

/** 规范 §2：kebab-case，且不以中划线开头或结尾 */
const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** 公共基础设施层：这些目录反向依赖某个工具目录 = 业务逻辑倒灌 */
const SHARED_LAYERS = [
  'apps/web/src/lib',
  'apps/web/src/components',
  'apps/web/src/i18n',
  'apps/web/src/theme',
  'packages',
] as const

interface Violation {
  /** 涉及的工具目录（公共层问题用所在层名） */
  tool: string
  /** 相关文件（相对仓库根，正斜杠） */
  files: string[]
  /** 违规描述 */
  violations: string[]
  /** 怎么改 */
  suggestions: string[]
}

const violations: Violation[] = []
const posix = (p: string) => p.split(sep).join('/')
const relFromRoot = (p: string) => posix(relative(ROOT, p))

function add(v: Violation): void {
  violations.push(v)
}

/** 递归收集目录下指定后缀的文件 */
function walk(dir: string, exts: readonly string[], out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) walk(full, exts, out)
    else if (exts.some((e) => entry.name.endsWith(e))) out.push(full)
  }
  return out
}

// ───────────────────────────────────────────────────────────
// 0. 前置：目录与 catalog 是否可读
// ───────────────────────────────────────────────────────────
console.log('=== 源码组织规范校验 ===')
console.log(`  扫描目录：${relFromRoot(TOOLS_DIR)}`)

if (!existsSync(TOOLS_DIR)) {
  console.error(`  ✗ 工具目录不存在：${relFromRoot(TOOLS_DIR)}`)
  process.exit(1)
}

const catalogIds = new Set(TOOLS.map((t) => t.id))
const dirs = readdirSync(TOOLS_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort()

console.log(`  工具目录 ${dirs.length} 个 · catalog 已注册 ${catalogIds.size} 个`)

// ───────────────────────────────────────────────────────────
// 1. 目录 ↔ catalog 对应（双向）
// ───────────────────────────────────────────────────────────
console.log('=== 1. 目录 ↔ catalog 对应 ===')
const orphanDirs = dirs.filter((d) => !catalogIds.has(d))
const dirlessTools = TOOLS.filter((t) => !dirs.includes(t.id)).map((t) => t.id)

if (orphanDirs.length === 0 && dirlessTools.length === 0) {
  console.log(`  ✓ ${dirs.length} 个目录与 catalog 一一对应`)
} else {
  for (const d of orphanDirs) {
    console.error(`  ✗ [${d}] 目录未对应任何 catalog 工具 id`)
    add({
      tool: d,
      files: [relFromRoot(join(TOOLS_DIR, d))],
      violations: ['目录未对应任何 catalog 工具 id（规范 §1）'],
      suggestions: ['在 meta.ts 里补 id 并重跑 pnpm generate:catalog，或删除该目录'],
    })
  }
  if (dirlessTools.length) {
    console.error(`  ✗ catalog 中有工具缺少目录：${dirlessTools.join(', ')}`)
    add({
      tool: '(catalog)',
      files: [],
      violations: [
        `catalog 中 ${dirlessTools.length} 个工具没有对应目录：${dirlessTools.join(', ')}`,
      ],
      suggestions: ['按规范 §1 建 apps/web/src/tools/<id>/ 并放齐 8 个文件'],
    })
  }
}

// ───────────────────────────────────────────────────────────
// 2. 标准文件集（缺一即违规，多余同样违规）
// ───────────────────────────────────────────────────────────
console.log('=== 2. 标准文件集（8 个） ===')
let fileSetOk = 0
for (const d of dirs) {
  const files = readdirSync(join(TOOLS_DIR, d)).sort()
  const missing = STANDARD_FILES.filter((f) => !files.includes(f))
  const extra = files.filter((f) => !(STANDARD_FILES as readonly string[]).includes(f))
  if (missing.length === 0 && extra.length === 0) {
    fileSetOk += 1
    continue
  }
  const msgs: string[] = []
  if (missing.length) msgs.push(`缺少文件：${missing.join(', ')}`)
  if (extra.length) msgs.push(`多余文件：${extra.join(', ')}`)
  console.error(`  ✗ [${d}] ${msgs.join('；')}`)
  add({
    tool: d,
    files: missing.concat(extra).map((f) => `${relFromRoot(TOOLS_DIR)}/${d}/${f}`),
    violations: msgs.map((m) => `${m}（规范 §2）`),
    suggestions: [
      `补齐 ${STANDARD_FILES.join(' / ')}`,
      '多余文件若属共用逻辑，上提到 apps/web/src/lib/ 或 packages/',
    ],
  })
}
console.log(`  ✓ ${fileSetOk}/${dirs.length} 个目录文件集完整`)

// ───────────────────────────────────────────────────────────
// 3. 跨工具 import
// ───────────────────────────────────────────────────────────
console.log('=== 3. 跨工具 import ===')
// 相对路径里出现 ../<其它工具目录>/ 即命中；含 ../../tools/<其它工具>/ 也一并覆盖
const IMPORT_RE = /(?:from|import|require)\s*\(?\s*['"]([^'"]+)['"]/g
let crossCount = 0
for (const d of dirs) {
  for (const file of walk(join(TOOLS_DIR, d), ['.ts', '.tsx'])) {
    const src = readFileSync(file, 'utf8')
    IMPORT_RE.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = IMPORT_RE.exec(src)) !== null) {
      const spec = m[1]!
      if (!spec.startsWith('.')) continue
      // 逐级上跳后再落进某个工具目录都算
      const hit = spec.match(/(?:^|\/)\.\.\/([A-Za-z0-9-]+)\//g) ?? []
      for (const seg of hit) {
        const name = seg
          .replace(/^\.\.\//, '')
          .replace(/^\/?\.\.\//, '')
          .replace(/\/$/, '')
        const other = name.replace(/^\.\.\//, '')
        if (dirs.includes(other) && other !== d) {
          crossCount += 1
          console.error(`  ✗ [${d}] ${relFromRoot(file)} → ../${other}/`)
          add({
            tool: d,
            files: [relFromRoot(file)],
            violations: [`跨工具 import：${spec}（规范 §1、§3）`],
            suggestions: [
              `把共用逻辑上提到 apps/web/src/lib/ 或 packages/，再从两边各自引用`,
              `或改用 catalog / 模板层提供的能力，不要让工具之间直接耦合`,
            ],
          })
        }
      }
    }
  }
}
console.log(crossCount === 0 ? '  ✓ 无跨工具 import' : `  ✗ 共 ${crossCount} 处跨工具 import`)

// ───────────────────────────────────────────────────────────
// 4. 多工具混放（一个目录多份 Tool.tsx）
// ───────────────────────────────────────────────────────────
console.log('=== 4. 多工具混放 ===')
let mixed = 0
for (const d of dirs) {
  const toolFiles = walk(join(TOOLS_DIR, d), ['.tsx']).filter((f) => /Tool\.tsx$/.test(f))
  if (toolFiles.length <= 1) continue
  mixed += 1
  console.error(`  ✗ [${d}] 含 ${toolFiles.length} 份 Tool.tsx`)
  add({
    tool: d,
    files: toolFiles.map(relFromRoot),
    violations: [`一个目录含 ${toolFiles.length} 份 *Tool.tsx，疑似多工具混放（规范 §1）`],
    suggestions: ['拆成多个 apps/web/src/tools/<id>/，每个目录只留一份 Tool.tsx'],
  })
}
console.log(mixed === 0 ? '  ✓ 无多工具混放' : `  ✗ ${mixed} 个目录多工具混放`)

// ───────────────────────────────────────────────────────────
// 5. 命名合规（kebab-case / 与 catalog id 一致 / 与 meta.ts id 一致 / 全局唯一）
// ───────────────────────────────────────────────────────────
console.log('=== 5. 命名合规 ===')
let nameIssues = 0
const seen = new Set<string>()
for (const d of dirs) {
  const problems: string[] = []
  if (!KEBAB.test(d)) problems.push(`目录名非 kebab-case：${d}`)
  if (!catalogIds.has(d)) problems.push(`与 catalog id 不一致（catalog 里没有 ${d}）`)

  const metaPath = join(TOOLS_DIR, d, 'meta.ts')
  if (existsSync(metaPath)) {
    const meta = readFileSync(metaPath, 'utf8')
    const idMatch = meta.match(/id:\s*['"]([^'"]+)['"]/)
    if (idMatch && idMatch[1] !== d) {
      problems.push(`meta.ts 的 id 为 ${idMatch[1]}，与目录名 ${d} 不一致`)
    }
    const slugMatch = meta.match(/slug:\s*['"]([^'"]+)['"]/)
    if (slugMatch && slugMatch[1] !== d) {
      problems.push(`meta.ts 的 slug 为 ${slugMatch[1]}，与目录名 ${d} 不一致`)
    }
  }

  if (seen.has(d)) problems.push(`目录名重复：${d}`)
  seen.add(d)

  if (problems.length === 0) continue
  nameIssues += 1
  console.error(`  ✗ [${d}] ${problems.join('；')}`)
  add({
    tool: d,
    files: [relFromRoot(join(TOOLS_DIR, d))],
    violations: problems.map((p) => `${p}（规范 §2）`),
    suggestions: ['目录名改用 kebab-case，并与 meta.ts 的 id / slug 及 catalog 保持一致'],
  })
}
console.log(nameIssues === 0 ? '  ✓ 全部命名合规' : `  ✗ ${nameIssues} 个目录命名不合规`)

// ───────────────────────────────────────────────────────────
// 6. 公共层反向依赖工具目录（业务逻辑倒灌 / 外置）
// ───────────────────────────────────────────────────────────
console.log('=== 6. 公共层反向依赖 ===')
let backDeps = 0
for (const layer of SHARED_LAYERS) {
  const abs = join(ROOT, layer)
  if (!existsSync(abs)) continue
  const files = walk(abs, ['.ts', '.tsx']).filter((f) => !f.includes(`${sep}node_modules${sep}`))
  for (const file of files) {
    const src = readFileSync(file, 'utf8')
    IMPORT_RE.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = IMPORT_RE.exec(src)) !== null) {
      const spec = m[1]!
      const hit = spec.match(/(?:^|\/)(?:tools)\/([A-Za-z0-9-]+)/)
      if (!hit) continue
      const other = hit[1]!
      if (!dirs.includes(other)) continue
      backDeps += 1
      console.error(`  ✗ ${relFromRoot(file)} → ${spec}`)
      add({
        tool: `(公共层 ${layer})`,
        files: [relFromRoot(file)],
        violations: [`公共层反向依赖具体工具目录 ${other}（规范 §3「业务逻辑外置」）`],
        suggestions: [
          '把该逻辑上提到 apps/web/src/lib/ 或 packages/，工具再引用公共层',
          '公共层不得知道任何具体工具的存在',
        ],
      })
    }
  }
}
console.log(backDeps === 0 ? '  ✓ 公共层未反向依赖任何工具' : `  ✗ ${backDeps} 处反向依赖`)

// ───────────────────────────────────────────────────────────
// 输出违规清单 + 审计报告
// ───────────────────────────────────────────────────────────
console.log('')
if (violations.length === 0) {
  console.log(`✅ 源码组织规范校验通过：${dirs.length} 个工具目录全部合规`)
} else {
  console.log(`❌ 违规清单（${violations.length} 条）`)
  for (const v of violations) {
    console.log('')
    console.log(`  tool:        ${v.tool}`)
    console.log(`  files:       ${v.files.length ? v.files.join(', ') : '（无）'}`)
    console.log(`  violations:  ${v.violations.join(' | ')}`)
    console.log(`  suggestions: ${v.suggestions.join(' | ')}`)
  }
}

if (process.argv.includes('--report')) {
  const reportDir = join(ROOT, '.agent/reports')
  mkdirSync(reportDir, { recursive: true })
  const byCategory = new Map<string, Violation[]>()
  for (const v of violations) {
    const key = v.violations[0]?.split('（')[0] ?? '其它'
    byCategory.set(key, [...(byCategory.get(key) ?? []), v])
  }
  const lines: string[] = []
  lines.push('# 源码组织规范 · 审计报告')
  lines.push('')
  lines.push(
    `> 由 \`pnpm check:source-org --report\` 自动生成，勿手工编辑。规范正文见 [\`docs/source-organization.md\`](../../docs/source-organization.md)。`,
  )
  lines.push('')
  lines.push('## 一、扫描范围与结论')
  lines.push('')
  lines.push('| 项 | 值 |')
  lines.push('| --- | --- |')
  lines.push(`| 扫描目录 | \`apps/web/src/tools/\` |`)
  lines.push(`| 工具目录数 | ${dirs.length} |`)
  lines.push(`| catalog 注册数 | ${catalogIds.size} |`)
  lines.push(`| 文件集完整 | ${fileSetOk}/${dirs.length} |`)
  lines.push(`| 跨工具 import | ${crossCount} |`)
  lines.push(`| 多工具混放 | ${mixed} |`)
  lines.push(`| 命名不合规 | ${nameIssues} |`)
  lines.push(`| 公共层反向依赖 | ${backDeps} |`)
  lines.push(`| **违规总数** | **${violations.length}** |`)
  lines.push('')
  lines.push('## 二、按违规类型分组')
  lines.push('')
  if (violations.length === 0) {
    lines.push('本次全量审计**未发现违规**：')
    lines.push('')
    lines.push('- 多工具混放同一文件夹：0')
    lines.push('- 文件夹内文件缺失或多余：0')
    lines.push('- 跨工具文件夹 import：0')
    lines.push('- 命名冲突或不合规：0')
    lines.push('- 业务逻辑外置（公共层反向依赖）：0')
    lines.push('')
    lines.push('存量源码已全部满足规范 §1–§3，无需整改（见 `source-org-refactor.md`）。')
  } else {
    lines.push('| 违规类型 | 条数 | 涉及工具 |')
    lines.push('| --- | --- | --- |')
    for (const [key, list] of byCategory) {
      lines.push(
        `| ${key} | ${list.length} | ${[...new Set(list.map((v) => v.tool))].join(', ')} |`,
      )
    }
    lines.push('')
    for (const [key, list] of byCategory) {
      lines.push(`### ${key}`)
      lines.push('')
      for (const v of list) {
        lines.push(`- **${v.tool}**`)
        lines.push(
          `  - files: ${v.files.length ? v.files.map((f) => `\`${f}\``).join(', ') : '（无）'}`,
        )
        for (const s of v.violations) lines.push(`  - violation: ${s}`)
        for (const s of v.suggestions) lines.push(`  - suggestion: ${s}`)
      }
      lines.push('')
    }
  }
  writeFileSync(join(reportDir, 'source-org-audit.md'), lines.join('\n') + '\n', 'utf8')
  console.log(`  审计报告已写出：${relFromRoot(join(reportDir, 'source-org-audit.md'))}`)
}

process.exit(violations.length === 0 ? 0 : 1)
