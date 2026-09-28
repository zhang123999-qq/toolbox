import type { SpeedTestInput, SpeedTestOptions } from './schema'

/** 输入非法或测量失败时抛出，由 UI 捕获展示 */
export class SpeedTestError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SpeedTestError'
  }
}

/** 可注入的 fetch / 计时，便于单测 mock（默认用浏览器原生能力） */
export type FetchFn = (url: string, init?: RequestInit) => Promise<Response>
export type NowFn = () => number
const defaultFetch: FetchFn = (url, init) => fetch(url, init)
const defaultNow: NowFn = () => performance.now()

export interface TimingResult {
  readonly url: string
  readonly ok: boolean
  readonly status: number | null
  /** 首字节到达耗时；跨域 opaque / 无 body 时为 null */
  readonly ttfbMs: number | null
  readonly totalMs: number
  readonly sizeBytes: number | null
  /** 跨域近似测量时为 true */
  readonly approximate: boolean
  /** 为空表示无错误 */
  readonly error: string
}

export interface AggregateResult {
  readonly url: string
  readonly runs: readonly TimingResult[]
  readonly okRuns: number
  readonly avgMs: number
  readonly minMs: number
  readonly maxMs: number
  readonly avgTtfbMs: number | null
  readonly sizeBytes: number | null
  readonly approximate: boolean
  readonly grade: string
  readonly score: number
}

/** 校验 URL 为 http(s)，返回规范化后的 href */
export function validateUrl(input: string): string {
  const trimmed = input.trim()
  if (trimmed === '') throw new SpeedTestError('请输入要测速的 URL，例如 https://example.com')
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    throw new SpeedTestError('URL 格式不正确，请输入以 http:// 或 https:// 开头的完整地址')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new SpeedTestError('只支持 http:// 与 https:// 协议')
  }
  return url.href
}

function defaultOrigin(): string {
  return typeof location !== 'undefined' ? location.origin : ''
}

/** 是否同源（同源走 cors 可读响应，跨域走 no-cors 近似测量） */
export function isSameOrigin(url: string, baseOrigin: string = defaultOrigin()): boolean {
  try {
    return new URL(url, baseOrigin === '' ? undefined : baseOrigin).origin === baseOrigin
  } catch {
    return false
  }
}

/** 单次测量：计时 fetch，首 chunk 到达记为 TTFB 近似 */
export async function measureOnce(
  url: string,
  fetchFn: FetchFn = defaultFetch,
  now: NowFn = defaultNow,
  requestMode: RequestMode = 'cors',
  timeoutMs = 30000,
): Promise<TimingResult> {
  const target = validateUrl(url)
  const t0 = now()
  const fail = (error: string): TimingResult => ({
    url: target,
    ok: false,
    status: null,
    ttfbMs: null,
    totalMs: now() - t0,
    sizeBytes: null,
    approximate: true,
    error,
  })
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  let res: Response
  try {
    res = await fetchFn(target, { mode: requestMode, signal: controller.signal, cache: 'no-store' })
  } catch (error) {
    clearTimeout(timer)
    if (error instanceof DOMException && error.name === 'AbortError') {
      return fail(`请求超时（超过 ${timeoutMs} 毫秒）`)
    }
    return fail(`网络请求失败：${error instanceof Error ? error.message : String(error)}`)
  }
  clearTimeout(timer)
  // no-cors 跨域：opaque 响应读不到状态码与内容，只能测总耗时
  if (res.type === 'opaque') {
    return {
      url: target,
      ok: true,
      status: null,
      ttfbMs: null,
      totalMs: now() - t0,
      sizeBytes: null,
      approximate: true,
      error: '',
    }
  }
  if (!res.ok) {
    return { ...fail(`目标站点返回 HTTP ${res.status}`), status: res.status }
  }
  if (!res.body) {
    return {
      url: target,
      ok: true,
      status: res.status,
      ttfbMs: null,
      totalMs: now() - t0,
      sizeBytes: null,
      approximate: true,
      error: '',
    }
  }
  const reader = res.body.getReader()
  let chunk = await reader.read()
  const ttfbMs = now() - t0
  let size = 0
  while (!chunk.done) {
    size += chunk.value.byteLength
    chunk = await reader.read()
  }
  return {
    url: target,
    ok: true,
    status: res.status,
    ttfbMs,
    totalMs: now() - t0,
    sizeBytes: size,
    approximate: false,
    error: '',
  }
}

export interface MeasureOptions {
  readonly times?: number
  readonly requestMode?: RequestMode
  readonly timeoutMs?: number
}

/** 多次测量取平均；全部失败时抛错 */
export async function measure(
  url: string,
  fetchFn: FetchFn = defaultFetch,
  now: NowFn = defaultNow,
  opts: MeasureOptions = {},
): Promise<AggregateResult> {
  const times = opts.times ?? 3
  if (times < 1) throw new SpeedTestError('测量次数至少为 1')
  const requestMode = opts.requestMode ?? 'cors'
  const timeoutMs = opts.timeoutMs ?? 30000
  const results: TimingResult[] = []
  for (let i = 0; i < times; i++) {
    results.push(await measureOnce(url, fetchFn, now, requestMode, timeoutMs))
  }
  const ok = results.filter((r) => r.ok)
  if (ok.length === 0) throw new SpeedTestError(results[0].error)
  const totals = ok.map((r) => r.totalMs)
  const avg = (ns: number[]): number => ns.reduce((a, b) => a + b, 0) / ns.length
  const ttfbs = ok.map((r) => r.ttfbMs).filter((t): t is number => t !== null)
  const sizes = ok.map((r) => r.sizeBytes).filter((s): s is number => s !== null)
  const avgMs = avg(totals)
  const { grade, score } = scoreTiming(avgMs)
  return {
    url: ok[0].url,
    runs: results,
    okRuns: ok.length,
    avgMs,
    minMs: Math.min(...totals),
    maxMs: Math.max(...totals),
    avgTtfbMs: ttfbs.length > 0 ? avg(ttfbs) : null,
    sizeBytes: sizes.length > 0 ? Math.round(avg(sizes)) : null,
    approximate: ok.some((r) => r.approximate),
    grade,
    score,
  }
}

/** 按平均耗时分档打分 */
export function scoreTiming(totalMs: number): { grade: string; score: number } {
  if (totalMs < 1000) return { grade: '优等', score: 95 }
  if (totalMs < 2000) return { grade: '良好', score: 80 }
  if (totalMs < 3000) return { grade: '一般', score: 65 }
  if (totalMs < 5000) return { grade: '较慢', score: 45 }
  return { grade: '慢', score: 20 }
}

/** 体积转人类可读 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MiB`
}

/** 渲染测速报告为文本 */
export function renderReport(agg: AggregateResult): string {
  const lines: string[] = []
  lines.push(`目标：${agg.url}`)
  lines.push(`评级：${agg.grade}（${agg.score} 分）`)
  lines.push(
    `平均耗时：${agg.avgMs.toFixed(0)} ms（${agg.okRuns} 次成功，最快 ${agg.minMs.toFixed(0)} ms / 最慢 ${agg.maxMs.toFixed(0)} ms）`,
  )
  lines.push(
    `平均 TTFB：${agg.avgTtfbMs === null ? '不可测（跨域近似）' : `${agg.avgTtfbMs.toFixed(0)} ms`}`,
  )
  lines.push(
    `传输体积：${agg.sizeBytes === null ? '不可读（跨域近似）' : formatSize(agg.sizeBytes)}`,
  )
  if (agg.approximate) {
    lines.push(
      '说明：跨域测量为近似值（浏览器 no-cors 限制，读不到状态码与响应体）；同源测量为精确值',
    )
  }
  lines.push('')
  lines.push('各次测量：')
  agg.runs.forEach((r, i) => {
    if (!r.ok) {
      lines.push(`  #${i + 1} 失败：${r.error}`)
    } else {
      const ttfb = r.ttfbMs === null ? 'TTFB不可测' : `TTFB ${r.ttfbMs.toFixed(0)}ms`
      const size = r.sizeBytes === null ? '' : ` / ${formatSize(r.sizeBytes)}`
      lines.push(
        `  #${i + 1} ${r.totalMs.toFixed(0)} ms（${ttfb}${size}）${r.approximate ? ' [近似]' : ''}`,
      )
    }
  })
  return lines.join('\n')
}

export async function transform(
  input: SpeedTestInput,
  options: SpeedTestOptions,
  fetchFn: FetchFn = defaultFetch,
  now: NowFn = defaultNow,
): Promise<string> {
  if (input.text.trim() === '') return ''
  if (input.text.length > 200000) throw new SpeedTestError('输入超过 200,000 字符上限')
  const requestMode: RequestMode = isSameOrigin(input.text) ? 'cors' : 'no-cors'
  const agg = await measure(input.text, fetchFn, now, { times: options.times, requestMode })
  return renderReport(agg)
}
