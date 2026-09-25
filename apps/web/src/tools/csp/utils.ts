import type { CspInput, CspOptions } from './schema'

/** 输出模式：正式下发 / 仅上报观察 */
export const MODES = ['header', 'report-only'] as const

/** default-src 的基础值 */
export const TARGETS = ['self', 'none'] as const

/** 响应头名字：Report-Only 用的是另一个头，且不会拦截资源 */
export function headerName(mode: string): string {
  if (mode === 'report-only') return 'Content-Security-Policy-Report-Only'
  if (mode === 'header') return 'Content-Security-Policy'
  throw new Error('不支持的模式：' + mode)
}

/** 校验选项：非法取值直接报错，不静默兜底 */
export function assertOptions(options: CspOptions): void {
  if (!(TARGETS as readonly string[]).includes(options.target)) {
    throw new Error('不支持的目标：' + options.target)
  }
  headerName(options.mode)
}

/**
 * 构造指令列表（顺序固定，便于 diff 与复现）。
 *
 * 界面上的选项与 CSP 语义的映射关系：
 * - `strict`（严格模式）→ 限制性指令 `object-src 'none'` / `base-uri 'self'` /
 *   `frame-ancestors 'none'` / `form-action 'self'`，并追加 `upgrade-insecure-requests`
 *   （把页面里残留的 http 子资源强制升级为 https，天然属于「严格」姿态）
 * - `includeLower`（包含小写字母）→ 允许内联脚本：`script-src … 'unsafe-inline'`
 * - `includeUpper`（包含大写字母）→ 允许内联样式：`style-src … 'unsafe-inline'`
 * - `includeNumbers`（包含数字）→ 允许 eval：`script-src … 'unsafe-eval'`
 *
 * i18n 词典里没有「内联脚本 / eval / 升级不安全请求」这些选项名，
 * 只能借这几条通用文案承载，README 里给了完整对照表。
 */
export function buildDirectives(options: CspOptions): string[] {
  const target = options.target === 'none' ? "'none'" : "'self'"
  const script = ["'self'"]
  if (options.includeLower) script.push("'unsafe-inline'")
  if (options.includeNumbers) script.push("'unsafe-eval'")
  const style = ["'self'"]
  if (options.includeUpper) style.push("'unsafe-inline'")

  const directives = [
    `default-src ${target}`,
    `script-src ${script.join(' ')}`,
    `style-src ${style.join(' ')}`,
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    options.strict ? "object-src 'none'" : "object-src 'self'",
  ]
  if (options.strict) {
    directives.push("base-uri 'self'", "frame-ancestors 'none'", "form-action 'self'")
    directives.push('upgrade-insecure-requests')
  } else {
    directives.push("frame-ancestors 'self'")
  }
  return directives
}

/**
 * 输入为空串时返回空串，保持与全站其它 T2 工具一致；
 * 输入任意内容（或点「示例」）即按当前选项生成策略（纯函数，无随机数）。
 */
export function transform(input: CspInput, options: CspOptions): string {
  if (input.text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  assertOptions(options)
  const directives = buildDirectives(options)
  return [
    `${headerName(options.mode)}: ${directives.join('; ')}`,
    '',
    '# 可读版本（每条指令一行）',
    ...directives,
  ].join('\n')
}
