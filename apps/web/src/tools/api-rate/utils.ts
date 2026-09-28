/**
 * api-rate（#762）纯函数：令牌桶 / 滑动窗口限流模拟。
 * A 级工具：纯前端本地计算，无网络、无第三方 API。
 */

export const RATE_MODES = ['token-bucket', 'sliding-window'] as const
export type RateMode = (typeof RATE_MODES)[number]

export const RATE_MODE_TEXT: Record<RateMode, string> = {
  'token-bucket': '令牌桶',
  'sliding-window': '滑动窗口',
}

export interface TokenBucketConfig {
  capacity: number
  refillPerSec: number
}

export interface TokenBucketResult {
  time: number
  allowed: boolean
  tokensLeft: number
}

export interface SlidingWindowConfig {
  limit: number
  windowSec: number
}

export interface SlidingWindowResult {
  time: number
  allowed: boolean
  countInWindow: number
}

function validateTimes(requests: number[]): void {
  for (const t of requests) {
    if (typeof t !== 'number' || !Number.isFinite(t)) {
      throw new Error('请求时间戳必须是有限数字（秒）')
    }
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** 令牌桶模拟：请求按时间戳顺序消耗令牌 */
export function simulateTokenBucket(
  requests: number[],
  cfg: TokenBucketConfig,
): TokenBucketResult[] {
  if (!Number.isInteger(cfg.capacity) || cfg.capacity <= 0) {
    throw new Error('桶容量必须是正整数')
  }
  if (typeof cfg.refillPerSec !== 'number' || !(cfg.refillPerSec > 0)) {
    throw new Error('补充速率必须是正数（个/秒）')
  }
  validateTimes(requests)
  const out: TokenBucketResult[] = []
  let tokens = cfg.capacity
  let last = requests.length > 0 ? requests[0] : 0
  for (const t of requests) {
    const delta = Math.max(0, t - last)
    tokens = Math.min(cfg.capacity, tokens + delta * cfg.refillPerSec)
    last = t
    if (tokens >= 1) {
      tokens -= 1
      out.push({ time: t, allowed: true, tokensLeft: round2(tokens) })
    } else {
      out.push({ time: t, allowed: false, tokensLeft: round2(tokens) })
    }
  }
  return out
}

/** 滑动窗口模拟：窗口内已放行数 < limit 才放行（被拒绝的不占窗口） */
export function simulateSlidingWindow(
  requests: number[],
  cfg: SlidingWindowConfig,
): SlidingWindowResult[] {
  if (!Number.isInteger(cfg.limit) || cfg.limit <= 0) {
    throw new Error('窗口上限必须是正整数')
  }
  if (typeof cfg.windowSec !== 'number' || !(cfg.windowSec > 0)) {
    throw new Error('窗口时长必须是正数（秒）')
  }
  validateTimes(requests)
  const out: SlidingWindowResult[] = []
  const allowedTimes: number[] = []
  for (const t of requests) {
    const cutoff = t - cfg.windowSec
    let inWindow = 0
    for (const x of allowedTimes) {
      if (x > cutoff) inWindow++
    }
    if (inWindow < cfg.limit) {
      allowedTimes.push(t)
      out.push({ time: t, allowed: true, countInWindow: inWindow + 1 })
    } else {
      out.push({ time: t, allowed: false, countInWindow: inWindow })
    }
  }
  return out
}

export interface RateSimInput {
  mode: RateMode
  requests: number[]
  capacity: number
  refillPerSec: number
  limit: number
  windowSec: number
}

/** 解析组件输入 JSON（非法抛中文错） */
export function parseRateSimInput(json: string): RateSimInput {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    throw new Error('输入不是合法 JSON')
  }
  if (typeof raw !== 'object' || raw === null) throw new Error('输入必须是 JSON 对象')
  const o = raw as Record<string, unknown>
  const mode = o.mode as RateMode
  if (!RATE_MODES.includes(mode)) throw new Error('mode 必须是 token-bucket 或 sliding-window')
  if (!Array.isArray(o.requests)) throw new Error('requests 必须是时间戳数组（秒）')
  return {
    mode,
    requests: (o.requests as unknown[]).map(Number),
    capacity: Number(o.capacity),
    refillPerSec: Number(o.refillPerSec),
    limit: Number(o.limit),
    windowSec: Number(o.windowSec),
  }
}

/** 示例输入 */
export const EXAMPLE_INPUT = {
  mode: 'token-bucket',
  requests: [0, 0.2, 0.4, 0.6, 1.5, 2.5],
  capacity: 3,
  refillPerSec: 1,
  limit: 5,
  windowSec: 10,
}
