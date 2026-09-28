import type { MixedContentInput, MixedContentOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class MixedContentError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MixedContentError'
  }
}

export interface MixedResource {
  readonly tag: string
  readonly attr: string
  readonly url: string
  /** 主动混合内容（script/iframe/embed/object）风险高于被动内容（img/video） */
  readonly active: boolean
}

/** 标签 → 属性 → 是否主动内容 */
const TAG_ATTRS: ReadonlyArray<readonly [tag: string, attr: string, active: boolean]> = [
  ['script', 'src', true],
  ['iframe', 'src', true],
  ['embed', 'src', true],
  ['object', 'data', true],
  ['img', 'src', false],
  ['video', 'src', false],
  ['audio', 'src', false],
  ['source', 'src', false],
  ['track', 'src', false],
  ['input', 'src', false],
  ['link', 'href', false],
]

/** 从单个属性值中拆出 URL（处理 srcset 的多候选） */
function splitUrls(raw: string): string[] {
  return raw
    .split(',')
    .map((part) => part.trim().split(/\s+/)[0])
    .filter((u) => u !== '')
}

/** 提取 HTML 中所有 http:// 开头的资源引用（去重） */
export function extractHttpResources(html: string): MixedResource[] {
  const seen = new Set<string>()
  const out: MixedResource[] = []
  const push = (tag: string, attr: string, url: string, active: boolean) => {
    const key = `${tag}|${attr}|${url}`
    if (seen.has(key)) return
    seen.add(key)
    out.push({ tag, attr, url, active })
  }
  for (const [tag, attr, active] of TAG_ATTRS) {
    const re = new RegExp(`<${tag}\\b[^>]*?\\b${attr}\\s*=\\s*["']([^"']+)["']`, 'gi')
    for (const m of html.matchAll(re)) {
      const u = m[1]
      if (/^http:\/\//i.test(u)) push(tag, attr, u, active)
    }
  }
  // img / source 的 srcset（多候选）
  for (const m of html.matchAll(/<(?:img|source)\b[^>]*?\bsrcset\s*=\s*["']([^"']+)["']/gi)) {
    for (const u of splitUrls(m[1])) {
      if (/^http:\/\//i.test(u)) push('img', 'srcset', u, false)
    }
  }
  // 内联样式与 <style> 中的 url(...)
  for (const m of html.matchAll(/url\(\s*['"]?(http:\/\/[^'"()\s]+)['"]?\s*\)/gi)) {
    push('css', 'url()', m[1], false)
  }
  return out
}

export type RiskLevel = '安全' | '警告' | '风险'

export interface Assessment {
  readonly pageUrl: string
  readonly isHttps: boolean
  readonly count: number
  readonly activeCount: number
  readonly passiveCount: number
  readonly byType: Readonly<Record<string, number>>
  readonly level: RiskLevel
  readonly summary: string
}

/** 校验页面 URL，返回是否 https */
export function assertPageUrl(pageUrl: string): boolean {
  const trimmed = pageUrl.trim()
  if (trimmed === '') throw new MixedContentError('请填写页面 URL，用于判定页面本身是否为 https')
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    throw new MixedContentError('页面 URL 格式不正确，请输入以 http:// 或 https:// 开头的完整地址')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new MixedContentError('页面 URL 只支持 http:// 与 https:// 协议')
  }
  return url.protocol === 'https:'
}

/** 按资源清单评估风险等级 */
export function assessMixedContent(
  resources: readonly MixedResource[],
  isHttps: boolean,
  pageUrl: string,
): Assessment {
  const byType: Record<string, number> = {}
  let activeCount = 0
  for (const r of resources) {
    byType[r.tag] = (byType[r.tag] ?? 0) + 1
    if (r.active) activeCount++
  }
  const count = resources.length
  const passiveCount = count - activeCount
  let level: RiskLevel
  let summary: string
  if (!isHttps) {
    level = '警告'
    summary = '页面本身为 http，全站明文传输；建议先升级为 https 再处理资源引用'
  } else if (activeCount > 0) {
    level = '风险'
    summary = `发现 ${activeCount} 个主动混合内容（script/iframe 等），浏览器会直接拦截导致功能异常，必须改为 https 引用`
  } else if (count > 0) {
    level = '警告'
    summary = `发现 ${count} 个被动混合内容（图片/音视频等），浏览器可能降级显示或告警，建议改为 https 引用`
  } else {
    level = '安全'
    summary = '未发现 http:// 资源引用，页面无混合内容问题'
  }
  return { pageUrl, isHttps, count, activeCount, passiveCount, byType, level, summary }
}

/** 渲染检测报告为文本 */
export function renderReport(a: Assessment, resources: readonly MixedResource[]): string {
  const lines: string[] = []
  lines.push(`页面 URL：${a.pageUrl}（${a.isHttps ? 'https' : 'http'}）`)
  lines.push(`风险等级：${a.level}`)
  lines.push(`结论：${a.summary}`)
  lines.push(`http:// 资源：${a.count} 个（主动 ${a.activeCount} / 被动 ${a.passiveCount}）`)
  if (a.count > 0) {
    lines.push('')
    lines.push('明细：')
    for (const r of resources) {
      lines.push(`  [${r.active ? '主动' : '被动'}] <${r.tag}> ${r.attr} = ${r.url}`)
    }
    const types = Object.entries(a.byType)
      .map(([t, n]) => `${t}×${n}`)
      .join('、')
    lines.push('')
    lines.push(`按标签统计：${types}`)
  }
  return lines.join('\n')
}

export function transform(input: MixedContentInput, _options: MixedContentOptions): string {
  if (input.text.trim() === '') return ''
  if (input.text.length > 500000) throw new MixedContentError('输入超过 500,000 字符上限')
  const isHttps = assertPageUrl(input.pageUrl)
  const resources = extractHttpResources(input.text)
  return renderReport(assessMixedContent(resources, isHttps, input.pageUrl.trim()), resources)
}
