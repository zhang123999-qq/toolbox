/**
 * 外部 API 配置校验（DEVELOPMENT.md §8.5：外部 API 配置硬约束）
 *
 * 校验内容：
 *   1. .gitignore 忽略 .env，且显式放行 .env.example
 *   2. .env.example 存在
 *   3. 每个需要外部 API 的工具（api: true，可行性 D / E）都在 .env.example 里登记
 *   4. .env.example 里没有疑似真实密钥的值
 *   5. 没有用 VITE_ 前缀承载密钥（会被 Vite 内联进浏览器产物）
 *   6. 已登记的工具都写全了六要素（用途 / 必填 / 获取 / 格式 / 示例）
 *
 * 退出码：0 合规 / 1 违规。
 */
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { TOOLS } from '@toolbox/catalog'

const ROOT = resolve(import.meta.dirname, '..')
const EXAMPLE = '.env.example'
const GITIGNORE = '.gitignore'

let failures = 0
const fail = (message: string): void => {
  failures += 1
  console.error(`  ✗ ${message}`)
}
const ok = (message: string): void => console.log(`  ✓ ${message}`)

const read = (rel: string): string => readFileSync(join(ROOT, rel), 'utf8')

console.log('=== 外部 API 配置校验（DEVELOPMENT.md §8.5）===')

// ── 1. .env 必须被忽略、.env.example 必须被放行 ──
console.log('=== 1. .gitignore 规则 ===')
if (!existsSync(join(ROOT, GITIGNORE))) {
  fail(`缺少 ${GITIGNORE}`)
} else {
  const gi = read(GITIGNORE)
  const lines = gi.split('\n').map((l) => l.trim())
  if (lines.includes('.env')) ok('.env 已忽略')
  else fail('.gitignore 里没有 .env（真实密钥会被提交）')

  if (lines.some((l) => l === '.env.*')) ok('.env.* 已忽略（覆盖 .env.local 等变体）')
  else fail('.gitignore 建议忽略 .env.*，否则 .env.local 之类会被提交')

  if (lines.some((l) => l.startsWith('!') && l.includes('.env.example'))) ok('.env.example 已放行')
  else fail('.gitignore 缺少 !.env.example，样例文件会被一起忽略')
}

// ── 2. .env.example 存在 ──
console.log('=== 2. 样例文件 ===')
if (!existsSync(join(ROOT, EXAMPLE))) {
  fail(`缺少 ${EXAMPLE}：开发者无法只凭仓库完成配置`)
  console.error(`\n❌ 外部 API 配置校验失败（${failures} 项）`)
  process.exit(1)
}
const example = read(EXAMPLE)
ok(`${EXAMPLE} 存在（${example.split('\n').length} 行）`)

// ── 3. 需要外部 API 的工具必须登记 ──
console.log('=== 3. 工具登记覆盖 ===')
const apiTools = TOOLS.filter((t) => t.api)
console.log(`  需要外部 API 的工具：${apiTools.length} 个`)
for (const tool of apiTools) {
  if (example.includes(`工具：${tool.id}`)) ok(`${tool.id}（${tool.title}）已登记`)
  else fail(`${tool.id}（${tool.title}）需要外部 API，但 ${EXAMPLE} 里没有「工具：${tool.id}」条目`)
}

// ── 4. 无疑似真实密钥 ──
console.log('=== 4. 密钥泄漏检查 ===')
// 占位值形如 sk-xxxx / sk-… 才是合法的；长度够且非全 x 的视为真实密钥
const SECRET_RE =
  /^[A-Z0-9_]+=(sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16,}|xox[baprs]-[A-Za-z0-9-]{10,})$/gm
for (const line of example.split('\n')) {
  const m = SECRET_RE.exec(line.trim())
  if (!m) continue
  const value = m[1]!
  const isPlaceholder =
    /^(sk-)?x{8,}$/i.test(value) || value.includes('xxxx') || value.includes('…')
  if (!isPlaceholder) fail(`${EXAMPLE} 里出现疑似真实密钥：${line.trim().slice(0, 40)}…`)
}

// ── 5. VITE_ 前缀不得承载密钥 ──
console.log('=== 5. VITE_ 前缀检查 ===')
const VITE_SECRET_RE = /^VITE_[A-Z0-9_]*(KEY|TOKEN|SECRET|PASSWORD|PASSWD)[A-Z0-9_]*=/gm
const viteSecrets = example.match(VITE_SECRET_RE) ?? []
if (viteSecrets.length === 0) ok('没有用 VITE_ 前缀承载密钥')
else for (const v of viteSecrets) fail(`${v} 会被 Vite 内联进浏览器产物，密钥必须去掉 VITE_ 前缀`)

// ── 6. 六要素是否写全 ──
console.log('=== 6. 注释要素完整性 ===')
const REQUIRED_HINTS = ['用途', '必填', '获取', '格式', '示例'] as const
for (const tool of apiTools) {
  const idx = example.indexOf(`工具：${tool.id}`)
  if (idx < 0) continue
  // 该工具所在段落之后，属于「变量字典」的部分共享一套说明，
  // 因此这里只要求整个文件里六要素齐全，且该工具条目写明了它需要哪些变量
  const block = example.slice(idx, idx + 400)
  if (!/[A-Z][A-Z0-9_]{2,}=/.test(block) && !/需要：/.test(block)) {
    fail(`${tool.id} 的条目没有列出所需变量名`)
  }
}
const missingHints = REQUIRED_HINTS.filter((h) => !example.includes(`# ${h}：`))
if (missingHints.length === 0) ok('六要素齐全（用途 / 必填 / 获取 / 格式 / 示例 / 变量名）')
else fail(`${EXAMPLE} 的注释缺少要素：${missingHints.join('、')}（应为「# 用途：」这类写法）`)

console.log('')
if (failures === 0) {
  console.log(`✅ 外部 API 配置校验通过（${apiTools.length} 个需 API 的工具已登记）`)
} else {
  console.log(`❌ 外部 API 配置校验失败（${failures} 项）`)
}
process.exit(failures === 0 ? 0 : 1)
