import type { Translate } from '../../i18n'
import type { NumberFormatInput, NumberFormatOptions } from './schema'

/** 输入字符上限（与 schema 的 max 保持一致） */
const MAX_INPUT_LENGTH = 200000

/** 格式化所用的固定 locale，保证输出在各环境一致 */
const FORMAT_LOCALE = 'zh-CN'

/** 解析单个数字 token：非有限数（NaN / Infinity / 非数字串）一律走 i18n 报错 */
export function parseNumberToken(token: string, t: Translate): number {
  const trimmed = token.trim()
  const n = Number(trimmed)
  if (trimmed === '' || !Number.isFinite(n)) {
    throw new Error(t('numberFormat.error.invalid', { value: token }))
  }
  return n
}

/** 按模式构造 Intl.NumberFormat：decimal / percent / scientific */
export function buildFormatter(
  mode: NumberFormatOptions['mode'],
  grouping: boolean,
  decimals: number,
): Intl.NumberFormat {
  const common = {
    useGrouping: grouping,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }
  if (mode === 'percent')
    return new Intl.NumberFormat(FORMAT_LOCALE, { ...common, style: 'percent' })
  if (mode === 'scientific') {
    return new Intl.NumberFormat(FORMAT_LOCALE, { ...common, notation: 'scientific' })
  }
  return new Intl.NumberFormat(FORMAT_LOCALE, { ...common, style: 'decimal' })
}

/** T2 同步入口：每行一个数字，空行跳过；错误信息经 i18n 双语输出 */
export function transform(
  input: NumberFormatInput,
  options: NumberFormatOptions,
  t: Translate,
): string {
  if (input.text.trim() === '') return ''
  if (input.text.length > MAX_INPUT_LENGTH) throw new Error(t('numberFormat.error.tooLong'))

  const mode = options.mode ?? 'decimal'
  const grouping = options.grouping ?? true
  const decimals = Number(options.decimals ?? '2')
  const formatter = buildFormatter(mode, grouping, decimals)

  const lines = input.text.split('\n')
  const out: string[] = []
  for (const line of lines) {
    if (line.trim() === '') continue
    out.push(formatter.format(parseNumberToken(line, t)))
  }
  return out.join('\n')
}
