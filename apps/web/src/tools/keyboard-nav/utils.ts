export interface FocusableElement {
  readonly tag: string
  readonly text: string
  readonly tabIndex: number
}

export interface KeyboardNavIssue {
  readonly severity: 'error' | 'warning' | 'info'
  readonly element: string
  readonly message: string
}

export interface KeyboardNavAnalysis {
  readonly focusable: FocusableElement[]
  readonly issues: KeyboardNavIssue[]
  readonly stats: {
    readonly total: number
    readonly byTag: Record<string, number>
  }
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

function short(text: string, max = 40): string {
  return text.length <= max ? text : text.slice(0, max) + '…'
}

/** 元素简述：<tag> "文本" */
function describe(el: Element): string {
  const tag = el.tagName.toLowerCase()
  const label = el.getAttribute('aria-label')?.trim()
  const value = el.getAttribute('value')?.trim()
  const text = label || el.textContent!.trim().replace(/\s+/g, ' ') || value || ''
  return text === '' ? `<${tag}>` : `<${tag}> "${short(text)}"`
}

const FOCUSABLE_SELECTOR =
  'a[href],a[tabindex],button,input,select,textarea,[tabindex],[contenteditable]'

/**
 * 分析 HTML 的键盘导航情况：
 * - 收集可聚焦元素（跳过 disabled 与 hidden）
 * - 检查 tabindex 非法值 / 正 tabindex / 重复正 tabindex
 * - 检查 div/span 用 on* 属性模拟交互、a 无 href、跳过链接缺失
 */
export function analyzeKeyboardNav(
  html: string,
  createDoc?: DocFactory,
): KeyboardNavAnalysis {
  const doc = parseHtml(html, createDoc)
  const body = doc.body
  const focusable: FocusableElement[] = []
  const issues: KeyboardNavIssue[] = []
  const positiveTabindex = new Map<number, number>()

  for (const el of Array.from(body.querySelectorAll(FOCUSABLE_SELECTOR))) {
    const tag = el.tagName.toLowerCase()
    if (el.hasAttribute('disabled')) continue
    if (tag === 'input') {
      const type = (el.getAttribute('type') ?? 'text').toLowerCase()
      if (type === 'hidden') continue
    }
    if (el.getAttribute('contenteditable') === 'false') continue

    const tabAttr = el.getAttribute('tabindex')
    let tabIndex = 0
    if (tabAttr !== null) {
      const n = Number(tabAttr)
      if (!Number.isInteger(n)) {
        issues.push({
          severity: 'error',
          element: describe(el),
          message: `tabindex="${tabAttr}" 非法：必须为整数`,
        })
        continue
      }
      tabIndex = n
      if (n > 0) {
        issues.push({
          severity: 'warning',
          element: describe(el),
          message: `正 tabindex (${n}) 会打乱自然 Tab 顺序，建议改为 0 或重排 DOM`,
        })
        positiveTabindex.set(n, (positiveTabindex.get(n) ?? 0) + 1)
      } else if (n < -1) {
        issues.push({
          severity: 'error',
          element: describe(el),
          message: `tabindex="${n}" 非法：有效值只有 -1、0 或正整数`,
        })
      }
    }

    if (tag === 'a' && !el.hasAttribute('href')) {
      issues.push({
        severity: 'warning',
        element: describe(el),
        message: 'a 标签无 href：Tab 无法聚焦，请补 href 或改用 button',
      })
    }

    focusable.push({ tag, text: describe(el), tabIndex })
  }

  // 重复的正 tabindex
  for (const [n, count] of positiveTabindex) {
    if (count > 1) {
      issues.push({
        severity: 'warning',
        element: `tabindex="${n}"`,
        message: `${count} 个元素共用 tabindex="${n}"，Tab 顺序按 DOM 先后，难以预测`,
      })
    }
  }

  // div/span 用 on* 属性模拟可交互元素
  for (const el of Array.from(body.querySelectorAll('div,span'))) {
    const hasHandler = Array.from(el.attributes).some((attr) =>
      attr.name.toLowerCase().startsWith('on'),
    )
    if (!hasHandler) continue
    if (el.hasAttribute('role') || el.hasAttribute('tabindex')) continue
    issues.push({
      severity: 'warning',
      element: describe(el),
      message: '用 div/span 模拟可交互元素：请改用原生 button/a，或补 role、tabindex="0" 与键盘事件',
    })
  }

  // 跳过链接
  const hasSkipLink = body.querySelector('a[href^="#"]') !== null
  if (!hasSkipLink && focusable.length > 0) {
    issues.push({
      severity: 'info',
      element: '<body>',
      message: '建议在页面顶部添加“跳到主要内容”的跳过链接，方便键盘用户',
    })
  }

  const byTag: Record<string, number> = {}
  for (const f of focusable) {
    byTag[f.tag] = (byTag[f.tag] ?? 0) + 1
  }

  return { focusable, issues, stats: { total: focusable.length, byTag } }
}

/** 分析结果格式化为文本 */
export function formatAnalysis(analysis: KeyboardNavAnalysis): string {
  const lines = [
    `可聚焦元素：${analysis.stats.total} 个`,
    ...Object.entries(analysis.stats.byTag).map(([tag, n]) => `- <${tag}>：${n} 个`),
    '',
    'Tab 顺序（前 20 个）：',
  ]
  const ordered = [...analysis.focusable].sort((a, b) => {
    const rank = (t: number) => (t > 0 ? 0 : t === 0 ? 1 : 2)
    return rank(a.tabIndex) - rank(b.tabIndex) || a.tabIndex - b.tabIndex
  })
  for (const f of ordered.slice(0, 20)) {
    lines.push(`- [tabindex=${f.tabIndex}] ${f.text}`)
  }
  if (ordered.length > 20) lines.push(`…还有 ${ordered.length - 20} 个`)
  lines.push('', '问题：')
  if (analysis.issues.length === 0) {
    lines.push('未发现问题 ✓')
  }
  for (const issue of analysis.issues) {
    const mark = issue.severity === 'error' ? '✗' : issue.severity === 'warning' ? '⚠' : 'ℹ'
    lines.push(`${mark} ${issue.element}：${issue.message}`)
  }
  return lines.join('\n')
}
