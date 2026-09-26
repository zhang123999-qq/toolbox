import type { CspConfigInput, CspConfigOptions } from './schema'

const MAX_INPUT = 200_000

/** source 预设 → 指令值 */
export const SRC_VALUE: Record<string, string> = {
  self: "'self'",
  none: "'none'",
  all: '*',
  'self-inline': "'self' 'unsafe-inline'",
  data: "'self' data:",
}

/** 指令名 → 选项 key（顺序固定，便于 diff 与复现） */
export const DIRECTIVES: ReadonlyArray<readonly [string, keyof CspConfigOptions]> = [
  ['default-src', 'defaultSrc'],
  ['script-src', 'scriptSrc'],
  ['style-src', 'styleSrc'],
  ['img-src', 'imgSrc'],
  ['font-src', 'fontSrc'],
  ['connect-src', 'connectSrc'],
  ['frame-src', 'frameSrc'],
  ['media-src', 'mediaSrc'],
  ['object-src', 'objectSrc'],
  ['base-uri', 'baseUri'],
  ['form-action', 'formAction'],
  ['frame-ancestors', 'frameAncestors'],
] as const

/** 校验 source 预设值合法 */
export function assertOptions(options: CspConfigOptions): void {
  for (const [, key] of DIRECTIVES) {
    const value = options[key] as string
    if (!(value in SRC_VALUE)) {
      throw new Error(`指令 ${String(key)} 取值非法：${value}`)
    }
  }
}

/** 构造指令列表 */
export function buildDirectives(options: CspConfigOptions): string[] {
  const directives = DIRECTIVES.map(([name, key]) => `${name} ${SRC_VALUE[options[key] as string]}`)
  if (options.upgradeInsecure) directives.push('upgrade-insecure-requests')
  return directives
}

/** 响应头名：Report-Only 只上报不拦截 */
export function headerName(reportOnly: boolean): string {
  return reportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy'
}

export function transform(input: CspConfigInput, options: CspConfigOptions): string {
  if (input.text === '') return ''
  if (input.text.length > MAX_INPUT)
    throw new Error(`输入超过 ${MAX_INPUT.toLocaleString('en-US')} 字符上限`)
  assertOptions(options)
  const directives = buildDirectives(options)
  return [
    `${headerName(options.reportOnly)}: ${directives.join('; ')}`,
    '',
    '# 可读版本（每条指令一行）',
    ...directives,
  ].join('\n')
}
