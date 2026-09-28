export interface TabOrderItem {
  readonly order: number
  readonly tag: string
  readonly label: string
  readonly tabIndex: number
}

export interface TabOrderResult {
  /** 按实际 Tab 键顺序排列的可聚焦元素 */
  readonly order: TabOrderItem[]
  /** tabindex=-1：可被脚本聚焦但跳过 Tab 顺序 */
  readonly skipped: TabOrderItem[]
  readonly total: number
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
  const label = (el.getAttribute('aria-label') ?? '').trim()
  const value = (el.getAttribute('value') ?? '').trim()
  const text = label || el.textContent!.trim().replace(/\s+/g, ' ') || value || ''
  return text === '' ? `<${tag}>` : `<${tag}> "${short(text)}"`
}

const FOCUSABLE_SELECTOR =
  'a[href],a[tabindex],button,input,select,textarea,[tabindex],[contenteditable]'

/** 解析 tabindex 属性：非法值按浏览器行为视为 0 */
function parseTabIndex(el: Element): number {
  const attr = el.getAttribute('tabindex')
  if (attr === null) return 0
  const n = Number(attr)
  return Number.isInteger(n) ? n : 0
}

function collect(html: string, createDoc?: DocFactory): { tag: string; label: string; tabIndex: number }[] {
  const doc = parseHtml(html, createDoc)
  const items: { tag: string; label: string; tabIndex: number }[] = []
  for (const el of Array.from(doc.body.querySelectorAll(FOCUSABLE_SELECTOR))) {
    const tag = el.tagName.toLowerCase()
    if (el.hasAttribute('disabled')) continue
    if (tag === 'input') {
      const type = (el.getAttribute('type') ?? 'text').toLowerCase()
      if (type === 'hidden') continue
    }
    if (el.getAttribute('contenteditable') === 'false') continue
    items.push({ tag, label: describe(el), tabIndex: parseTabIndex(el) })
  }
  return items
}

/**
 * 计算 HTML 的实际 Tab 键顺序（可视化用）：
 * - tabindex > 0 的元素按数值升序优先
 * - 其余按 DOM 顺序
 * - tabindex = -1 的元素跳过 Tab 顺序，单独列出
 */
export function getTabOrder(html: string, createDoc?: DocFactory): TabOrderResult {
  const items = collect(html, createDoc)
  const skipped: TabOrderItem[] = []
  const inOrder = items.filter((item) => {
    if (item.tabIndex === -1) {
      skipped.push({ order: 0, tag: item.tag, label: item.label, tabIndex: -1 })
      return false
    }
    return true
  })
  // 稳定排序：正 tabindex 优先按值升序，其余保持 DOM 顺序
  const positives = inOrder
    .filter((item) => item.tabIndex > 0)
    .sort((a, b) => a.tabIndex - b.tabIndex)
  const naturals = inOrder.filter((item) => item.tabIndex <= 0)
  const order: TabOrderItem[] = [...positives, ...naturals].map((item, i) => ({
    order: i + 1,
    tag: item.tag,
    label: item.label,
    tabIndex: item.tabIndex,
  }))
  return { order, skipped, total: items.length }
}

/** Tab 顺序结果格式化为文本（含编号徽章式序号） */
export function formatTabOrder(result: TabOrderResult): string {
  const lines = [`Tab 顺序共 ${result.order.length} 个可聚焦元素`]
  for (const item of result.order) {
    const badge = String(item.order).padStart(2, ' ')
    lines.push(`${badge}. [tabindex=${item.tabIndex}] ${item.label}`)
  }
  if (result.skipped.length > 0) {
    lines.push('', `跳过 Tab 顺序（tabindex="-1"，共 ${result.skipped.length} 个）：`)
    for (const item of result.skipped) {
      lines.push(`- ${item.label}`)
    }
  }
  lines.push('', '说明：正 tabindex 按数值优先；其余按 DOM 先后；-1 仅脚本可聚焦。')
  return lines.join('\n')
}
