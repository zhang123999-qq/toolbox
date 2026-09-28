export interface LocaleOption {
  readonly code: string
  readonly label: string
}

/** 内置常用语言区域（与 date-locale 同一份列表） */
export const LOCALES: LocaleOption[] = [
  { code: 'zh-CN', label: '简体中文（中国大陆）' },
  { code: 'zh-TW', label: '繁体中文（台湾）' },
  { code: 'zh-HK', label: '繁体中文（香港）' },
  { code: 'en-US', label: '英语（美国）' },
  { code: 'en-GB', label: '英语（英国）' },
  { code: 'en-IN', label: '英语（印度， lakh/crore 分组）' },
  { code: 'ja-JP', label: '日语' },
  { code: 'ko-KR', label: '韩语' },
  { code: 'ar-SA', label: '阿拉伯语（沙特）' },
  { code: 'ar-EG', label: '阿拉伯语（埃及，阿拉伯-印度数字）' },
  { code: 'he-IL', label: '希伯来语' },
  { code: 'de-DE', label: '德语' },
  { code: 'fr-FR', label: '法语' },
  { code: 'es-ES', label: '西班牙语' },
  { code: 'it-IT', label: '意大利语' },
  { code: 'pt-BR', label: '葡萄牙语（巴西）' },
  { code: 'ru-RU', label: '俄语' },
  { code: 'th-TH', label: '泰语' },
  { code: 'vi-VN', label: '越南语' },
  { code: 'id-ID', label: '印尼语' },
  { code: 'hi-IN', label: '印地语（天城文数字）' },
  { code: 'fa-IR', label: '波斯语（扩展阿拉伯-印度数字）' },
]

export interface NumberLocaleResult {
  readonly locale: string
  readonly label: string
  readonly decimal: string
  readonly percent: string
  readonly compact: string
}

/** 解析逗号分隔的 locale 列表：大小写不敏感、去重；未知代码抛中文错 */
export function resolveLocales(input: string): LocaleOption[] {
  const codes = input
    .split(/[,\s，、]+/)
    .map((s) => s.trim())
    .filter((s) => s !== '')
  if (codes.length === 0) throw new Error('请至少选择一个语言区域')
  const out: LocaleOption[] = []
  for (const c of codes) {
    const key = c.toLowerCase()
    const opt = LOCALES.find((l) => l.code.toLowerCase() === key)
    if (!opt) throw new Error(`未知语言区域：${c}`)
    if (!out.some((o) => o.code === opt.code)) out.push(opt)
  }
  return out
}

function parseNumberInput(numInput: string): number {
  const text = numInput.trim()
  if (text === '') throw new Error('请输入数字')
  const n = Number(text)
  if (!Number.isFinite(n)) throw new Error(`无法解析数字：${text}`)
  return n
}

/**
 * 同一数字在多个语言区域下的并排本地化展示（Intl.NumberFormat 真实调用）。
 * 与 number-format（千分位/百分比/科学计数法）差异化：本工具做多 locale 对比。
 */
export function formatNumberLocales(numInput: string, localesInput: string): NumberLocaleResult[] {
  const n = parseNumberInput(numInput)
  return resolveLocales(localesInput).map((opt) => ({
    locale: opt.code,
    label: opt.label,
    decimal: new Intl.NumberFormat(opt.code).format(n),
    percent: new Intl.NumberFormat(opt.code, {
      style: 'percent',
      maximumFractionDigits: 2,
    }).format(n),
    compact: new Intl.NumberFormat(opt.code, { notation: 'compact' }).format(n),
  }))
}

/** 本地化结果格式化为文本 */
export function formatNumberLocaleResults(results: NumberLocaleResult[]): string {
  const lines: string[] = []
  for (const r of results) {
    lines.push(`[${r.label} | ${r.locale}]`)
    lines.push(`十进制：${r.decimal}`)
    lines.push(`百分比：${r.percent}`)
    lines.push(`紧凑表示：${r.compact}`)
    lines.push('')
  }
  return lines.join('\n').trimEnd()
}
