import type { Translate } from '../../i18n'
import { inputSchema, optionsSchema } from './schema'
import type { BulkPasswordInput, BulkPasswordOptions } from './schema'

/**
 * 单次最多生成的条数：性能边界。
 * 10000 条 × 32 字符在主流机器上 < 1 秒；再大则输出区渲染与复制成为瓶颈，
 * 故设此上限并在页面与 README 说明。
 */
export const MAX_COUNT = 10000

/** 可选的单条长度（与「随机密码」工具一致，便于用户迁移心智） */
export const LENGTHS = ['8', '12', '16', '24', '32'] as const

/**
 * 四类字符集；符号里刻意去掉了引号、反斜杠与空格，避免复制粘贴时被 shell/配置转义。
 * （与 password-generator 的字符集定义一致，但按「工具间禁 import」各自持有。）
 */
export const CLASSES = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  numbers: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{}<>?/~',
} as const

/**
 * 安全随机源：crypto.getRandomValues（CSPRNG）。
 * 不可用时抛双语错误——密码场景不静默降级为 Math.random，那等于安全降级。
 */
export function secureRandom(t: Translate): number {
  const source = globalThis.crypto
  if (!source?.getRandomValues) {
    throw new Error(t('error.cryptoUnavailable'))
  }
  const buffer = new Uint32Array(1)
  source.getRandomValues(buffer)
  return buffer[0] / 0x100000000
}

/** 解析生成条数：须为 1–MAX_COUNT 的整数 */
export function parseCount(raw: string, t: Translate): number {
  const value = raw.trim()
  if (!/^\d+$/.test(value)) {
    throw new Error(t('bulkPassword.error.invalidCount', { value: raw, max: String(MAX_COUNT) }))
  }
  const count = Number(value)
  if (count < 1 || count > MAX_COUNT) {
    throw new Error(t('bulkPassword.error.invalidCount', { value: raw, max: String(MAX_COUNT) }))
  }
  return count
}

/** 解析单条长度：非法取值直接报错，不静默兜底 */
export function parseLength(raw: string, t: Translate): number {
  if ((LENGTHS as readonly string[]).includes(raw)) return Number(raw)
  throw new Error(t('bulkPassword.error.invalidLength', { value: raw }))
}

/** 按勾选组装字符集；一个都没选抛双语错误 */
export type CharsetSelection = Pick<
  BulkPasswordOptions,
  'includeLower' | 'includeUpper' | 'includeNumbers' | 'includeSymbols'
>

export function buildCharset(selection: CharsetSelection, t: Translate): string {
  let charset = ''
  if (selection.includeLower) charset += CLASSES.lower
  if (selection.includeUpper) charset += CLASSES.upper
  if (selection.includeNumbers) charset += CLASSES.numbers
  if (selection.includeSymbols) charset += CLASSES.symbols
  if (charset === '') throw new Error(t('bulkPassword.error.noCharset'))
  return charset
}

/** 批量生成：每条从字符集等概率取字符 */
export function generatePasswords(
  count: number,
  length: number,
  charset: string,
  t: Translate,
  rand: () => number = () => secureRandom(t),
): string[] {
  const out: string[] = []
  for (let i = 0; i < count; i++) {
    let password = ''
    for (let j = 0; j < length; j++) {
      password += charset[Math.floor(rand() * charset.length)]
    }
    out.push(password)
  }
  return out
}

/**
 * T2 同步入口：每行一条密码。
 * 输入框只作触发用：为空返回空串（不进入错误态），非空即生成。
 */
export function transform(
  input: BulkPasswordInput,
  options: BulkPasswordOptions,
  t: Translate,
  rand: () => number = () => secureRandom(t),
): string {
  const parsedInput = inputSchema.parse(input)
  if (parsedInput.text.trim() === '') return ''
  const parsedOptions = optionsSchema.parse(options)
  const count = parseCount(parsedOptions.count, t)
  const length = parseLength(parsedOptions.length, t)
  const charset = buildCharset(parsedOptions, t)
  return generatePasswords(count, length, charset, t, rand).join('\n')
}
