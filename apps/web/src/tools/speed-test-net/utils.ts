/**
 * speed-test-net（#837）工具函数：下载 / 上传带宽测速。
 *
 * fetch 与计时均可注入，便于单测；默认用浏览器原生能力。
 * 与 #648 speed-test（网站 fetch 计时）差异化：本工具测量网络带宽（Mbps）。
 */

/** 输入非法或测量失败时抛出，由 UI 捕获展示 */
export class SpeedNetError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SpeedNetError'
  }
}

/** 可注入的 fetch / 计时 */
export type FetchFn = (url: string, init?: RequestInit) => Promise<Response>
export type NowFn = () => number
const defaultFetch: FetchFn = (url, init) => fetch(url, init)
const defaultNow: NowFn = () => performance.now()

export type SpeedKind = 'download' | 'upload'

export interface SpeedResult {
  readonly kind: SpeedKind
  readonly bytes: number
  readonly ms: number
  readonly mbps: number
}

/** 校验 URL 为 http(s)，返回规范化后的 href */
export function validateUrl(input: string): string {
  const trimmed = input.trim()
  if (trimmed === '')
    throw new SpeedNetError('请输入测速端点 URL，例如 https://example.com/speedtest')
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    throw new SpeedNetError('URL 格式不正确，请输入以 http:// 或 https:// 开头的完整地址')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new SpeedNetError('只支持 http:// 与 https:// 协议')
  }
  return url.href
}

/** 字节数 + 毫秒 → Mbps，保留 2 位小数 */
export function toMbps(bytes: number, ms: number): number {
  if (!Number.isFinite(bytes) || bytes < 0) throw new SpeedNetError('字节数必须为非负数')
  if (!Number.isFinite(ms) || !(ms > 0)) throw new SpeedNetError('计时异常，无法计算速率')
  return Math.round(((bytes * 8) / (ms / 1000) / 1_000_000) * 100) / 100
}

/** 下载测速：GET 整个响应体并计时 */
export async function measureDownload(
  url: string,
  fetchFn: FetchFn = defaultFetch,
  now: NowFn = defaultNow,
): Promise<SpeedResult> {
  const href = validateUrl(url)
  const start = now()
  let res: Response
  try {
    res = await fetchFn(href, { cache: 'no-store' })
  } catch {
    throw new SpeedNetError('下载请求失败：网络不可达或被 CORS 拦截')
  }
  if (!res.ok) throw new SpeedNetError(`下载请求失败：HTTP ${res.status}`)
  let buf: ArrayBuffer
  try {
    buf = await res.arrayBuffer()
  } catch {
    throw new SpeedNetError('读取响应体失败')
  }
  const ms = now() - start
  return {
    kind: 'download',
    bytes: buf.byteLength,
    ms: Math.round(ms),
    mbps: toMbps(buf.byteLength, ms),
  }
}

/** 上传测速：POST 指定字节数的空 body 并计时 */
export async function measureUpload(
  url: string,
  sizeBytes = 262144,
  fetchFn: FetchFn = defaultFetch,
  now: NowFn = defaultNow,
): Promise<SpeedResult> {
  const href = validateUrl(url)
  if (!Number.isInteger(sizeBytes) || sizeBytes <= 0) {
    throw new SpeedNetError('上传数据量必须为正整数（字节）')
  }
  const body = new Uint8Array(sizeBytes)
  const start = now()
  let res: Response
  try {
    res = await fetchFn(href, { method: 'POST', body, cache: 'no-store' })
  } catch {
    throw new SpeedNetError('上传请求失败：网络不可达或被 CORS 拦截')
  }
  if (!res.ok) throw new SpeedNetError(`上传请求失败：HTTP ${res.status}`)
  const ms = now() - start
  return { kind: 'upload', bytes: sizeBytes, ms: Math.round(ms), mbps: toMbps(sizeBytes, ms) }
}

/** 速率评级：<10 较慢，10–100 良好，>100 优秀 */
export function gradeSpeed(mbps: number): string {
  if (!Number.isFinite(mbps) || mbps < 0) throw new SpeedNetError('速率必须为非负数')
  if (mbps < 10) return '较慢'
  if (mbps <= 100) return '良好'
  return '优秀'
}

/** 单条测速结果格式化为可读文本 */
export function formatResult(r: SpeedResult): string {
  const label = r.kind === 'download' ? '下载' : '上传'
  return `${label}速率：${r.mbps} Mbps（${r.bytes} 字节 / ${r.ms} ms）——${gradeSpeed(r.mbps)}`
}

export type SpeedTestNetInput = { text: string }
export type SpeedTestNetOptions = { mode: 'download' | 'upload' | 'both'; uploadKb: string }

/** TwoColumn runAsync 入口：按模式执行下载/上传测速并输出报告 */
export async function transform(
  input: SpeedTestNetInput,
  options: SpeedTestNetOptions,
  fetchFn: FetchFn = defaultFetch,
  now: NowFn = defaultNow,
): Promise<string> {
  if (input.text.trim() === '') return ''
  const lines: string[] = []
  if (options.mode === 'download' || options.mode === 'both') {
    lines.push(formatResult(await measureDownload(input.text, fetchFn, now)))
  }
  if (options.mode === 'upload' || options.mode === 'both') {
    const sizeBytes = Math.round(Number(options.uploadKb) * 1024)
    lines.push(formatResult(await measureUpload(input.text, sizeBytes, fetchFn, now)))
  }
  return lines.join('\n')
}
