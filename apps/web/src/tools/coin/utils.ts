import { en } from '../../i18n/messages.en'
import { zh } from '../../i18n/messages.zh'
import type { MessageKey } from '../../i18n/messages.zh'
import type { Translate } from '../../i18n'
import type { CoinInput, CoinOptions } from './schema'
import { inputSchema, optionsSchema } from './schema'

/** 单次最多抛掷次数：防止误输入天文数字卡死页面 */
const MAX_FLIP_COUNT = 10000
/** 判定正反面的分界：rand() < 0.5 为正面，否则为反面（均匀） */
const HEADS_THRESHOLD = 0.5

/** mulberry32 常量：0x6D2B79F5 为状态递增步长（黄金比例相关） */
const MULBERRY_INCREMENT = 0x6d2b79f5
const MULBERRY_SHIFT_A = 15
const MULBERRY_SHIFT_B = 7
const MULBERRY_SHIFT_C = 14
const UINT32_RANGE = 4294967296

/** FNV-1a 32 位哈希常量：把字符串压缩成 32 位整数种子 */
const FNV_OFFSET_BASIS = 0x811c9dc5
const FNV_PRIME = 0x01000193

/** 硬币的一面：'heads' = 正面，'tails' = 反面 */
export type CoinSide = 'heads' | 'tails'

type MessageParams = Record<string, string | number>

/** `{name}` 占位符替换（与 i18n.createTranslator 同规则的轻量实现） */
function fill(template: string, params?: MessageParams): string {
  if (params === undefined) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    params[name] === undefined ? match : String(params[name]),
  )
}

/** 双语错误（中文 / English）：文案全部取自 i18n 词典，无硬编码 */
export function bilingualError(key: MessageKey, params?: MessageParams): Error {
  return new Error(fill(zh[key], params) + ' / ' + fill(en[key], params))
}

/** mulberry32 —— 32 位种子 PRNG，相同种子产出相同序列（便于测试确定性） */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + MULBERRY_INCREMENT) | 0
    let mixed = Math.imul(state ^ (state >>> MULBERRY_SHIFT_A), 1 | state)
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> MULBERRY_SHIFT_B), 61 | mixed)) ^ mixed
    return ((mixed ^ (mixed >>> MULBERRY_SHIFT_C)) >>> 0) / UINT32_RANGE
  }
}

/** 字符串 → 32 位无符号整数（FNV-1a 哈希），供 mulberry32 使用 */
export function hashSeed(text: string): number {
  let hash = FNV_OFFSET_BASIS
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, FNV_PRIME)
  }
  return hash >>> 0
}

/** 抛掷次数校验：空 / 非整数 / <1 / 超上限逐项抛双语错误 */
export function parseFlipCount(raw: string): number {
  const s = raw.trim()
  if (s === '') throw bilingualError('coin.error.countEmpty')
  const value = Number(s)
  if (!Number.isInteger(value) || value < 1)
    throw bilingualError('coin.error.countInvalid', { value: s })
  if (value > MAX_FLIP_COUNT)
    throw bilingualError('coin.error.countTooLarge', { max: MAX_FLIP_COUNT })
  return value
}

/**
 * 抛硬币（纯函数，随机源由调用方注入以便测试）。
 * 每次独立按 0.5 分界判定正反面，天然无偏。
 */
export function flipCoins(count: number, rand: () => number): CoinSide[] {
  const sides: CoinSide[] = []
  for (let i = 0; i < count; i += 1) {
    sides.push(rand() < HEADS_THRESHOLD ? 'heads' : 'tails')
  }
  return sides
}

export interface CoinTally {
  readonly heads: number
  readonly tails: number
}

/** 统计正反面次数 */
export function tallySides(sides: readonly CoinSide[]): CoinTally {
  let heads = 0
  let tails = 0
  for (const side of sides) {
    if (side === 'heads') heads += 1
    else tails += 1
  }
  return { heads, tails }
}

export interface CoinOutcome {
  readonly count: number
  readonly sides: readonly CoinSide[]
  readonly tally: CoinTally
}

/** 抛掷计算：次数非法 → 抛双语错误 */
export function flip(input: CoinInput, options: CoinOptions, rand: () => number): CoinOutcome {
  const parsedInput = inputSchema.parse(input)
  optionsSchema.parse(options)
  const count = parseFlipCount(parsedInput.text)
  const sides = flipCoins(count, rand)
  return { count, sides, tally: tallySides(sides) }
}

/** 纯文本版本（复制 / 下载用） */
export function transform(
  input: CoinInput,
  options: CoinOptions,
  rand: () => number,
  t: Translate,
): string {
  const outcome = flip(input, options, rand)
  const sideLabel = (side: CoinSide): string =>
    side === 'heads' ? t('coin.heads') : t('coin.tails')
  const lines = [
    `${t('coin.count')}：${outcome.count}`,
    `${t('coin.result')}：${outcome.sides.map(sideLabel).join('、')}`,
    `${t('coin.headsCount', { count: outcome.tally.heads })}，${t('coin.tailsCount', { count: outcome.tally.tails })}`,
  ]
  return lines.join('\n')
}
