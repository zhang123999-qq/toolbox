/**
 * api-retry（#760）纯函数：接口重试退避策略计算。
 * A 级工具：纯前端本地计算，无网络、无第三方 API。
 */

export const RETRY_STRATEGIES = ['exponential', 'linear', 'fixed'] as const
export type RetryStrategy = (typeof RETRY_STRATEGIES)[number]

export const STRATEGY_TEXT: Record<RetryStrategy, string> = {
  exponential: '指数退避',
  linear: '线性递增',
  fixed: '固定间隔',
}

/** 最大重试次数上限（防滥用） */
export const MAX_RETRIES_LIMIT = 20
/** 抖动比例：±50% */
export const JITTER_RATIO = 0.5

export interface RetryOptions {
  baseDelayMs: number
  multiplier: number
  maxDelayMs: number
  maxRetries: number
  jitter: boolean
  strategy?: RetryStrategy
}

export interface RetryStep {
  attempt: number
  delayMs: number
  minDelayMs: number
  maxDelayMs: number
  cumulativeMs: number
}

/** 校验参数（非法抛中文错） */
export function validateRetryOptions(opts: RetryOptions): void {
  if (!Number.isInteger(opts.baseDelayMs) || opts.baseDelayMs <= 0) {
    throw new Error('初始延迟必须是正整数（毫秒）')
  }
  if (typeof opts.multiplier !== 'number' || !(opts.multiplier >= 1)) {
    throw new Error('退避倍数必须是不小于 1 的数字')
  }
  if (!Number.isInteger(opts.maxDelayMs) || opts.maxDelayMs < opts.baseDelayMs) {
    throw new Error('最大延迟必须是不小于初始延迟的整数（毫秒）')
  }
  if (
    !Number.isInteger(opts.maxRetries) ||
    opts.maxRetries < 0 ||
    opts.maxRetries > MAX_RETRIES_LIMIT
  ) {
    throw new Error('最大重试次数必须是 0～' + MAX_RETRIES_LIMIT + ' 的整数')
  }
  if (opts.strategy !== undefined && !RETRY_STRATEGIES.includes(opts.strategy)) {
    throw new Error('未知策略：' + String(opts.strategy))
  }
}

function rawDelay(strategy: RetryStrategy, base: number, mult: number, index: number): number {
  switch (strategy) {
    case 'fixed':
      return base
    case 'linear':
      return base * (index + 1)
    default:
      return base * Math.pow(mult, index)
  }
}

/** 计算重试时间表（含抖动上下界与累计等待） */
export function computeRetrySchedule(opts: RetryOptions): RetryStep[] {
  validateRetryOptions(opts)
  const strategy = opts.strategy ?? 'exponential'
  const steps: RetryStep[] = []
  let cumulative = 0
  for (let i = 0; i < opts.maxRetries; i++) {
    const capped = Math.min(rawDelay(strategy, opts.baseDelayMs, opts.multiplier, i), opts.maxDelayMs)
    const delayMs = Math.round(capped)
    const minDelayMs = opts.jitter ? Math.round(capped * (1 - JITTER_RATIO)) : delayMs
    const maxDelayMs = opts.jitter ? Math.round(capped * (1 + JITTER_RATIO)) : delayMs
    cumulative += delayMs
    steps.push({ attempt: i + 1, delayMs, minDelayMs, maxDelayMs, cumulativeMs: cumulative })
  }
  return steps
}

/** 最坏总等待时间（毫秒） */
export function totalWaitTime(schedule: RetryStep[]): number {
  return schedule.length === 0 ? 0 : schedule[schedule.length - 1].cumulativeMs
}

/** 毫秒转人类可读 */
export function formatDelay(ms: number): string {
  if (ms < 1000) return ms + 'ms'
  const s = ms / 1000
  return (Number.isInteger(s) ? String(s) : s.toFixed(1)) + 's'
}

/** 解析 JSON 配置（组件用；非法抛中文错） */
export function parseRetryConfig(json: string): RetryOptions {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    throw new Error('配置不是合法 JSON')
  }
  if (typeof raw !== 'object' || raw === null) throw new Error('配置必须是 JSON 对象')
  const o = raw as Record<string, unknown>
  const opts: RetryOptions = {
    baseDelayMs: o.baseDelayMs as number,
    multiplier: o.multiplier as number,
    maxDelayMs: o.maxDelayMs as number,
    maxRetries: o.maxRetries as number,
    jitter: o.jitter === true,
    strategy: o.strategy as RetryStrategy | undefined,
  }
  validateRetryOptions(opts)
  return opts
}

/** 示例配置 */
export const EXAMPLE_CONFIG: RetryOptions = {
  baseDelayMs: 1000,
  multiplier: 2,
  maxDelayMs: 8000,
  maxRetries: 5,
  jitter: true,
  strategy: 'exponential',
}
