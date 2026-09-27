import { en } from '../../i18n/messages.en'
import { zh } from '../../i18n/messages.zh'
import type { MessageKey } from '../../i18n/messages.zh'
import type { Translate } from '../../i18n'
import type { RandomDecisionInput, RandomDecisionOptions } from './schema'
import { inputSchema, optionsSchema } from './schema'

/** 单次最多抽取个数：防止误输入天文数字导致内存爆炸 */
const MAX_DECISION_COUNT = 1000

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

/** 选项解析：按行切分，去首尾空白，丢弃空行；重复选项按独立条目保留 */
export function parseOptions(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
}

/** 抽取个数校验：空 / 非整数 / 负数 / 超上限逐项抛双语错误；0 合法（返回空结果） */
export function parseCount(raw: string): number {
  const s = raw.trim()
  if (s === '') throw bilingualError('randomDecision.error.countEmpty')
  const value = Number(s)
  if (!Number.isInteger(value) || value < 0)
    throw bilingualError('randomDecision.error.countInvalid', { value: s })
  if (value > MAX_DECISION_COUNT)
    throw bilingualError('randomDecision.error.countTooLarge', { max: MAX_DECISION_COUNT })
  return value
}

/**
 * 核心抽取（纯函数，随机源由调用方注入以便测试）。
 * - 允许重复：每次独立均匀取索引，同一选项可被多次抽中；
 * - 不允许重复：Fisher–Yates 部分洗牌后取前 count 个，天然无偏；
 *   个数 > 选项数时抛错。
 */
export function pickOptions(
  options: readonly string[],
  count: number,
  allowRepeat: boolean,
  rand: () => number,
): string[] {
  const n = options.length
  if (allowRepeat) {
    const picked: string[] = []
    for (let i = 0; i < count; i += 1) {
      picked.push(options[Math.floor(rand() * n)])
    }
    return picked
  }
  if (count > n) {
    throw bilingualError('randomDecision.error.countExceeds', { count, total: n })
  }
  const pool = options.slice()
  for (let i = 0; i < count; i += 1) {
    const j = i + Math.floor(rand() * (n - i))
    const tmp = pool[i]
    pool[i] = pool[j]
    pool[j] = tmp
  }
  return pool.slice(0, count)
}

export interface DecisionResult {
  readonly optionCount: number
  readonly count: number
  readonly allowRepeat: boolean
  readonly picked: readonly string[]
}

/**
 * 随机决定计算：选项列表留空返回 null（上层渲染空态，不报错）。
 * 抽取个数非法 / 不允许重复且个数超选项数 → 抛双语错误。
 */
export function decide(
  input: RandomDecisionInput,
  options: RandomDecisionOptions,
  rand: () => number,
): DecisionResult | null {
  const parsedInput = inputSchema.parse(input)
  const parsedOptions = optionsSchema.parse(options)
  const optionList = parseOptions(parsedInput.text)
  if (optionList.length === 0) return null
  const count = parseCount(parsedInput.count)
  const picked = pickOptions(optionList, count, parsedOptions.allowRepeat, rand)
  return { optionCount: optionList.length, count, allowRepeat: parsedOptions.allowRepeat, picked }
}

/** 纯文本版本（复制 / 下载用）；选项留空 → 空串 */
export function transform(
  input: RandomDecisionInput,
  options: RandomDecisionOptions,
  rand: () => number,
  t: Translate,
): string {
  const result = decide(input, options, rand)
  if (result === null) return ''
  const lines = [
    `${t('randomDecision.options')}：${result.optionCount}`,
    `${t('randomDecision.count')}：${result.count}`,
    `${t('randomDecision.result')}：`,
    ...result.picked.map((item, index) => `${index + 1}. ${item}`),
  ]
  return lines.join('\n')
}
