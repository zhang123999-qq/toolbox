import { en } from '../../i18n/messages.en'
import { zh } from '../../i18n/messages.zh'
import type { MessageKey } from '../../i18n/messages.zh'
import type { Translate } from '../../i18n'
import type { LotteryInput, LotteryOptions } from './schema'
import { inputSchema, optionsSchema } from './schema'

/** 单次最多抽取人数：防止误输入天文数字导致内存爆炸 */
const MAX_LOTTERY_COUNT = 10000

/** mulberry32 常量：0x6D2B79F5 为状态递增步长（黄金比例相关） */
const MULBERRY_INCREMENT = 0x6d2b79f5
const MULBERRY_SHIFT_A = 15
const MULBERRY_SHIFT_B = 7
const MULBERRY_SHIFT_C = 14
const UINT32_RANGE = 4294967296

/** FNV-1a 32 位哈希常量：把字符串压缩成 32 位整数种子 */
const FNV_OFFSET_BASIS = 0x811c9dc5
const FNV_PRIME = 0x01000193

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

/** 名单解析：按行切分，去首尾空白，丢弃空行；重复名字按独立条目保留 */
export function parseNames(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
}

/**
 * 抽取人数校验：空 / 非整数 / 负数 / 超上限逐项抛双语错误；
 * 0 合法（返回空名单，不报错）。
 */
export function parseDrawCount(raw: string): number {
  const s = raw.trim()
  if (s === '') throw bilingualError('lottery.error.countEmpty')
  const value = Number(s)
  if (!Number.isInteger(value)) throw bilingualError('lottery.error.countInvalid', { value: s })
  if (value < 0) throw bilingualError('lottery.error.countNegative')
  if (value > MAX_LOTTERY_COUNT)
    throw bilingualError('lottery.error.countTooLarge', { max: MAX_LOTTERY_COUNT })
  return value
}

/**
 * 核心抽签（纯函数，随机源由调用方注入以便测试）。
 * - 有放回：每次独立均匀取索引，同一人可重复中奖；
 * - 不放回：Fisher–Yates 部分洗牌后取前 count 个，天然无偏；
 *   人数 > 名单人数时抛错。
 */
export function drawWinners(
  names: readonly string[],
  count: number,
  withReplacement: boolean,
  rand: () => number,
): string[] {
  const n = names.length
  if (withReplacement) {
    const winners: string[] = []
    for (let i = 0; i < count; i += 1) {
      winners.push(names[Math.floor(rand() * n)])
    }
    return winners
  }
  if (count > n) {
    throw bilingualError('lottery.error.countExceeds', { count, total: n })
  }
  const pool = names.slice()
  for (let i = 0; i < count; i += 1) {
    const j = i + Math.floor(rand() * (n - i))
    const tmp = pool[i]
    pool[i] = pool[j]
    pool[j] = tmp
  }
  return pool.slice(0, count)
}

export interface LotteryResult {
  readonly poolSize: number
  readonly count: number
  readonly withReplacement: boolean
  readonly winners: readonly string[]
}

/**
 * 抽签计算：名单留空返回 null（上层渲染空态，不报错）。
 * 抽取人数非法 / 不放回且人数超名单 → 抛双语错误。
 */
export function draw(
  input: LotteryInput,
  options: LotteryOptions,
  rand: () => number,
): LotteryResult | null {
  const parsedInput = inputSchema.parse(input)
  const parsedOptions = optionsSchema.parse(options)
  const names = parseNames(parsedInput.text)
  if (names.length === 0) return null
  const count = parseDrawCount(parsedInput.count)
  const winners = drawWinners(names, count, parsedOptions.withReplacement, rand)
  return {
    poolSize: names.length,
    count,
    withReplacement: parsedOptions.withReplacement,
    winners,
  }
}

/** 纯文本版本（复制 / 下载用）；名单留空 → 空串 */
export function transform(
  input: LotteryInput,
  options: LotteryOptions,
  rand: () => number,
  t: Translate,
): string {
  const result = draw(input, options, rand)
  if (result === null) return ''
  const lines = [
    `${t('lottery.pool')}：${result.poolSize}`,
    `${t('lottery.count')}：${result.count}`,
    `${t('lottery.result')}：`,
    ...result.winners.map((name, index) => `${index + 1}. ${name}`),
  ]
  return lines.join('\n')
}
