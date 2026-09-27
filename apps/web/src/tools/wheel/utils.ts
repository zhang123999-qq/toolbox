import { en } from '../../i18n/messages.en'
import { zh } from '../../i18n/messages.zh'
import type { MessageKey } from '../../i18n/messages.zh'
import type { Translate } from '../../i18n'
import type { WheelInput, WheelOptions } from './schema'
import { inputSchema, optionsSchema } from './schema'

/** 转盘扇区上限：再多扇区过窄，既看不清也点不中 */
const MAX_SEGMENTS = 24
/** 单次最多获奖人数：防止误输入天文数字导致内存爆炸 */
const MAX_WINNERS = 1000
/** 每次旋转的整圈数：保证有足够的旋转观感，再落到目标扇区 */
const FULL_SPIN_TURNS = 5
/** 一周角度 */
const DEGREES_PER_CIRCLE = 360

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

/**
 * 扇区解析：按行切分，去首尾空白，丢弃空行。
 * 空列表 → 由上层按空态处理（返回 []）；1 个 → 报错（转盘无意义）；超上限 → 报错。
 */
export function parseSegments(text: string): string[] {
  const segments = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
  if (segments.length === 1) throw bilingualError('wheel.error.tooFew')
  if (segments.length > MAX_SEGMENTS)
    throw bilingualError('wheel.error.tooMany', { max: MAX_SEGMENTS })
  return segments
}

/** 获奖人数校验：空 / 非整数 / 负数 / 超上限逐项抛双语错误；0 合法（转盘空转） */
export function parseWinnerCount(raw: string): number {
  const s = raw.trim()
  if (s === '') throw bilingualError('wheel.error.countEmpty')
  const value = Number(s)
  if (!Number.isInteger(value) || value < 0)
    throw bilingualError('wheel.error.countInvalid', { value: s })
  if (value > MAX_WINNERS) throw bilingualError('wheel.error.countTooLarge', { max: MAX_WINNERS })
  return value
}

export interface SpinResult {
  /** 获奖者名单（按抽中顺序） */
  readonly winners: readonly string[]
  /** 获奖者在扇区中的下标（与 winners 一一对应） */
  readonly winnerIndexes: readonly number[]
  /** 每个扇区的角度（度） */
  readonly segmentAngle: number
  /**
   * 转盘最终旋转角度（度，顺时针为正）。
   * CSS 侧把转盘容器 rotate 该角度（带 transition），指针固定在顶部，
   * 转完后指针正对第一位获奖者所在扇区的中心。
   */
  readonly finalRotation: number
  /** 整圈数（观感用） */
  readonly fullSpins: number
}

/**
 * 计算一次旋转：Fisher–Yates 无放回抽出获奖者（天然无偏），
 * 再算出让指针落到第一位获奖者扇区中心所需的最终旋转角度。
 *
 * 几何约定（与 Tool.tsx 的 CSS 一致）：
 * - 扇区 i 占据顺时针 [i·seg, (i+1)·seg)，0° 在顶部；
 * - 容器 rotate(R°) 为顺时针旋转 R°，此时顶部指针指向转盘上的
 *   (360 − R mod 360) mod 360 处；
 * - 要让指针指向获奖者 w 的扇区中心 (w+0.5)·seg，需
 *   R mod 360 = (360 − (w+0.5)·seg) mod 360。
 */
export function computeSpin(
  segments: readonly string[],
  winnerCount: number,
  rand: () => number,
): SpinResult {
  const n = segments.length
  if (winnerCount > n) {
    throw bilingualError('wheel.error.countExceeds', { count: winnerCount, total: n })
  }
  const order = segments.map((_, index) => index)
  for (let i = 0; i < winnerCount; i += 1) {
    const j = i + Math.floor(rand() * (n - i))
    const tmp = order[i]
    order[i] = order[j]
    order[j] = tmp
  }
  const winnerIndexes = order.slice(0, winnerCount)
  const winners = winnerIndexes.map((index) => segments[index])
  const segmentAngle = DEGREES_PER_CIRCLE / n
  // 获奖人数为 0 时转盘空转：只转整圈，不偏移
  const offset =
    winnerIndexes.length === 0
      ? 0
      : (DEGREES_PER_CIRCLE - (winnerIndexes[0] + 0.5) * segmentAngle) % DEGREES_PER_CIRCLE
  return {
    winners,
    winnerIndexes,
    segmentAngle,
    finalRotation: FULL_SPIN_TURNS * DEGREES_PER_CIRCLE + offset,
    fullSpins: FULL_SPIN_TURNS,
  }
}

export interface WheelOutcome {
  readonly segmentCount: number
  readonly winnerCount: number
  readonly spin: SpinResult
}

/**
 * 转盘计算：选项留空返回 null（上层渲染空态，不报错）。
 * 扇区数非法 / 获奖人数非法 / 获奖人数 > 扇区数 → 抛双语错误。
 */
export function spin(
  input: WheelInput,
  options: WheelOptions,
  rand: () => number,
): WheelOutcome | null {
  const parsedInput = inputSchema.parse(input)
  optionsSchema.parse(options)
  const segments = parseSegments(parsedInput.text)
  if (segments.length === 0) return null
  const winnerCount = parseWinnerCount(parsedInput.winners)
  return {
    segmentCount: segments.length,
    winnerCount,
    spin: computeSpin(segments, winnerCount, rand),
  }
}

/** 纯文本版本（复制 / 下载用）；选项留空 → 空串 */
export function transform(
  input: WheelInput,
  options: WheelOptions,
  rand: () => number,
  t: Translate,
): string {
  const outcome = spin(input, options, rand)
  if (outcome === null) return ''
  const lines = [
    `${t('wheel.segments')}：${outcome.segmentCount}`,
    `${t('wheel.winners')}：${outcome.winnerCount}`,
    `${t('wheel.result')}：`,
    ...outcome.spin.winners.map((name, index) => `${index + 1}. ${name}`),
  ]
  return lines.join('\n')
}
