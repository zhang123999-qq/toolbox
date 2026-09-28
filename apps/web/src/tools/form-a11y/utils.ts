/**
 * form-a11y（#730）纯函数：表单 HTML 无障碍检查。
 *
 * 检查：控件标签关联 / placeholder 冒充 label / 必填标识 / aria-describedby
 * 指向 / 错误提示关联 / fieldset-legend 分组 / 提交按钮 / 图片按钮 alt / 重复 id。
 * DOM 构造可注入（测试用 jsdom）。
 */

export type FormA11ySeverity = 'error' | 'warning' | 'info'

export interface FormA11yIssue {
  readonly severity: FormA11ySeverity
  readonly message: string
  /** 元素速写，如 <input#name.email> */
  readonly element: string
}

export interface FormA11yResult {
  readonly issues: readonly FormA11yIssue[]
  readonly controlCount: number
  readonly labeledCount: number
  readonly errorCount: number
  readonly warningCount: number
}

/** HTML → Document 的构造器，可注入（测试用 jsdom 注入或自定义） */
export type DocFactory = (html: string) => Document

function defaultDocFactory(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html')
}

function parseHtml(html: string, createDoc: DocFactory = defaultDocFactory): Document {
  if (html.trim() === '') throw new Error('请粘贴表单 HTML')
  return createDoc(html)
}

/** 可聚焦的表单控件（排除隐藏域与按钮类 input，按钮单独检查） */
const CONTROL_SELECTOR =
  'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]), select, textarea'

function describeElement(el: Element): string {
  const tag = el.tagName.toLowerCase()
  const id = el.getAttribute('id')
  const name = el.getAttribute('name')
  const type = el.getAttribute('type')
  let desc = `<${tag}`
  if (type) desc += ` type=${type}`
  if (id) desc += `#${id}`
  else if (name) desc += ` name=${name}`
  return desc + '>'
}

function hasAccessibleName(el: Element, doc: Document): boolean {
  if ((el.getAttribute('aria-label') ?? '').trim() !== '') return true
  const labelledBy = el.getAttribute('aria-labelledby') ?? ''
  if (labelledBy.trim() !== '' && labelledBy.split(/\s+/).some((id) => doc.getElementById(id))) return true
  const id = el.getAttribute('id')
  if (id) {
    const labels = Array.from(doc.getElementsByTagName('label'))
    if (labels.some((lb) => lb.getAttribute('for') === id)) return true
  }
  let parent: Element | null = el.parentElement
  while (parent) {
    if (parent.tagName.toLowerCase() === 'label') return true
    parent = parent.parentElement
  }
  return false
}

function visibleText(el: Element): string {
  // Element.textContent 按 DOM 规范恒为字符串（仅 Document/DocumentType 可为 null）
  return el.textContent!.replace(/\s+/g, ' ').trim()
}

/** 与控件关联的 label 文本（for 关联优先，其次包裹式） */
function associatedLabelText(el: Element, doc: Document): string {
  const id = el.getAttribute('id')
  if (id) {
    const lb = Array.from(doc.getElementsByTagName('label')).find((l) => l.getAttribute('for') === id)
    if (lb) return visibleText(lb)
  }
  const wrapped = el.closest('label')
  return wrapped ? visibleText(wrapped) : ''
}

/**
 * 分析表单 HTML，返回问题列表与统计。
 */
export function analyzeFormA11y(html: string, createDoc: DocFactory = defaultDocFactory): FormA11yResult {
  const doc = parseHtml(html, createDoc)
  const issues: FormA11yIssue[] = []

  const controls = Array.from(doc.querySelectorAll(CONTROL_SELECTOR))
  let labeledCount = 0

  // 重复 id 检查
  const seenIds = new Map<string, number>()
  for (const el of doc.querySelectorAll('[id]')) {
    const id = el.getAttribute('id') as string
    seenIds.set(id, (seenIds.get(id) ?? 0) + 1)
  }
  for (const [id, count] of seenIds) {
    if (count > 1) {
      issues.push({ severity: 'error', message: `id「${id}」重复出现 ${count} 次`, element: `#${id}` })
    }
  }

  for (const el of controls) {
    const desc = describeElement(el)
    const labeled = hasAccessibleName(el, doc)
    if (labeled) {
      labeledCount += 1
    } else {
      issues.push({ severity: 'error', message: '表单控件缺少标签：请用 <label>、aria-label 或 aria-labelledby 关联', element: desc })
    }

    const placeholder = el.getAttribute('placeholder') ?? ''
    if (!labeled && placeholder.trim() !== '') {
      issues.push({ severity: 'warning', message: 'placeholder 不能替代 label：占位符在输入后消失，读屏也常跳过', element: desc })
    }

    // 必填标识：required 应有可见或无障碍的必填提示
    if (el.hasAttribute('required')) {
      const ariaRequired = el.getAttribute('aria-required')
      const marked = ariaRequired === 'true' || /[*＊]|必填|required/i.test(associatedLabelText(el, doc))
      if (!marked) {
        issues.push({ severity: 'warning', message: '必填项缺少必填标识：建议加 aria-required="true" 或可见的 * / 必填字样', element: desc })
      }
    }

    // aria-describedby 指向存在性
    const describedBy = el.getAttribute('aria-describedby') ?? ''
    if (describedBy.trim() !== '') {
      const missing = describedBy
        .split(/\s+/)
        .filter((id) => id !== '' && !doc.getElementById(id))
      if (missing.length > 0) {
        issues.push({ severity: 'warning', message: `aria-describedby 指向不存在的 id：${missing.join('、')}`, element: desc })
      }
    }

    // aria-invalid=true 却无错误提示关联
    if (el.getAttribute('aria-invalid') === 'true' && describedBy.trim() === '') {
      issues.push({ severity: 'warning', message: 'aria-invalid="true" 却未关联错误提示：建议用 aria-describedby 指向错误文本', element: desc })
    }
  }

  // 图片按钮必须有 alt
  for (const el of Array.from(doc.querySelectorAll('input[type="image"]'))) {
    const alt = el.getAttribute('alt') ?? ''
    if (alt.trim() === '') {
      issues.push({ severity: 'error', message: '图片提交按钮缺少 alt 文本', element: describeElement(el) })
    }
  }

  // fieldset 应有 legend
  for (const fs of Array.from(doc.querySelectorAll('fieldset'))) {
    const hasLegend = Array.from(fs.children).some((c) => c.tagName.toLowerCase() === 'legend')
    if (!hasLegend) {
      issues.push({ severity: 'warning', message: 'fieldset 缺少 legend：分组缺少无障碍名称', element: '<fieldset>' })
    }
  }

  // 提交按钮存在性（每个 form 单独看）
  const forms = Array.from(doc.querySelectorAll('form'))
  const scopes: Array<{ root: Element | Document; label: string }> =
    forms.length > 0 ? forms.map((f, i) => ({ root: f, label: `第 ${i + 1} 个表单` })) : [{ root: doc, label: '页面' }]
  for (const { root, label } of scopes) {
    const hasSubmit =
      root.querySelector('button[type="submit"], input[type="submit"], input[type="image"]') !== null ||
      Array.from(root.querySelectorAll('button')).some((b) => !b.hasAttribute('type') || b.getAttribute('type') === 'submit')
    if (!hasSubmit && root.querySelector(CONTROL_SELECTOR) !== null) {
      issues.push({ severity: 'warning', message: `${label}缺少提交按钮：键盘用户可能无法提交`, element: '<form>' })
    }
  }

  const errorCount = issues.filter((i) => i.severity === 'error').length
  const warningCount = issues.filter((i) => i.severity === 'warning').length
  return { issues, controlCount: controls.length, labeledCount, errorCount, warningCount }
}

/**
 * 渲染文本报告（供输出区 / 复制 / 下载）。
 */
export function formatFormA11yResult(result: FormA11yResult): string {
  const lines = [
    `控件数：${result.controlCount} 已关联标签：${result.labeledCount} 错误：${result.errorCount} 警告：${result.warningCount}`,
    '',
  ]
  if (result.issues.length === 0) {
    lines.push('未发现无障碍问题。')
    return lines.join('\n')
  }
  const label: Record<FormA11ySeverity, string> = { error: '错误', warning: '警告', info: '提示' }
  for (const issue of result.issues) {
    lines.push(`[${label[issue.severity]}] ${issue.message}（${issue.element}）`)
  }
  return lines.join('\n')
}
