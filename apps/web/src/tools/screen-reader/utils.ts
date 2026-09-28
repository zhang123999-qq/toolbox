/** 大纲条目类型 */
export type OutlineKind = 'heading' | 'landmark' | 'link' | 'button' | 'form' | 'image'

export interface OutlineItem {
  readonly kind: OutlineKind
  /** 标题层级（h1-h6）；非标题为 0 */
  readonly level: number
  readonly text: string
}

export interface ScreenReaderIssue {
  readonly severity: 'error' | 'warning'
  readonly message: string
}

export interface ScreenReaderPreview {
  readonly outline: OutlineItem[]
  readonly issues: ScreenReaderIssue[]
}

/** HTML → Document 的构造器，可注入（测试用 jsdom 注入或自定义） */
export type DocFactory = (html: string) => Document

function defaultDocFactory(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html')
}

/** 无意义的链接文本（大小写不敏感） */
const MEANINGLESS_LINK_TEXTS = [
  '点击这里',
  '点这里',
  '点击',
  '了解更多',
  '更多',
  '详情',
  'click here',
  'read more',
  'more',
  'learn more',
]

/**
 * 解析 HTML 字符串为 Document。空输入抛中文错。
 * createDoc 可注入，便于测试与非浏览器环境。
 */
export function parseHtml(html: string, createDoc: DocFactory = defaultDocFactory): Document {
  const trimmed = html.trim()
  if (trimmed === '') throw new Error('请输入 HTML')
  return createDoc(trimmed)
}

function cleanText(el: Element): string {
  // Element.textContent 恒为 string（null 只出现在 Document/DocumentType）
  return el.textContent!.trim().replace(/\s+/g, ' ')
}

function short(text: string, max = 60): string {
  return text.length <= max ? text : text.slice(0, max) + '…'
}

/** 元素的无障碍名称：aria-label → aria-labelledby → 可见文本 */
function accessibleName(el: Element, doc: Document): string {
  const ariaLabel = el.getAttribute('aria-label')?.trim()
  if (ariaLabel) return ariaLabel
  const labelledBy = el.getAttribute('aria-labelledby')
  if (labelledBy) {
    const parts = labelledBy
      .split(/\s+/)
      .map((id) => doc.getElementById(id))
      .filter((ref): ref is HTMLElement => ref !== null)
      .map(cleanText)
      .filter((t) => t !== '')
    if (parts.length > 0) return parts.join(' ')
  }
  return cleanText(el)
}

/** 表单控件名称：aria-label → aria-labelledby → label[for] → 包裹 label → 文本 */
function formControlName(el: Element, doc: Document): string {
  const ariaLabel = el.getAttribute('aria-label')?.trim()
  if (ariaLabel) return ariaLabel
  const labelledBy = el.getAttribute('aria-labelledby')
  if (labelledBy) {
    const parts = labelledBy
      .split(/\s+/)
      .map((id) => doc.getElementById(id))
      .filter((ref): ref is HTMLElement => ref !== null)
      .map(cleanText)
      .filter((t) => t !== '')
    if (parts.length > 0) return parts.join(' ')
  }
  const id = el.getAttribute('id')
  if (id) {
    const label = doc.querySelector(`label[for="${id}"]`)
    if (label) {
      const text = cleanText(label)
      if (text !== '') return text
    }
  }
  const wrapping = el.closest('label')
  if (wrapping) {
    const text = cleanText(wrapping)
    if (text !== '') return text
  }
  return ''
}

function landmarkName(el: Element, doc: Document): string {
  const tag = el.tagName.toLowerCase()
  const name = accessibleName(el, doc)
  return name === '' ? tag : `${tag}（${name}）`
}

/**
 * 生成屏幕阅读器预览：朗读大纲 + 问题列表。
 * 大纲按「标题 → 地标 → 链接 → 按钮 → 图片 → 表单」的阅读顺序组织。
 */
export function previewScreenReader(html: string, createDoc?: DocFactory): ScreenReaderPreview {
  const doc = parseHtml(html, createDoc)
  const body = doc.body
  const outline: OutlineItem[] = []
  const issues: ScreenReaderIssue[] = []

  // 标题层级
  let prevLevel = 0
  let h1Count = 0
  for (const h of Array.from(body.querySelectorAll('h1,h2,h3,h4,h5,h6'))) {
    const level = Number(h.tagName.slice(1))
    if (level === 1) h1Count += 1
    const text = short(cleanText(h) || '（空标题）')
    if (prevLevel !== 0 && level > prevLevel + 1) {
      issues.push({
        severity: 'warning',
        message: `标题层级跳跃：h${prevLevel} 后直接出现 h${level}（“${text}”）`,
      })
    }
    prevLevel = level
    outline.push({ kind: 'heading', level, text })
  }
  if (h1Count > 1) {
    issues.push({ severity: 'warning', message: `存在 ${h1Count} 个 h1，建议每页只保留一个` })
  }

  // 地标
  for (const lm of Array.from(body.querySelectorAll('header,nav,main,footer,aside'))) {
    outline.push({ kind: 'landmark', level: 0, text: landmarkName(lm, doc) })
  }

  // 链接
  for (const a of Array.from(body.querySelectorAll('a[href]'))) {
    const text = accessibleName(a, doc)
    if (text === '') {
      issues.push({ severity: 'error', message: '存在无文本的链接，屏幕阅读器无法朗读其目的' })
    } else {
      outline.push({ kind: 'link', level: 0, text: short(text) })
      if (MEANINGLESS_LINK_TEXTS.includes(text.toLowerCase())) {
        issues.push({
          severity: 'warning',
          message: `链接文本无意义：“${text}”，请改为描述目的地的文本`,
        })
      }
    }
  }

  // 按钮
  for (const b of Array.from(body.querySelectorAll('button,[role="button"]'))) {
    const text = accessibleName(b, doc)
    if (text === '') {
      issues.push({ severity: 'error', message: '存在无名称的按钮，屏幕阅读器只能朗读“按钮”' })
    } else {
      outline.push({ kind: 'button', level: 0, text: short(text) })
    }
  }

  // 图片
  for (const img of Array.from(body.querySelectorAll('img'))) {
    const alt = img.getAttribute('alt')
    if (alt === null) {
      issues.push({ severity: 'warning', message: '图片缺少 alt 属性，屏幕阅读器会朗读文件名' })
    } else if (alt === '') {
      outline.push({ kind: 'image', level: 0, text: '（装饰图，跳过不朗读）' })
    } else {
      outline.push({ kind: 'image', level: 0, text: short(alt) })
    }
  }

  // 表单控件
  for (const el of Array.from(body.querySelectorAll('input,select,textarea'))) {
    const tag = el.tagName.toLowerCase()
    if (tag === 'input') {
      const type = (el.getAttribute('type') ?? 'text').toLowerCase()
      if (type === 'hidden') continue
      if (type === 'submit' || type === 'button' || type === 'reset') {
        const value = el.getAttribute('value')?.trim()
        outline.push({
          kind: 'form',
          level: 0,
          text: value ? `按钮：${short(value)}` : '按钮（无 value 文本）',
        })
        continue
      }
    }
    const name = formControlName(el, doc)
    if (name === '') {
      issues.push({ severity: 'error', message: `<${tag}> 表单控件缺少 label 关联，朗读时无名称` })
    } else {
      outline.push({ kind: 'form', level: 0, text: short(name) })
    }
  }

  if (outline.length === 0 && issues.length === 0) {
    issues.push({ severity: 'warning', message: '文档中没有可朗读的内容' })
  }

  return { outline, issues }
}

const KIND_NAMES: Record<OutlineKind, string> = {
  heading: '标题',
  landmark: '地标',
  link: '链接',
  button: '按钮',
  form: '表单',
  image: '图片',
}

/** 预览结果格式化为文本 */
export function formatPreview(preview: ScreenReaderPreview): string {
  const lines = ['朗读大纲：']
  if (preview.outline.length === 0) {
    lines.push('（无）')
  }
  for (const item of preview.outline) {
    const prefix = item.kind === 'heading' ? `h${item.level}` : KIND_NAMES[item.kind]
    lines.push(`- [${prefix}] ${item.text}`)
  }
  lines.push('', '问题：')
  if (preview.issues.length === 0) {
    lines.push('未发现问题 ✓')
  }
  for (const issue of preview.issues) {
    lines.push(`${issue.severity === 'error' ? '✗' : '⚠'} ${issue.message}`)
  }
  return lines.join('\n')
}
