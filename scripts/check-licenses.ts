/**
 * 依赖许可证校验（package.json：pnpm check:licenses）
 *
 * 目的：守住「只使用宽松许可的第三方依赖」这条红线。新增依赖时如果带进来
 * GPL / AGPL / SSPL / BUSL 之类的强传染或商业限制许可，CI 会直接失败。
 *
 * 工作方式：
 *  1. 扫描 node_modules 里**所有已安装包**的 package.json（dev 依赖也算，
 *     它们同样参与本地开发与 CI；本项目是静态站点，运行时不再解析许可）
 *  2. 从各个 workspace 的 package.json 读出直接声明的依赖，违规时标注
 *     「直接 / 传递」，方便定位是谁引入的
 *  3. 按 SPDX 表达式判定：allow / warn / deny，deny 即非零退出
 *
 * 用法：
 *  pnpm check:licenses                    默认：deny 报错，warn 只提示
 *  pnpm check:licenses --strict           warn 也报错
 *  pnpm check:licenses --allow MPL-2.0    个案批准（可重复传）
 *  pnpm check:licenses --json             输出 JSON，供脚本消费
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')

/** 宽松许可：可自由使用、修改、分发，包括闭源商用 */
const ALLOW = new Set([
  'MIT',
  'MIT-0',
  'ISC',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  '0BSD',
  'CC0-1.0',
  'Unlicense',
  'Zlib',
  'BSL-1.0',
  'Python-2.0',
  'BlueOak-1.0.0',
  'PostgreSQL',
  'NCSA',
  'AFL-2.1',
  'AFL-3.0',
  'ECL-2.0',
  'UPL-1.0',
  'CC-BY-3.0',
  'CC-BY-4.0',
  'WTFPL',
])

/**
 * 弱 copyleft / 附条件许可：静态站点这类用途通常没问题，但分发二进制时要看条款，
 * 因此默认只提示、不阻断（`--strict` 下才报错）。
 */
const WARN = new Set([
  'MPL-1.1',
  'MPL-2.0',
  'LGPL-2.1',
  'LGPL-2.1-only',
  'LGPL-2.1-or-later',
  'LGPL-3.0',
  'LGPL-3.0-only',
  'LGPL-3.0-or-later',
  'EPL-1.0',
  'EPL-2.0',
  'CDDL-1.0',
  'OSL-3.0',
])

/** 与许可证条款无关、只是没写清楚的取值，统一归为「未知」 */
const UNKNOWN = 'UNKNOWN'

/**
 * 已批准的例外：仅对 WARN 级别生效，**不能**用来放行 GPL / AGPL 这类 DENY。
 * 登记时必须写清理由，改动走 PR 审查。
 *
 * 下面两个都是构建 / 测试期依赖，代码不会进入对外分发的静态产物：
 *  - axe-core：无障碍检查，只在组件测试里跑
 *  - lightningcss：Tailwind v4 的 CSS 编译期依赖
 * MPL-2.0 是**文件级** copyleft——使用与链接不传染，只有修改其源码才需开源该文件，
 * 因此本项目的使用方式不受影响。
 */
const APPROVED_EXCEPTIONS: Array<{ name: string; reason: string }> = [
  { name: 'axe-core', reason: '测试期无障碍检查，不进分发产物；MPL-2.0 仅约束源码修改' },
  { name: 'lightningcss', reason: '构建期 CSS 编译，不进分发产物；MPL-2.0 仅约束源码修改' },
]
/** 例外按「包名 + 其平台子包」匹配：lightningcss 同时覆盖 lightningcss-win32-x64-msvc */
function isApproved(name: string): boolean {
  return APPROVED_EXCEPTIONS.some((e) => name === e.name || name.startsWith(`${e.name}-`))
}

type Verdict = 'allow' | 'warn' | 'deny'

interface Pkg {
  name: string
  version: string
  /** 原始 license 字段，用于展示 */
  raw: string
  verdict: Verdict
  /** 判定依据（哪个 token 决定了结论） */
  reason: string
  direct: boolean
}

const argv = process.argv.slice(2)
const strict = argv.includes('--strict')
const asJson = argv.includes('--json')
const extraAllow = new Set(
  argv.flatMap((a, i) => (a === '--allow' && argv[i + 1] ? [argv[i + 1]] : [])),
)

/** 判定单个 SPDX token */
function verdictOf(token: string): Verdict {
  // "Apache-2.0 WITH LLVM-exception" → 只看主许可；"+"/"or-later" 归一到基础版本
  let t = token
    .trim()
    .replace(/\s+WITH\s+.*$/i, '')
    .replace(/\+$/, '')
  t = t.replace(/-or-later$/, '')
  if (ALLOW.has(t) || extraAllow.has(t)) return 'allow'
  if (WARN.has(t)) return 'warn'
  return 'deny'
}

/**
 * 判定一个 SPDX 表达式：
 *  OR 取最宽松的一支，AND 取最严格的一支，括号仅作分组。
 */
function evaluate(expr: string): { verdict: Verdict; reason: string } {
  const normalized = expr.trim()
  // "SEE LICENSE IN xxx" 这类无法静态判定的写法，一律当作未知
  if (!normalized || /^SEE LICENSE IN/i.test(normalized)) {
    return { verdict: 'deny', reason: UNKNOWN }
  }

  const branches = normalized.split(/\s+OR\s+/i)
  let best: { verdict: Verdict; reason: string } = { verdict: 'deny', reason: normalized }
  for (const branch of branches) {
    const tokens = branch
      .replace(/[()]/g, ' ')
      .split(/\s+AND\s+/i)
      .map((t) => t.trim())
      .filter(Boolean)
    let worst: Verdict = 'allow'
    let reason = branch.trim()
    for (const token of tokens) {
      const v = verdictOf(token)
      if (v === 'deny') {
        worst = 'deny'
        reason = token
        break
      }
      if (v === 'warn') {
        worst = 'warn'
        reason = token
      }
    }
    if (worst === 'allow') return { verdict: 'allow', reason }
    if (worst === 'warn' && best.verdict === 'deny') best = { verdict: 'warn', reason }
  }
  return best
}

/** 从 package.json 的 license / licenses 字段提取表达式字符串 */
function readLicenseField(raw: unknown): string {
  if (typeof raw === 'string') return raw
  if (raw && typeof raw === 'object' && 'type' in raw) {
    const t = (raw as { type?: unknown }).type
    if (typeof t === 'string') return t
  }
  if (Array.isArray(raw)) {
    // 旧格式：licenses: [{ type: 'MIT' }]
    return raw
      .map((item) => (item && typeof item === 'object' && 'type' in item ? String(item.type) : ''))
      .filter(Boolean)
      .join(' AND ')
  }
  return ''
}

function safeJson(file: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>
  } catch {
    return null
  }
}

/** pnpm 布局：node_modules/.pnpm/<name>@<ver>/node_modules/<...>/package.json */
function collectFromPnpm(base: string, out: string[]): boolean {
  const store = join(base, '.pnpm')
  if (!existsSync(store)) return false
  for (const entry of readdirSync(store)) {
    const inner = join(store, entry, 'node_modules')
    if (!existsSync(inner)) continue
    for (const child of readdirSync(inner)) {
      if (child.startsWith('@')) {
        for (const scoped of readdirSync(join(inner, child))) {
          out.push(join(inner, child, scoped, 'package.json'))
        }
      } else {
        out.push(join(inner, child, 'package.json'))
      }
    }
  }
  return true
}

/** npm / yarn 布局回退：node_modules/<name> 与 node_modules/@scope/<name> */
function collectFlat(base: string, out: string[]): void {
  if (!existsSync(base)) return
  for (const child of readdirSync(base)) {
    if (child === '.pnpm' || child.startsWith('.')) continue
    if (child.startsWith('@')) {
      for (const scoped of readdirSync(join(base, child))) {
        out.push(join(base, child, scoped, 'package.json'))
      }
    } else {
      out.push(join(base, child, 'package.json'))
    }
  }
}

/** 收集所有 workspace 直接声明的依赖名 */
function collectDirectNames(): Set<string> {
  const names = new Set<string>()
  const manifests = [
    join(ROOT, 'package.json'),
    join(ROOT, 'apps', 'web', 'package.json'),
    join(ROOT, 'packages', 'catalog', 'package.json'),
    join(ROOT, 'packages', 'search', 'package.json'),
  ]
  for (const file of manifests) {
    const json = safeJson(file)
    if (!json) continue
    for (const field of ['dependencies', 'devDependencies'] as const) {
      const deps = json[field]
      if (deps && typeof deps === 'object') {
        for (const name of Object.keys(deps as Record<string, unknown>)) names.add(name)
      }
    }
  }
  return names
}

function main(): void {
  const nodeModules = join(ROOT, 'node_modules')
  const files: string[] = []
  const usedPnpm = collectFromPnpm(nodeModules, files)
  if (!usedPnpm) collectFlat(nodeModules, files)

  const directNames = collectDirectNames()
  const pkgs: Pkg[] = []
  const malformed: string[] = []
  // pnpm 会为不同 peer 组合建多份条目，同一个 name@version 只需判一次
  const seen = new Set<string>()
  let approved = 0

  for (const file of files) {
    if (!existsSync(file)) continue
    const json = safeJson(file)
    if (!json) {
      malformed.push(file)
      continue
    }
    const name = typeof json.name === 'string' ? json.name : ''
    // 本仓库自己的 workspace 包不参与校验
    if (!name || name.startsWith('@toolbox/')) continue
    const version = typeof json.version === 'string' ? json.version : '0.0.0'
    const key = `${name}@${version}`
    if (seen.has(key)) continue
    seen.add(key)

    const raw = readLicenseField(json.license ?? json.licenses)
    const { verdict, reason } = evaluate(raw)
    // 例外只降级 warn → allow，deny 不可绕过
    const final: Verdict = verdict === 'warn' && isApproved(name) ? 'allow' : verdict
    if (verdict === 'warn' && final === 'allow') approved += 1
    pkgs.push({
      name,
      version,
      raw: raw || '(未声明)',
      verdict: final,
      reason,
      direct: directNames.has(name),
    })
  }

  pkgs.sort((a, b) => a.name.localeCompare(b.name))

  const denied = pkgs.filter((p) => p.verdict === 'deny')
  const warned = pkgs.filter((p) => p.verdict === 'warn')

  if (asJson) {
    console.log(
      JSON.stringify(
        { total: pkgs.length, denied: denied.length, warned: warned.length, packages: pkgs },
        null,
        2,
      ),
    )
  } else {
    console.log('=== 依赖许可证校验 ===')
    console.log(`  扫描 ${pkgs.length} 个已安装包（布局：${usedPnpm ? 'pnpm' : 'flat'}）`)
    if (malformed.length) {
      console.log(`  · ${malformed.length} 个 package.json 无法解析（已跳过）`)
    }
    if (approved) {
      console.log(
        `  · ${approved} 个包命中已批准例外（脚本内 APPROVED_EXCEPTIONS，仅对 warn 生效）`,
      )
    }

    const byLicense = new Map<string, number>()
    for (const p of pkgs) byLicense.set(p.raw, (byLicense.get(p.raw) ?? 0) + 1)
    const top = [...byLicense.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
    console.log('\n=== 许可证分布（Top 10）===')
    for (const [license, count] of top) {
      console.log(`  ${String(count).padStart(5)}  ${license}`)
    }

    if (denied.length) {
      console.log(`\n=== ✗ 拒绝的许可（${denied.length}）===`)
      for (const p of denied) {
        console.log(`  ✗ ${p.name}@${p.version}  ${p.raw}  [${p.direct ? '直接依赖' : '传递依赖'}]`)
      }
      console.log('\n  处理：换用宽松许可的替代品，或用 --allow <SPDX> 逐案批准并在 PR 说明理由。')
    }

    if (warned.length) {
      console.log(`\n=== ⚠ 需人工确认（${warned.length}）===`)
      for (const p of warned) {
        console.log(`  ⚠ ${p.name}@${p.version}  ${p.raw}  [${p.direct ? '直接依赖' : '传递依赖'}]`)
      }
    }
  }

  const blocking = denied.length > 0 || (strict && warned.length > 0)
  if (!asJson) {
    console.log('\n=== 结果 ===')
    if (blocking) {
      console.error(
        `✗ 失败：${denied.length} 个拒绝${strict ? ` / ${warned.length} 个需确认（--strict）` : ''}`,
      )
    } else {
      console.log(
        `✓ 通过：${pkgs.length} 个包，0 个拒绝` +
          (warned.length ? `，${warned.length} 个需确认（未启用 --strict）` : ''),
      )
    }
  }
  process.exit(blocking ? 1 : 0)
}

main()
