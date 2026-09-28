/**
 * skip-link —— 跳转链接的纯函数层
 *
 * 生成"跳转到主要内容"链接的 HTML + CSS（默认视觉隐藏、聚焦时可见），
 * 并可检测已有 HTML 是否包含跳过链接。
 */

/** 默认跳转目标 id */
export const DEFAULT_TARGET_ID = 'main-content'

/** 默认链接文案 */
export const DEFAULT_LABEL = '跳转到主要内容'

export interface SkipLinkParams {
  readonly targetId: string
  readonly label: string
}

export interface SkipLinkSnippet {
  readonly html: string
  readonly css: string
}

/** HTML 转义（防注入） */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** 校验跳转目标 id：非空且符合 HTML id 规则 */
export function validateTargetId(id: string): string {
  const text = id.trim()
  if (text === '') throw new Error('跳转目标 id 不能为空')
  if (!/^[A-Za-z][\w:.-]*$/.test(text)) {
    throw new Error('跳转目标 id 不合法：须以字母开头，可含字母、数字、下划线、连字符、点、冒号')
  }
  return text
}

/** 校验链接文案 */
export function validateLabel(label: string): string {
  const text = label.trim()
  if (text === '') throw new Error('链接文案不能为空')
  if (text.length > 60) throw new Error(`链接文案过长：${text.length} 字符，超过 60 上限`)
  return text
}

/** 生成跳转链接 HTML + CSS */
export function generateSkipLink(params: SkipLinkParams): SkipLinkSnippet {
  const targetId = validateTargetId(params.targetId)
  const label = validateLabel(params.label)
  const html = `<a class="skip-link" href="#${escapeHtml(targetId)}">${escapeHtml(label)}</a>`
  const css = [
    '/* 跳过链接：默认视觉隐藏，键盘聚焦时显示 */',
    '.skip-link {',
    '  position: absolute;',
    '  left: -9999px;',
    '  top: auto;',
    '  width: 1px;',
    '  height: 1px;',
    '  overflow: hidden;',
    '}',
    '.skip-link:focus,',
    '.skip-link:focus-visible {',
    '  position: fixed;',
    '  top: 0.5rem;',
    '  left: 0.5rem;',
    '  width: auto;',
    '  height: auto;',
    '  padding: 0.5rem 1rem;',
    '  background: #fff;',
    '  color: #000;',
    '  z-index: 9999;',
    '}',
  ].join('\n')
  return { html, css }
}

export interface SkipLinkMatch {
  readonly text: string
  readonly href: string
  readonly targetExists: boolean
}

export interface SkipLinkDetection {
  readonly found: boolean
  readonly matches: SkipLinkMatch[]
}

/** HTML → Document 的构造器，可注入（测试用 jsdom 注入或自定义） */
export type DocFactory = (html: string) => Document

function defaultDocFactory(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html')
}

function parseHtml(html: string, createDoc: DocFactory = defaultDocFactory): Document {
  const trimmed = html.trim()
  if (trimmed === '') throw new Error('请输入 HTML')
  return createDoc(trimmed)
}

/**
 * 检测 HTML 是否已有跳过链接：
 * href 以 # 开头，且文本含"跳过/skip"或 class 含 skip。
 */
export function detectSkipLink(html: string, createDoc?: DocFactory): SkipLinkDetection {
  const doc = parseHtml(html, createDoc)
  const matches: SkipLinkMatch[] = []
  for (const el of Array.from(doc.body.querySelectorAll('a[href^="#"]'))) {
    const href = el.getAttribute('href')!
    const text = el.textContent!.trim().replace(/\s+/g, ' ')
    const cls = (el.getAttribute('class') ?? '').toLowerCase()
    const looksLikeSkip =
      /跳转|跳过|skip/i.test(text) || cls.includes('skip') || cls.includes('skip-link')
    if (!looksLikeSkip) continue
    const targetId = href.slice(1)
    const targetExists = targetId !== '' && doc.getElementById(targetId) !== null
    matches.push({ text, href, targetExists })
  }
  return { found: matches.length > 0, matches }
}

/** 生成结果 + 检测结果 → 可复制的文本报告 */
export function formatSkipLinkReport(
  snippet: SkipLinkSnippet,
  detection: SkipLinkDetection | null,
): string {
  const lines: string[] = []
  lines.push('生成的跳转链接 HTML：')
  lines.push(snippet.html)
  lines.push('')
  lines.push('配套 CSS：')
  lines.push(snippet.css)
  lines.push('')
  lines.push(
    '使用说明：将 HTML 放在 <body> 的最前面，并确保页面有对应 id 的主内容区（如 <main id="main-content">）。',
  )
  if (detection !== null) {
    lines.push('')
    if (detection.found) {
      lines.push(`检测到 ${detection.matches.length} 个跳过链接：`)
      for (const m of detection.matches) {
        const target = m.targetExists ? '目标存在' : '目标不存在（href 指向的 id 在文档中找不到）'
        lines.push(`- "${m.text}"（${m.href}，${target}）`)
      }
    } else {
      lines.push('未检测到跳过链接：建议添加，方便键盘用户直达主要内容。')
    }
  }
  return lines.join('\n')
}
