import type { RandomNumberInput, RandomNumberOptions } from './schema'
import { inputSchema, optionsSchema } from './schema'

/** 单次最多生成的数量：防止误填超大数字卡死页面 */
export const MAX_COUNT = 10000

/** FNV-1a 32 位哈希：把参数 JSON 变成稳定的 PRNG 种子 */
export function hashSeed(text: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** mulberry32：小巧可复现的 PRNG，种子相同则序列相同 */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface RandomParams {
  readonly count: number
  readonly min: number
  readonly max: number
  readonly decimals: number
  readonly unique: boolean
}

function parseCount(raw: string): number {
  const s = raw.trim()
  if (s === '') return 10
  if (!/^\d+$/.test(s)) throw new Error(`数量无效：${raw}（须为正整数）`)
  const count = Number(s)
  if (count < 1) throw new Error('数量须 ≥ 1')
  if (count > MAX_COUNT) throw new Error(`数量过大：上限 ${MAX_COUNT}`)
  return count
}

function parseBound(raw: string, name: string, fallback: number): number {
  const s = raw.trim()
  if (s === '') return fallback
  const value = Number(s)
  if (!Number.isFinite(value)) throw new Error(`${name}无效：${raw}（须为数字）`)
  return value
}

function parseDecimals(raw: string): number {
  const s = raw.trim()
  if (s === '') return 0
  if (!/^\d+$/.test(s)) throw new Error(`小数位数无效：${raw}（须为 0–10 的整数）`)
  const decimals = Number(s)
  if (decimals > 10) throw new Error('小数位数须 ≤ 10')
  return decimals
}

/** 解析并校验全部参数；非法抛中文错误 */
export function parseParams(input: RandomNumberInput, options: RandomNumberOptions): RandomParams {
  const parsedInput = inputSchema.parse(input)
  const parsedOptions = optionsSchema.parse(options)
  const count = parseCount(parsedInput.text)
  const min = parseBound(parsedInput.min, '最小值', 1)
  const max = parseBound(parsedInput.max, '最大值', 100)
  const decimals = parseDecimals(parsedInput.decimals)
  if (min > max) throw new Error(`最小值（${min}）不能大于最大值（${max}）`)
  const unique = parsedOptions.unique
  if (unique && decimals > 0) throw new Error('不重复抽取仅支持整数（小数位数须为 0）')
  if (unique && count > max - min + 1)
    throw new Error(`不重复抽取数量（${count}）超过范围可提供的个数（${max - min + 1}）`)
  return { count, min, max, decimals, unique }
}

/**
 * 生成随机数（纯函数）。
 * salt 由调用方提供：相同 (input, options, salt) 产出相同序列，
 * 于是「显示 / 复制 / 下载」三处结果一致；改参数或重进页面即重新生成。
 */
export function generate(
  input: RandomNumberInput,
  options: RandomNumberOptions,
  salt: number,
): number[] {
  const params = parseParams(input, options)
  const rand = mulberry32(hashSeed(JSON.stringify({ ...params, salt })))
  const { count, min, max, decimals, unique } = params

  if (unique) {
    // 不重复：对整数池做 Fisher–Yates 洗牌后取前 count 个
    const pool: number[] = []
    for (let v = min; v <= max; v++) pool.push(v)
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1))
      ;[pool[i], pool[j]] = [pool[j], pool[i]]
    }
    return pool.slice(0, count)
  }

  const out: number[] = []
  for (let i = 0; i < count; i++) {
    if (decimals === 0) {
      out.push(Math.floor(rand() * (max - min + 1)) + min)
    } else {
      out.push(Number((min + rand() * (max - min)).toFixed(decimals)))
    }
  }
  return out
}

/** 全部输入留空 → 空串（不进入错误态）；复制 / 下载用 */
export function transform(
  input: RandomNumberInput,
  options: RandomNumberOptions,
  salt = 0,
): string {
  if (
    input.text.trim() === '' &&
    input.min.trim() === '' &&
    input.max.trim() === '' &&
    input.decimals.trim() === ''
  )
    return ''
  return generate(input, options, salt)
    .map((n) => String(n))
    .join('\n')
}
