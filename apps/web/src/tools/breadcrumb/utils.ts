/**
 * 面包屑生成：语义化 HTML（nav + ol + aria）与 JSON-LD BreadcrumbList。
 * 输入行格式「名称 || URL」与 #625 json-ld 的面包屑输入兼容。
 */

/** 输入非法时抛出，由 UI 捕获展示 */
export class BreadcrumbError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BreadcrumbError'
  }
}

export interface BreadcrumbItem {
  readonly name: string
  readonly url: string
}

export type IssueLevel = 'error' | 'warning' | 'info'

export interface BreadcrumbIssue {
  readonly level: IssueLevel
  readonly message: string
}

/** 是否合法的 http(s) 绝对 URL */
function isHttpUrl(raw: string): boolean {
  try {
    const u = new URL(raw)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

/** 解析层级列表：每行「名称 || URL」，空行跳过 */
export function parseBreadcrumbItems(text: string): BreadcrumbItem[] {
  if (text.trim() === '') throw new BreadcrumbError('请输入面包屑层级（每行「名称 || URL」）')
  const items: BreadcrumbItem[] = []
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (line === '') continue
    const parts = line.split('||')
    items.push({ name: parts[0].trim(), url: (parts[1] ?? '').trim() })
  }
  return items
}

/** HTML 转义 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * 生成语义化面包屑 HTML：nav（aria-label）+ ol；
 * 末项用 aria-current="page" 标记，无 URL 的中间项渲染为纯文本。
 */
export function buildBreadcrumbHtml(items: readonly BreadcrumbItem[]): string {
  const lis = items.map((item, i) => {
    const last = i === items.length - 1
    const name = escapeHtml(item.name)
    const inner =
      !last && item.url !== ''
        ? `<a href="${escapeHtml(item.url)}">${name}</a>`
        : `<span${last ? ' aria-current="page"' : ''}>${name}</span>`
    return `    <li>${inner}</li>`
  })
  return `<nav aria-label="面包屑">\n  <ol>\n${lis.join('\n')}\n  </ol>\n</nav>`
}

/**
 * 生成 JSON-LD BreadcrumbList，结构与 #625 json-ld 兼容：
 * position 从 1 连续编号，有 URL 时带 item 字段。
 */
export function buildBreadcrumbJsonLd(items: readonly BreadcrumbItem[]): string {
  const obj = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      ...(item.url !== '' ? { item: item.url } : {}),
    })),
  }
  return JSON.stringify(obj, null, 2)
}

/** Schema 校验：名称必填、URL 建议填写且合法、position 由生成器保证连续 */
export function validateBreadcrumb(items: readonly BreadcrumbItem[]): BreadcrumbIssue[] {
  const issues: BreadcrumbIssue[] = []
  items.forEach((item, i) => {
    const n = i + 1
    if (item.name === '') {
      issues.push({ level: 'error', message: `第 ${n} 条：名称不能为空` })
    }
    if (item.url === '') {
      issues.push({ level: 'info', message: `第 ${n} 条：URL 为空（非末项建议填写；末项可代表当前页）` })
    } else if (!isHttpUrl(item.url)) {
      issues.push({ level: 'error', message: `第 ${n} 条：URL 不是合法的 http(s) 绝对地址：${item.url}` })
    }
  })
  return issues
}
