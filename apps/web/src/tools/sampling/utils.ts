import { en } from '../../i18n/messages.en'
import { zh } from '../../i18n/messages.zh'
import type { MessageKey } from '../../i18n/messages.zh'
import type { Translate } from '../../i18n'
import type { SamplingInput, SamplingOptions } from './schema'
import { inputSchema, optionsSchema } from './schema'

/** 样本量上限：防止误输入天文数字导致内存爆炸 */
const MAX_SAMPLE_SIZE = 100000

/** mulberry32 常量：0x6D2B79F5 为状态递增步长；61 为原算法 `t | 61` 中的固定奇数（保证乘数非零） */
const MULBERRY_INCREMENT = 0x6d2b79f5
const MULBERRY_MIXER = 61
/** mulberry32 三次无符号右移的位数：算法固定参数 */
const MULBERRY_SHIFT_A = 15
const MULBERRY_SHIFT_B = 7
const MULBERRY_SHIFT_C = 14
const UINT32_RANGE = 4294967296

/** FNV-1a 32 位哈希常量：把字符串种子压缩成 32 位整数 */
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

/**
 * mulberry32 —— 32 位种子伪随机数发生器。
 * 出处：Tommy Ettinger 2017 年公开的公有领域算法（见 https://github.com/bryc/code
 * 的 PRNG 收集）；原理是每轮给 32 位状态加一个黄金比例常数
 * （0x6D2B79F5），再经两次 Math.imul 混合与异或位移打散，
 * 最后除以 2^32 归一到 [0, 1)。周期 2^32，质量足够抽样这类非密码学场景。
 */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state |= 0
    state = (state + MULBERRY_INCREMENT) | 0
    let mixed = Math.imul(state ^ (state >>> MULBERRY_SHIFT_A), 1 | state)
    mixed =
      (mixed + Math.imul(mixed ^ (mixed >>> MULBERRY_SHIFT_B), MULBERRY_MIXER | mixed)) ^ mixed
    return ((mixed ^ (mixed >>> MULBERRY_SHIFT_C)) >>> 0) / UINT32_RANGE
  }
}

/** 字符串种子 → 32 位无符号整数（FNV-1a 哈希），供 mulberry32 使用 */
export function hashSeed(text: string): number {
  let hash = FNV_OFFSET_BASIS
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, FNV_PRIME)
  }
  return hash >>> 0
}

/** 总体解析：按行切分，去首尾空白，丢弃空行；重复元素保留（按位置独立看待） */
export function parsePopulation(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
}

/** 样本量校验：空 / 非数字 / 非整数 / 负数 / 超上限逐项抛双语错误 */
export function parseSampleSize(raw: string): number {
  const s = raw.trim()
  if (s === '') throw bilingualError('sampling.error.sizeEmpty')
  const value = Number(s)
  if (!Number.isFinite(value)) throw bilingualError('sampling.error.sizeNotNumber', { value: s })
  if (!Number.isInteger(value)) throw bilingualError('sampling.error.sizeNotInteger', { value: s })
  if (value < 0) throw bilingualError('sampling.error.sizeNegative')
  if (value > MAX_SAMPLE_SIZE)
    throw bilingualError('sampling.error.sizeTooLarge', { max: MAX_SAMPLE_SIZE })
  return value
}

/**
 * 核心抽样（纯函数，随机源由调用方注入以便测试）。
 * - 有放回：每次独立按均匀索引取，可重复；
 * - 无放回：Fisher–Yates 部分洗牌后取前 size 个，样本量 > 总体时抛错。
 */
export function samplePopulation(
  population: readonly string[],
  size: number,
  withReplacement: boolean,
  rand: () => number,
): string[] {
  const n = population.length
  if (withReplacement) {
    const picked: string[] = []
    for (let i = 0; i < size; i += 1) {
      picked.push(population[Math.floor(rand() * n)])
    }
    return picked
  }
  if (size > n) {
    throw bilingualError('sampling.error.exceedsPopulation', { size, population: n })
  }
  const pool = population.slice()
  for (let i = 0; i < size; i += 1) {
    const j = i + Math.floor(rand() * (n - i))
    const tmp = pool[i]
    pool[i] = pool[j]
    pool[j] = tmp
  }
  return pool.slice(0, size)
}

/** 随机源：种子为空用 Math.random（真随机），否则用种子化的 mulberry32（可复现） */
export function buildRandom(seedText: string): () => number {
  const seed = seedText.trim()
  if (seed === '') return Math.random
  return mulberry32(hashSeed(seed))
}

export interface SampleResult {
  readonly populationSize: number
  readonly size: number
  readonly withReplacement: boolean
  readonly seedText: string
  readonly items: readonly string[]
}

/**
 * 抽样计算：总体留空返回 null（上层渲染空态，不报错）。
 * 样本量非法 / 无放回超总体 → 抛双语错误。
 */
export function computeSample(input: SamplingInput, options: SamplingOptions): SampleResult | null {
  const parsedInput = inputSchema.parse(input)
  const parsedOptions = optionsSchema.parse(options)
  const population = parsePopulation(parsedInput.text)
  if (population.length === 0) return null
  const size = parseSampleSize(parsedInput.sampleSize)
  const items = samplePopulation(
    population,
    size,
    parsedOptions.replace,
    buildRandom(parsedInput.seed),
  )
  return {
    populationSize: population.length,
    size,
    withReplacement: parsedOptions.replace,
    seedText: parsedInput.seed.trim(),
    items,
  }
}

/** 纯文本版本（复制 / 下载用）；总体留空 → 空串 */
export function transform(input: SamplingInput, options: SamplingOptions, t: Translate): string {
  const result = computeSample(input, options)
  if (result === null) return ''
  const seedLabel = result.seedText === '' ? t('sampling.seed.random') : result.seedText
  const lines = [
    `${t('sampling.mode')}：${result.withReplacement ? t('sampling.mode.withReplacement') : t('sampling.mode.withoutReplacement')}`,
    `${t('sampling.population')}：${result.populationSize}`,
    `${t('sampling.size')}：${result.size}`,
    `${t('sampling.seed')}：${seedLabel}`,
    `${t('sampling.result')}：`,
    ...result.items.map((item, index) => `${index + 1}. ${item}`),
  ]
  return lines.join('\n')
}
