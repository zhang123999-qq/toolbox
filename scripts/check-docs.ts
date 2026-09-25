/**
 * 文档一致性校验（`pnpm check:docs`）
 *
 * 双语体系最容易烂掉的地方不是「没翻译」，而是**翻译后两边各自漂移**：
 * 中文加了新章节、英文没加；改了标题、目录里的锚点全部失效；
 * 同一个术语在两边被翻成两种说法。这些都看不见，只能靠脚本。
 *
 * 本脚本按「可机检」的维度逐项过：
 *
 *   1. 双语配对        Tier A 文档必须中英成对（Tier B 只记 warning）
 *   2. 语言切换入口     成对的两份必须互相链接，且链接方向正确
 *   3. 结构对齐        成对的两份，§编号 / H2 / H3 / 代码块数量必须一致
 *   4. 链接可达        相对链接必须存在（目录链接也算）
 *   5. 锚点可达        `path#frag` 的锚点在目标文档里真实存在
 *   6. 术语统一        glossary 里登记的「禁用译法」不得出现在英文文档中
 *   7. 在线体验链接     指定文档必须同时含两个正式域名，并标注「已上线」
 *   8. 索引覆盖        新增文档必须出现在 docs/README.md 的文档地图里
 *   9. 命名规范        文件名 kebab-case（历史中文文件名只记 warning，不阻塞）
 *
 * 用法：
 *   pnpm check:docs            出错则退出码 1
 *   pnpm check:docs --strict   连 warning 也视为失败
 *
 * 注意：术语表（docs/glossary*.md）自身含有全部禁用译法，扫描时排除。
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const STRICT = process.argv.includes('--strict')

/**
 * Tier A：对外文档。缺英文版 = error，结构不一致 = error。
 * Tier B：工程内部文档（规范 / 明细 / 部署手册）。缺英文版只记 warning 并计数，
 *         但**一旦成对**，就同样受「切换入口 + 结构对齐」约束。
 */
const TIER_A = [
  'README.md',
  'CONTRIBUTING.md',
  'CHANGELOG.md',
  'docs/README.md',
  'docs/glossary.md',
  'docs/guide/README.md',
  'docs/guide/getting-started.md',
  'docs/guide/usage.md',
  'docs/guide/configuration.md',
  'docs/guide/troubleshooting.md',
]

/** 不要求英文版、也不参与配对检查（历史生成物 / 单语言记录） */
const PAIR_EXEMPT = ['CHANGELOG.md', 'docs/audit-report.md']

/** 必须声明在线体验地址（含 www 别名）并标明上线状态的文档 */
const MUST_STATE_ONLINE = [
  'README.md',
  'README.en.md',
  'docs/guide/getting-started.md',
  'docs/guide/getting-started.en.md',
]

const ONLINE_PRIMARY = 'https://006336.xyz/'
const ONLINE_WWW = 'https://www.006336.xyz/'
// 站点已上线：文档必须标注「已上线」，且**不得**再留着「尚未上线」这类旧表述
// （实测两个域名均已 200 可访问，`www` 为主域别名）。
const LIVE_ZH = ['已上线', '可访问']
const LIVE_EN = [
  'is live',
  'now live',
  'already live',
  'has launched',
  'already launched',
  'reachable',
]
const NOT_LIVE_ZH = ['尚未上线', '未上线', '暂未上线', '不可访问']
const NOT_LIVE_EN = ['not yet live', 'not live', 'coming soon', 'not launched', 'unreachable']

const GLOSSARY_FILE = 'docs/glossary.md'

type Level = 'error' | 'warn'
interface Issue {
  level: Level
  file: string
  message: string
}
const issues: Issue[] = []
const err = (file: string, message: string) => issues.push({ level: 'error', file, message })
const warn = (file: string, message: string) => issues.push({ level: 'warn', file, message })

/** 统一成正斜杠相对路径，便于比较与打印 */
const toPosix = (p: string) => p.split(path.sep).join('/')

function walkMarkdown(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walkMarkdown(full, out)
    else if (entry.name.endsWith('.md')) out.push(toPosix(path.relative(ROOT, full)))
  }
  return out
}

const allDocs = [
  ...walkMarkdown(path.join(ROOT, 'docs')),
  ...readdirSync(ROOT)
    .filter((f) => f.endsWith('.md') && !f.startsWith('.'))
    .map((f) => f),
  'deploy/binary/README.md',
].filter((v, i, a) => a.indexOf(v) === i && existsSync(path.join(ROOT, v)))

const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8')
const isEn = (rel: string) => rel.endsWith('.en.md')
const baseOf = (rel: string) => (isEn(rel) ? rel.slice(0, -'.en.md'.length) + '.md' : rel)
const enOf = (rel: string) => rel.slice(0, -'.md'.length) + '.en.md'

// ───────────────────────────────────────────────────────────
// 1. 双语配对
// ───────────────────────────────────────────────────────────
const missingEn: string[] = []

for (const rel of TIER_A) {
  if (PAIR_EXEMPT.includes(rel)) continue
  if (!existsSync(path.join(ROOT, rel))) {
    err(rel, 'Tier A 文档不存在')
    continue
  }
  if (!existsSync(path.join(ROOT, enOf(rel)))) err(rel, `缺少英文版：${enOf(rel)}`)
  if (isEn(rel) && !existsSync(path.join(ROOT, baseOf(rel)))) err(rel, `缺少中文版：${baseOf(rel)}`)
}

for (const rel of allDocs) {
  if (isEn(rel)) continue
  if (PAIR_EXEMPT.includes(rel)) continue
  if (TIER_A.includes(rel)) continue
  if (!existsSync(path.join(ROOT, enOf(rel)))) missingEn.push(rel)
}

// ───────────────────────────────────────────────────────────
// 2. 语言切换入口（成对文档必须互相可达）
// ───────────────────────────────────────────────────────────
const pairs: Array<[string, string]> = []
for (const rel of allDocs) {
  if (isEn(rel)) continue
  const en = enOf(rel)
  if (!existsSync(path.join(ROOT, en))) continue
  pairs.push([rel, en])

  const zhSrc = read(rel)
  const enSrc = read(en)
  if (!zhSrc.includes(path.basename(en))) {
    err(rel, `顶部缺少指向英文版的切换链接（${path.basename(en)}）`)
  }
  if (!enSrc.includes(path.basename(rel))) {
    err(en, `顶部缺少指向中文版的切换链接（${path.basename(rel)}）`)
  }
}

// ───────────────────────────────────────────────────────────
// 3. 结构对齐（§编号 / H2 / H3 / 代码块 / 表格行）
// ───────────────────────────────────────────────────────────
/**
 * 判断标题是否「带编号」。
 * 中文用「一、」，英文用「1.」或「2.1」，个别地方用「①」——三者都算编号，
 * 但同一份文档的编号风格必须两边一致（靠计数比对来发现）。
 */
function isNumberedHeading(line: string): boolean {
  const m = /^#{2,3}\s+(\S+)/.exec(line)
  if (!m) return false
  const head = m[1]!
  return (
    /^[零〇一二三四五六七八九十百]+[、.]/.test(head) ||
    /^\d+(?:\.\d+)*[.\s]/.test(head) ||
    /^[①-⑳]/.test(head)
  )
}

function structure(src: string) {
  const lines = src.split('\n')
  return {
    sections: lines.filter(isNumberedHeading).length,
    h2: lines.filter((l) => /^##\s+\S/.test(l)).length,
    h3: lines.filter((l) => /^###\s+\S/.test(l)).length,
    fences: lines.filter((l) => /^```/.test(l)).length / 2,
    tableRows: lines.filter((l) => l.trim().startsWith('|')).length,
  }
}

for (const [zh, en] of pairs) {
  const a = structure(read(zh))
  const b = structure(read(en))
  // Tier A 结构不一致直接失败；Tier B（历史工程文档）先记为警告并计数，
  // 双语推进可以分批做，但成对之后就必须受「切换入口」约束。
  const report = TIER_A.includes(zh) ? err : warn
  for (const key of ['sections', 'h2', 'h3', 'fences'] as const) {
    if (a[key] !== b[key]) {
      report(en, `结构不对齐：${key} 中文 ${a[key]} / 英文 ${b[key]}（改一边就要同步另一边）`)
    }
  }
  // 表格行数允许少量差异（中英文字宽不同会导致换行位置不同），差超过 20% 才报
  const ratio = a.tableRows === 0 ? 1 : b.tableRows / a.tableRows
  if (ratio < 0.8 || ratio > 1.25) {
    report(en, `表格规模差异过大：中文 ${a.tableRows} 行 / 英文 ${b.tableRows} 行`)
  }
}

// ───────────────────────────────────────────────────────────
// 4/5. 链接与锚点
// ───────────────────────────────────────────────────────────
/** GitHub 风格锚点 + 显式 <a id> 锚点 */
function anchorsOf(rel: string): Set<string> {
  const src = read(rel)
  const set = new Set<string>()
  for (const m of src.matchAll(/<a\s+(?:id|name)=["']([^"']+)["']/g)) set.add(m[1]!)
  for (const line of src.split('\n')) {
    const m = /^#{1,6}\s+(.*)$/.exec(line)
    if (!m) continue
    const slug = m[1]!
      // 先摘掉行内代码/加粗/链接等标记，再算 slug
      .replace(/`([^`]*)`/g, '$1')
      .replace(/\*\*([^*]*)\*\*/g, '$1')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .trim()
      .replace(/\s+/g, '-')
    set.add(slug)
  }
  return set
}

const anchorCache = new Map<string, Set<string>>()
const anchors = (rel: string) => {
  if (!anchorCache.has(rel)) anchorCache.set(rel, anchorsOf(rel))
  return anchorCache.get(rel)!
}

/**
 * 取出所有 Markdown 链接目标（行内 + 引用式）。
 * 先把围栏代码块与行内代码剥掉：文档里常会**示范** Markdown 语法
 * （例如「顶部写 [English](x.en.md)」），那些示例不该被当成真实链接去校验。
 */
function linksOf(src: string): string[] {
  const prose = src.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '')
  const out: string[] = []
  for (const m of prose.matchAll(/\]\(\s*<?([^)>\s]+)>?(?:\s+"[^"]*")?\s*\)/g)) out.push(m[1]!)
  for (const m of prose.matchAll(/^\[[^\]]+\]:\s*(\S+)/gm)) out.push(m[1]!)
  return out
}

for (const rel of allDocs) {
  const dir = path.dirname(path.join(ROOT, rel))
  for (const raw of linksOf(read(rel))) {
    if (/^(https?:|mailto:|tel:)/.test(raw)) continue

    const [target, frag] = raw.split('#')
    if (!target) continue // 纯页内锚点

    const decoded = decodeURIComponent(target)
    const abs = path.resolve(dir, decoded)

    if (!existsSync(abs)) {
      err(rel, `断链：${raw}`)
      continue
    }
    if (!frag) continue
    if (!decoded.endsWith('.md')) continue

    const targetRel = toPosix(path.relative(ROOT, abs))
    let frags: Set<string>
    try {
      frags = anchors(targetRel)
    } catch {
      continue
    }
    if (!frags.has(decodeURIComponent(frag))) {
      err(rel, `锚点不存在：${raw}`)
    }
  }
}

// ───────────────────────────────────────────────────────────
// 6. 术语统一（以 glossary 的「禁用译法」列作为机器可读真源）
// ───────────────────────────────────────────────────────────
interface GlossaryRow {
  zh: string
  en: string
  forbidden: string[]
}
const glossaryRows: GlossaryRow[] = []

if (existsSync(path.join(ROOT, GLOSSARY_FILE))) {
  for (const line of read(GLOSSARY_FILE).split('\n')) {
    const cells = line
      .split('|')
      .map((c) => c.trim())
      .filter((c, i, a) => !(i === 0 && c === '') && !(i === a.length - 1 && c === ''))
    if (cells.length < 4) continue
    if (/^-{2,}/.test(cells[1]!) || cells[0] === '中文') continue
    const forbidden = (cells[3] ?? '')
      .split(/[，,;；]/)
      .map((s) => s.trim())
      .filter((s) => s && s !== '—' && s !== '-')
    glossaryRows.push({ zh: cells[0]!, en: cells[1]!, forbidden })
  }

  for (const rel of allDocs) {
    if (!isEn(rel)) continue
    if (rel.startsWith('docs/glossary')) continue // 术语表自身必然包含这些词
    // 只在正文里查术语，剥掉代码块与行内代码：
    // 否则标识符会被误伤——`ToolPage` 小写化后正是禁用词 `toolpage`。
    const src = read(rel)
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`[^`\n]*`/g, '')
      .toLowerCase()
    // 同样分级：Tier A 术语必须干净；Tier B 的历史措辞先登记为待清理项
    const report = TIER_A.includes(baseOf(rel)) ? err : warn
    for (const row of glossaryRows) {
      for (const bad of row.forbidden) {
        if (src.includes(bad.toLowerCase())) {
          report(rel, `术语不统一：「${bad}」应统一为「${row.en}」（见 ${GLOSSARY_FILE}）`)
        }
      }
    }
  }
} else {
  err(GLOSSARY_FILE, '术语表不存在，无法校验术语统一性')
}

// ───────────────────────────────────────────────────────────
// 7. 在线体验链接 + 上线状态标注
// ───────────────────────────────────────────────────────────
for (const rel of MUST_STATE_ONLINE) {
  if (!existsSync(path.join(ROOT, rel))) continue
  const src = read(rel)
  const lower = src.toLowerCase()
  for (const url of [ONLINE_PRIMARY, ONLINE_WWW]) {
    if (!src.includes(url)) err(rel, `缺少在线体验地址：${url}`)
  }
  const live = isEn(rel) ? LIVE_EN : LIVE_ZH
  if (!live.some((m) => lower.includes(m.toLowerCase()))) {
    err(rel, `未标注「已上线」状态（需出现其一：${live.join(' / ')}）`)
  }
  // 反向断言：站点已上线，文档里若还留着「尚未上线 / 不可访问」就是与实际不符。
  // 只查正向不够——那句话正是这次要清掉的旧口径，漏一处就又是一份误导文档。
  const stale = isEn(rel) ? NOT_LIVE_EN : NOT_LIVE_ZH
  const hit = stale.find((m) => lower.includes(m.toLowerCase()))
  if (hit) err(rel, `站点已上线，但仍残留旧表述「${hit}」——请改写为「已上线」口径`)
}

// ───────────────────────────────────────────────────────────
// 8. 索引覆盖：新文档必须进 docs/README.md 的文档地图
// ───────────────────────────────────────────────────────────
const indexFile = 'docs/README.md'
if (existsSync(path.join(ROOT, indexFile))) {
  const index = read(indexFile)
  for (const rel of allDocs) {
    if (!rel.startsWith('docs/') || rel === indexFile || rel === 'docs/README.en.md') continue
    const fromDocs = rel.slice('docs/'.length)
    const referenced =
      index.includes(fromDocs) ||
      index.includes(fromDocs.replace(/\.en\.md$/, '.md')) ||
      index.includes(path.dirname(fromDocs) + '/')
    if (!referenced) {
      if (TIER_A.includes(rel)) err(rel, `未出现在 ${indexFile} 的文档地图中`)
      else warn(rel, `未出现在 ${indexFile} 的文档地图中`)
    }
  }
}

// ───────────────────────────────────────────────────────────
// 9. 命名规范（kebab-case；历史中文文件名只记 warning）
// ───────────────────────────────────────────────────────────
// 聚合为一条：规范层（docs/spec/11）已经决定「英文文件名」为推荐方案但尚未迁移，
// 逐文件刷 39 行警告只会训练人忽略输出。这里报总数 + 样例 + 迁移清单位置。
// 约定俗成的全大写文件名（社区惯例，保留原名，不参与 kebab-case 校验）
const ALLOW_UPPER =
  /^(README|CONTRIBUTING|CHANGELOG|LICENSE|CODE_OF_CONDUCT|DEVELOPMENT|RELEASE|ARCHITECTURE|SECURITY|SUPPORT)(\.en)?\.md$/
const badNames: string[] = []
for (const rel of allDocs) {
  const name = path.basename(rel)
  if (ALLOW_UPPER.test(name)) continue
  const stem = name.replace(/\.en\.md$/, '').replace(/\.md$/, '')
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(stem)) badNames.push(rel)
}
if (badNames.length) {
  warn(
    '(命名)',
    `${badNames.length} 份历史文档的文件名不是 ASCII kebab-case（例：${badNames
      .slice(0, 3)
      .map((p) => path.basename(p))
      .join(
        '、',
      )}）。文件名用 ASCII、中文名放 H1 与索引表；迁移清单见 docs/spec/11-文档命名规范.md`,
  )
}

// ───────────────────────────────────────────────────────────
// 输出
// ───────────────────────────────────────────────────────────
const errors = issues.filter((i) => i.level === 'error')
const warnings = issues.filter((i) => i.level === 'warn')

const printGroup = (level: Level, title: string, list: Issue[]) => {
  if (!list.length) return
  console.log(`\n${title}`)
  const byFile = new Map<string, string[]>()
  for (const i of list) {
    if (!byFile.has(i.file)) byFile.set(i.file, [])
    byFile.get(i.file)!.push(i.message)
  }
  for (const [file, msgs] of [...byFile].sort()) {
    console.log(`  ${file}`)
    for (const m of msgs) console.log(`      · ${m}`)
  }
  console.log(`  —— 共 ${list.length} 条`)
}

console.log('文档一致性校验 · check:docs')
console.log(
  `  文档 ${allDocs.length} 份（成对 ${pairs.length} 组 / 待补英文 ${missingEn.length} 份）· ` +
    `术语 ${glossaryRows.length} 条`,
)

printGroup('error', `✗ 错误（${errors.length}）`, errors)
printGroup('warn', `⚠ 警告（${warnings.length}）`, warnings)

if (missingEn.length) {
  console.log(`\nℹ 以下 ${missingEn.length} 份工程内部文档尚无英文版（Tier B，不阻塞）：`)
  for (const m of missingEn) console.log(`      · ${m}`)
}

const failed = errors.length > 0 || (STRICT && warnings.length > 0)
console.log(
  failed
    ? `\n✗ 未通过：${errors.length} 个错误${STRICT ? ` / ${warnings.length} 个警告（--strict）` : ''}`
    : `\n✓ 通过：0 个错误${warnings.length ? `，${warnings.length} 个警告` : ''}`,
)
process.exit(failed ? 1 : 0)
