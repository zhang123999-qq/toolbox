import type { RandomPasswordInput, RandomPasswordOptions } from './schema'

/** 四类字符集；符号里刻意去掉引号、反斜杠与空格，避免复制粘贴时被 shell/配置转义 */
export const CLASSES = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  numbers: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{}<>?/~',
} as const

/** 易混淆字符：勾选「排除易混淆字符」后剔除（I/l/1、O/o/0） */
export const AMBIGUOUS = 'Il1O0o'

/** 长度合法区间 */
export const MIN_LENGTH = 8
export const MAX_LENGTH = 128

/** 取加密安全随机源；环境不支持时抛中文错 */
function getCrypto(): Crypto {
  const c = globalThis.crypto
  if (!c?.getRandomValues) {
    throw new Error('当前环境不支持 crypto.getRandomValues，无法安全生成密码')
  }
  return c
}

/**
 * 无偏取整：从 [0, maxExclusive) 均匀取一个整数。
 * 用拒绝采样（rejection sampling）剔除末段越界值，消除直接取模带来的偏差。
 * maxExclusive <= 256 时单字节足够（本工具字符集长度均远小于 256）。
 */
export function secureRandomIndex(maxExclusive: number): number {
  if (maxExclusive <= 0) throw new Error('字符集不能为空')
  const c = getCrypto()
  const limit = Math.floor(256 / maxExclusive) * maxExclusive
  const buf = new Uint8Array(1)
  let value: number
  do {
    c.getRandomValues(buf)
    value = buf[0]
  } while (value >= limit)
  return value % maxExclusive
}

/** 从字符集中剔除易混淆字符 */
export function filterAmbiguous(charset: string): string {
  return [...charset].filter((ch) => !AMBIGUOUS.includes(ch)).join('')
}

/** 按勾选情况给出启用中的字符类（每类一段，保证每类至少出现一个字符） */
export function buildCharsets(options: RandomPasswordOptions): string[] {
  const lists: string[] = []
  if (options.includeLower) lists.push(CLASSES.lower)
  if (options.includeUpper) lists.push(CLASSES.upper)
  if (options.includeNumbers) lists.push(CLASSES.numbers)
  if (options.includeSymbols) lists.push(CLASSES.symbols)
  const filtered = options.noAmbiguous ? lists.map(filterAmbiguous) : lists
  return filtered.filter((list) => list.length > 0)
}

/** 解析长度选项：须为 8–128 的整数，否则抛中文错 */
export function parseLength(raw: string): number {
  const value = raw.trim()
  if (!/^\d+$/.test(value)) {
    throw new Error('密码长度必须是整数')
  }
  const n = Number(value)
  if (n < MIN_LENGTH || n > MAX_LENGTH) {
    throw new Error(`密码长度必须在 ${MIN_LENGTH} 到 ${MAX_LENGTH} 之间`)
  }
  return n
}

/** 从字符集里无偏取一个字符 */
function pickFrom(charset: string): string {
  return charset[secureRandomIndex(charset.length)]
}

/** Fisher–Yates 原地洗牌：保证「每类至少一个」不会全堆在开头 */
function shuffle(items: string[]): void {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = secureRandomIndex(i + 1)
    const tmp = items[i]
    items[i] = items[j]
    items[j] = tmp
  }
}

/** 生成一个随机密码：每个启用的字符类至少出现一个，其余从合并池无偏抽取后洗牌 */
export function generatePassword(options: RandomPasswordOptions): string {
  const length = parseLength(options.length)
  const charsets = buildCharsets(options)
  if (charsets.length === 0) {
    throw new Error('至少勾选一类字符（小写 / 大写 / 数字 / 符号）')
  }
  if (length < charsets.length) {
    throw new Error('长度不足以让每个字符类至少出现一次')
  }
  const pool = charsets.join('')
  const chars: string[] = charsets.map((charset) => pickFrom(charset))
  while (chars.length < length) chars.push(pickFrom(pool))
  shuffle(chars)
  return chars.join('')
}

/**
 * T2 入口：输入框留空返回空串（不在预渲染期烘焙随机密码）；
 * 输入任意内容（或点「示例」）即触发生成。
 */
export function transform(input: RandomPasswordInput, options: RandomPasswordOptions): string {
  if (input.text === '') return ''
  return generatePassword(options)
}
