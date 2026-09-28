/**
 * csp-config-ext —— 全局编号 #777
 * 域：extension（浏览器扩展）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 *
 * Manifest V3 扩展 CSP 策略生成与校验：
 * buildCspPolicy 生成 content_security_policy.extension_pages 字符串；
 * validateCsp 校验 MV3 禁止项（远程代码、'unsafe-eval'）。
 * 纯字符串处理，无任何运行时依赖。
 */

export type CspPresetName = 'minimal' | 'development'
export type CspSeverity = 'error' | 'warning'

export interface BuildCspOptions {
  /** script-src 额外来源；'self' 恒为首位，仅允许 'wasm-unsafe-eval' 作为补充 */
  scriptSrc: string[]
  objectSrc?: string
  styleSrc?: string[]
}

export interface CspIssue {
  directive: string
  source: string
  severity: CspSeverity
  message: string
}

export interface CspConfigInput {
  preset?: CspPresetName
  scriptSrc?: string[]
  objectSrc?: string
  styleSrc?: string[]
}

/** MV3 extension_pages 允许的 script-src 来源（'self' 恒定，另见 wasm 宽松项） */
const MV3_ALLOWED_EXTRA_SCRIPT_SOURCES: readonly string[] = ["'wasm-unsafe-eval'"]
const REMOTE_SOURCE_RE = /^https?:\/\//i

export const CSP_PRESET_NAMES: readonly CspPresetName[] = ['minimal', 'development']

export const CSP_PRESETS: Record<CspPresetName, { label: string; policy: string; note: string }> = {
  minimal: {
    label: '最小（推荐）',
    policy: "script-src 'self'; object-src 'self'",
    note: 'MV3 默认推荐：仅允许扩展自身脚本，object-src 锁定自身。',
  },
  development: {
    label: '开发放宽（含 WASM）',
    policy: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'",
    note: '允许 WebAssembly 编译；仍禁止远程代码与 \'unsafe-eval\'，发布前建议回到 minimal。',
  },
}

export function getCspPreset(name: unknown): { label: string; policy: string; note: string } {
  if (name !== 'minimal' && name !== 'development') {
    throw new Error(`未知预设：${String(name)}（可选 ${CSP_PRESET_NAMES.join(' / ')}）`)
  }
  return CSP_PRESETS[name]
}

function assertNonEmptyString(value: unknown, what: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${what}必须是非空字符串`)
  }
  return value.trim()
}

export function buildCspPolicy(opts: BuildCspOptions): string {
  if (!opts || !Array.isArray(opts.scriptSrc)) {
    throw new Error('scriptSrc 必须是数组')
  }
  const script: string[] = ["'self'"]
  for (const s of opts.scriptSrc) {
    const src = assertNonEmptyString(s, 'scriptSrc 来源')
    if (src === "'self'") continue
    if (!MV3_ALLOWED_EXTRA_SCRIPT_SOURCES.includes(src)) {
      throw new Error(
        `MV3 不允许的 script-src 来源：${src}（仅允许 'self' / 'wasm-unsafe-eval'，禁止远程代码与 'unsafe-eval'）`,
      )
    }
    if (!script.includes(src)) script.push(src)
  }
  const objectSrc = opts.objectSrc === undefined ? "'self'" : assertNonEmptyString(opts.objectSrc, 'objectSrc')
  let policy = `script-src ${script.join(' ')}; object-src ${objectSrc}`
  if (opts.styleSrc !== undefined) {
    if (!Array.isArray(opts.styleSrc) || opts.styleSrc.length === 0) {
      throw new Error('styleSrc 提供时必须是非空数组')
    }
    const style = opts.styleSrc.map((s) => assertNonEmptyString(s, 'styleSrc 来源'))
    policy += `; style-src ${style.join(' ')}`
  }
  return policy
}

export function parseCspPolicy(policy: unknown): Record<string, string[]> {
  if (typeof policy !== 'string' || policy.trim() === '') {
    throw new Error('CSP 策略必须是非空字符串')
  }
  const out: Record<string, string[]> = {}
  for (const part of policy.split(';')) {
    const tokens = part.trim().split(/\s+/).filter((t) => t !== '')
    if (tokens.length === 0) continue
    out[tokens[0].toLowerCase()] = tokens.slice(1)
  }
  if (Object.keys(out).length === 0) {
    throw new Error('未解析到任何 CSP 指令')
  }
  return out
}

export function validateCsp(policy: unknown): CspIssue[] {
  const dirs = parseCspPolicy(policy)
  const issues: CspIssue[] = []
  const script = dirs['script-src']
  if (script === undefined) {
    issues.push({
      directive: 'script-src',
      source: '',
      severity: 'error',
      message: "缺少 script-src 指令（MV3 扩展页要求 script-src 'self'）",
    })
  } else {
    for (const s of script) {
      if (REMOTE_SOURCE_RE.test(s)) {
        issues.push({
          directive: 'script-src',
          source: s,
          severity: 'error',
          message: `禁止远程代码：${s}（MV3 扩展不允许加载远程脚本）`,
        })
      } else if (s === "'unsafe-eval'") {
        issues.push({
          directive: 'script-src',
          source: s,
          severity: 'error',
          message: "禁止 'unsafe-eval'（如需 WebAssembly 请改用 'wasm-unsafe-eval'）",
        })
      } else if (s === "'unsafe-inline'") {
        issues.push({
          directive: 'script-src',
          source: s,
          severity: 'warning',
          message: "script-src 不建议使用 'unsafe-inline'（内联脚本在 MV3 扩展页中受限）",
        })
      }
    }
    if (!script.includes("'self'")) {
      issues.push({
        directive: 'script-src',
        source: '',
        severity: 'warning',
        message: "缺少 'self'（扩展自身脚本可能无法执行）",
      })
    }
  }
  if (dirs['object-src'] === undefined) {
    issues.push({
      directive: 'object-src',
      source: '',
      severity: 'warning',
      message: "建议显式声明 object-src 'self'",
    })
  }
  return issues
}

export function parseCspConfigInput(text: string): CspConfigInput {
  if (typeof text !== 'string' || text.trim() === '') {
    throw new Error('输入不能为空')
  }
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('输入不是合法 JSON')
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('输入必须是 JSON 对象')
  }
  const o = raw as Record<string, unknown>
  const out: CspConfigInput = {}
  if (o.preset !== undefined) {
    if (typeof o.preset !== 'string') throw new Error('preset 必须是字符串')
    getCspPreset(o.preset) // 非法预设直接抛错
    out.preset = o.preset as CspPresetName
  }
  if (o.scriptSrc !== undefined) {
    if (!Array.isArray(o.scriptSrc)) throw new Error('scriptSrc 必须是数组')
    out.scriptSrc = o.scriptSrc
  }
  if (o.objectSrc !== undefined) {
    if (typeof o.objectSrc !== 'string') throw new Error('objectSrc 必须是字符串')
    out.objectSrc = o.objectSrc
  }
  if (o.styleSrc !== undefined) {
    if (!Array.isArray(o.styleSrc)) throw new Error('styleSrc 必须是数组')
    out.styleSrc = o.styleSrc
  }
  return out
}

export function renderCspConfig(input: CspConfigInput): string {
  if (input.preset !== undefined) {
    return getCspPreset(input.preset).policy
  }
  return buildCspPolicy({
    scriptSrc: input.scriptSrc ?? [],
    objectSrc: input.objectSrc,
    styleSrc: input.styleSrc,
  })
}

export const EXAMPLE_INPUT: CspConfigInput = { preset: 'minimal' }
