import { en } from '../../i18n/messages.en'
import { zh } from '../../i18n/messages.zh'
import type { MessageKey } from '../../i18n/messages.zh'
import type { Translate } from '../../i18n'
import type { DiceInput, DiceOptions } from './schema'
import { inputSchema, optionsSchema } from './schema'

/** 骰子个数上限：防止误输入天文数字卡死页面 */
const MAX_DICE_COUNT = 100
/** 骰子面数上 / 下限：1 面骰没有随机意义 */
const MAX_DICE_SIDES = 100
const MIN_DICE_SIDES = 2

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

/** 骰子个数校验：空 / 非整数 / <1 / 超上限逐项抛双语错误 */
export function parseDiceCount(raw: string): number {
  const s = raw.trim()
  if (s === '') throw bilingualError('dice.error.countEmpty')
  const value = Number(s)
  if (!Number.isInteger(value) || value < 1)
    throw bilingualError('dice.error.countInvalid', { value: s })
  if (value > MAX_DICE_COUNT)
    throw bilingualError('dice.error.countTooLarge', { max: MAX_DICE_COUNT })
  return value
}

/** 骰子面数校验：空 / 非整数 / <2 / 超上限逐项抛双语错误 */
export function parseDiceSides(raw: string): number {
  const s = raw.trim()
  if (s === '') throw bilingualError('dice.error.sidesEmpty')
  const value = Number(s)
  if (!Number.isInteger(value) || value < MIN_DICE_SIDES)
    throw bilingualError('dice.error.sidesInvalid', { value: s })
  if (value > MAX_DICE_SIDES)
    throw bilingualError('dice.error.sidesTooLarge', { max: MAX_DICE_SIDES })
  return value
}

/**
 * 掷骰子（纯函数，随机源由调用方注入以便测试）。
 * 每颗骰子独立均匀取 [1, sides]，天然无偏。
 */
export function rollDice(count: number, sides: number, rand: () => number): number[] {
  const rolls: number[] = []
  for (let i = 0; i < count; i += 1) {
    rolls.push(Math.floor(rand() * sides) + 1)
  }
  return rolls
}

/** 总点数 */
export function diceTotal(rolls: readonly number[]): number {
  return rolls.reduce((sum, roll) => sum + roll, 0)
}

export interface DiceOutcome {
  readonly count: number
  readonly sides: number
  readonly rolls: readonly number[]
  readonly total: number
}

/** 掷骰计算：参数非法 → 抛双语错误 */
export function roll(input: DiceInput, options: DiceOptions, rand: () => number): DiceOutcome {
  const parsedInput = inputSchema.parse(input)
  optionsSchema.parse(options)
  const count = parseDiceCount(parsedInput.text)
  const sides = parseDiceSides(parsedInput.sides)
  const rolls = rollDice(count, sides, rand)
  return { count, sides, rolls, total: diceTotal(rolls) }
}

/** 纯文本版本（复制 / 下载用） */
export function transform(
  input: DiceInput,
  options: DiceOptions,
  rand: () => number,
  t: Translate,
): string {
  const outcome = roll(input, options, rand)
  const lines = [
    `${t('dice.count')}：${outcome.count}，${t('dice.sides')}：${outcome.sides}`,
    `${t('dice.result')}：${outcome.rolls.join('、')}`,
    `${t('dice.total')}：${outcome.total}`,
  ]
  return lines.join('\n')
}
