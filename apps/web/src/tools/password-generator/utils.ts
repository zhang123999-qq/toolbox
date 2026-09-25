import type { PasswordInput, PasswordOptions } from './schema'

/**
 * 随机源：返回 [0, 1) 的浮点数。
 * 默认实现走 crypto.getRandomValues（CSPRNG）；单测传入确定性实现即可断言格式与字符集。
 */
export type RandomSource = () => number

/** 四类字符集；符号里刻意去掉了引号、反斜杠与空格，避免复制粘贴时被 shell/配置转义 */
export const CLASSES = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  numbers: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{}<>?/~',
} as const

/** 易混字符：勾选「排除易混字符」后从字符集里剔除（大写 i / 小写 l / 数字 1、0 与 大 O 小 o） */
export const AMBIGUOUS = 'Il1O0o'

/** 可选长度 */
export const LENGTHS = ['8', '12', '16', '24', '32'] as const

/** 默认随机源：CSPRNG。注意它是函数，模块加载与渲染期都不会被调用 */
export function secureRandom(): number {
  const source = globalThis.crypto
  if (!source?.getRandomValues) {
    throw new Error('当前环境不支持 crypto.getRandomValues，无法安全生成密码')
  }
  const buffer = new Uint32Array(1)
  source.getRandomValues(buffer)
  return buffer[0] / 0x100000000
}

/** 剔除易混字符 */
export function filterAmbiguous(charset: string): string {
  return [...charset].filter((char) => !AMBIGUOUS.includes(char)).join('')
}

/** 按勾选情况给出启用中的字符集列表（每类一段，供「每类至少一个」使用） */
export function buildCharsets(options: PasswordOptions): string[] {
  const lists: string[] = []
  if (options.includeLower) lists.push(CLASSES.lower)
  if (options.includeUpper) lists.push(CLASSES.upper)
  if (options.includeNumbers) lists.push(CLASSES.numbers)
  if (options.includeSymbols) lists.push(CLASSES.symbols)
  return options.noAmbiguous ? lists.map((list) => filterAmbiguous(list)) : lists
}

/** 从字符集里等概率取一个字符 */
function pick(charset: string, rng: RandomSource): string {
  const index = Math.min(Math.floor(rng() * charset.length), charset.length - 1)
  return charset[index] ?? charset[0]
}

/** Fisher–Yates 原地洗牌：保证「每类至少一个」不会全被排在开头 */
function shuffle(items: string[], rng: RandomSource): string[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.min(Math.floor(rng() * (i + 1)), i)
    const swap = items[i]
    items[i] = items[j]
    items[j] = swap
  }
  return items
}

/** 解析长度选项；非法取值直接报错，不静默兜底 */
export function parseLength(value: string): number {
  if (!(LENGTHS as readonly string[]).includes(value)) {
    throw new Error('不支持的长度：' + value)
  }
  return Number(value)
}

/** 生成随机密码 */
export function generatePassword(
  options: PasswordOptions,
  rng: RandomSource = secureRandom,
): string {
  const length = parseLength(options.length)
  const charsets = buildCharsets(options)
  if (charsets.length === 0) {
    throw new Error('至少勾选一类字符（小写 / 大写 / 数字 / 符号）')
  }
  if (options.eachClass && length < charsets.length) {
    throw new Error('长度不足以让每个字符类至少出现一次')
  }
  const pool = charsets.join('')
  const chars: string[] = []
  if (options.eachClass) {
    for (const charset of charsets) chars.push(pick(charset, rng))
  }
  while (chars.length < length) chars.push(pick(pool, rng))
  return shuffle(chars, rng).join('')
}

/**
 * 输入为空串时返回空串，**不会**调用随机源——
 * 这样 SSG 预渲染与首次进入页面都不会烘焙出随机密码。
 * 输入任意内容（或点「示例」）即视为触发一次生成。
 */
export function transform(
  input: PasswordInput,
  options: PasswordOptions,
  rng: RandomSource = secureRandom,
): string {
  if (input.text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  return generatePassword(options, rng)
}
