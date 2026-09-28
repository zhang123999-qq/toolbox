import type { MobileFriendlyInput, MobileFriendlyOptions } from './schema'

/** 输入非法或抓取失败时抛出，由 UI 捕获展示 */
export class MobileFriendlyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MobileFriendlyError'
  }
}

/** 可注入的 fetch，便于单测 mock（默认用浏览器原生 fetch） */
export type FetchFn = (url: string, init?: RequestInit) => Promise<Response>
const defaultFetch: FetchFn = (url, init) => fetch(url, init)

export type FindingStatus = '通过' | '建议' | '问题'

export interface Finding {
  readonly item: string
  readonly status: FindingStatus
  readonly detail: string
  readonly advice: string
}

export interface MobileReport {
  readonly score: number
  readonly findings: readonly Finding[]
  readonly summary: string
}

/** 提取 viewport meta 的 content；无标签返回 null，有标签无 content 返回 '' */
function getViewportContent(html: string): string | null {
  const tag = /<meta\b[^>]*\bname\s*=\s*["']viewport["'][^>]*>/i.exec(html)?.[0]
  if (!tag) return null
  return /content\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1] ?? ''
}

/** 纯静态分析 HTML 的移动友好度 */
export function analyzeMobileFriendly(html: string): MobileReport {
  const findings: Finding[] = []

  // 1. viewport
  const viewport = getViewportContent(html)
  if (viewport === null) {
    findings.push({
      item: 'viewport',
      status: '问题',
      detail: '未找到 <meta name="viewport">，移动端会按桌面宽度渲染',
      advice: '在 <head> 添加 <meta name="viewport" content="width=device-width, initial-scale=1">',
    })
  } else if (viewport === '') {
    findings.push({
      item: 'viewport',
      status: '问题',
      detail: '<meta name="viewport"> 缺少 content 属性，等于没写',
      advice: '补全 content="width=device-width, initial-scale=1"',
    })
  } else if (/width\s*=\s*device-width/i.test(viewport)) {
    findings.push({
      item: 'viewport',
      status: '通过',
      detail: '已设置 width=device-width',
      advice: '',
    })
  } else {
    findings.push({
      item: 'viewport',
      status: '建议',
      detail: `viewport 已存在但未设置 width=device-width（当前：${viewport}）`,
      advice: '将 content 改为 width=device-width, initial-scale=1',
    })
  }

  // 2. 媒体查询
  const mediaCount = html.match(/@media/gi)?.length ?? 0
  if (mediaCount > 0) {
    findings.push({
      item: '媒体查询',
      status: '通过',
      detail: `检测到 ${mediaCount} 处 @media`,
      advice: '',
    })
  } else {
    findings.push({
      item: '媒体查询',
      status: '建议',
      detail: '未检测到 @media',
      advice: '用 @media 媒体查询为小屏写一套布局，避免桌面布局直接压缩',
    })
  }

  // 3. 固定像素宽度（≥100px 在小屏易横向溢出；排除 max-/min-width）
  const fixedWidths: number[] = []
  for (const m of html.matchAll(/(?:^|[;{\s"'])width\s*:\s*(\d+)px/gi)) {
    const v = Number(m[1])
    if (v >= 100) fixedWidths.push(v)
  }
  if (fixedWidths.length > 0) {
    const shown = fixedWidths.slice(0, 5).join('px、')
    findings.push({
      item: '固定宽度',
      status: '问题',
      detail: `发现 ${fixedWidths.length} 处固定像素宽度（${shown}px…），小屏可能横向溢出`,
      advice: '改用 max-width: 100% / 百分比 / flex 等相对布局',
    })
  } else {
    findings.push({
      item: '固定宽度',
      status: '通过',
      detail: '未发现 ≥100px 的固定像素宽度',
      advice: '',
    })
  }

  // 4. table 布局
  const tableCount = html.match(/<table[\s>]/gi)?.length ?? 0
  if (tableCount > 0) {
    findings.push({
      item: '表格布局',
      status: '建议',
      detail: `发现 ${tableCount} 个 <table>`,
      advice: '给表格外层包一个可横向滚动的容器（overflow-x: auto），避免挤压变形',
    })
  } else {
    findings.push({
      item: '表格布局',
      status: '通过',
      detail: '未使用 <table> 布局',
      advice: '',
    })
  }

  let problems = 0
  let suggestions = 0
  for (const f of findings) {
    if (f.status === '问题') problems++
    else if (f.status === '建议') suggestions++
  }
  const score = Math.max(0, 100 - problems * 25 - suggestions * 10)
  const summary =
    score >= 90
      ? '移动友好：各项检查基本通过'
      : score >= 70
        ? '基本可用：有少量建议项，按 findings 优化体验更佳'
        : '移动体验较差：存在影响小屏浏览的问题，建议按 findings 逐项整改'
  return { score, findings, summary }
}

/** 校验 URL 为 http(s)，返回规范化后的 href */
export function validateUrl(input: string): string {
  const trimmed = input.trim()
  if (trimmed === '') throw new MobileFriendlyError('请输入要抓取的页面 URL')
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    throw new MobileFriendlyError('URL 格式不正确，请输入以 http:// 或 https:// 开头的完整地址')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new MobileFriendlyError('只支持 http:// 与 https:// 协议')
  }
  return url.href
}

/** 抓取页面 HTML（需同源或目标允许 CORS），超时与失败抛中文错 */
export async function fetchHtml(
  url: string,
  fetchFn: FetchFn = defaultFetch,
  timeoutMs = 15000,
): Promise<string> {
  const target = validateUrl(url)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  let res: Response
  try {
    res = await fetchFn(target, { signal: controller.signal })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new MobileFriendlyError(`抓取超时（超过 ${timeoutMs} 毫秒）`)
    }
    throw new MobileFriendlyError(
      '抓取失败：目标站点未允许跨域（CORS）或网络不可达，请改用「粘贴分析」模式',
    )
  } finally {
    clearTimeout(timer)
  }
  if (!res.ok) throw new MobileFriendlyError(`目标站点返回 HTTP ${res.status}`)
  const html = await res.text()
  if (html.length > 2000000) throw new MobileFriendlyError('页面过大（超过 2,000,000 字符），请改用粘贴关键片段分析')
  return html
}

/** 渲染报告为文本 */
export function renderReport(report: MobileReport, source: string): string {
  const lines: string[] = []
  lines.push(`来源：${source}`)
  lines.push(`移动友好得分：${report.score} / 100`)
  lines.push(`结论：${report.summary}`)
  lines.push('')
  for (const f of report.findings) {
    lines.push(`[${f.status}] ${f.item}：${f.detail}`)
    if (f.advice !== '') lines.push(`  建议：${f.advice}`)
  }
  return lines.join('\n')
}

export async function transform(
  input: MobileFriendlyInput,
  options: MobileFriendlyOptions,
  fetchFn: FetchFn = defaultFetch,
): Promise<string> {
  if (input.text.trim() === '') return ''
  if (input.text.length > 2000000) throw new MobileFriendlyError('输入超过 2,000,000 字符上限')
  if (options.mode === '粘贴分析') {
    return renderReport(analyzeMobileFriendly(input.text), '粘贴的 HTML')
  }
  const html = await fetchHtml(input.text, fetchFn)
  return renderReport(analyzeMobileFriendly(html), `实时抓取：${validateUrl(input.text)}`)
}
