/**
 * heading-structure —— 标题结构的纯函数层
 *
 * 与 #718 屏幕阅读器预览差异化：本工具专注标题层级结构评分，
 * 输出大纲、结构问题与修复建议。
 */

/** 标题过长的字数阈值 */
export const LONG_HEADING_CHARS = 70

export interface HeadingItem {
  readonly level: number
  readonly text: string
  readonly order: number
}

interface RawHeading {
  readonly level: number
  readonly text: string
  readonly order: number
}

export interface HeadingIssue {
  readonly severity: 'error' | 'warning' | 'info'
  readonly element: string
  readonly message: string
  readonly suggestion: string
}

export interface HeadingAnalysis {
  readonly outline: HeadingItem[]
  readonly issues: HeadingIssue[]
  readonly stats: {
    readonly total: number
    readonly h1Count: number
  }
  /** 结构评分 0–100 */
  readonly score: number
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

/**
 * 分析 HTML 的标题结构：
 * - 提取 h1–h6 大纲
 * - 检查：无标题 / 多 h1 / 层级跳跃 / 空标题 / 标题过长
 * - 输出 0–100 结构评分
 */
export function analyzeHeadings(html: string, createDoc?: DocFactory): HeadingAnalysis {
  const doc = parseHtml(html, createDoc)
  const els = Array.from(doc.body.querySelectorAll('h1,h2,h3,h4,h5,h6'))
  const raw: RawHeading[] = els.map((el, i) => ({
    level: Number(el.tagName.slice(1)),
    text: el.textContent!.trim().replace(/\s+/g, ' '),
    order: i + 1,
  }))
  const outline: HeadingItem[] = raw.map((h) => ({
    level: h.level,
    text: short(h.text),
    order: h.order,
  }))
  const issues: HeadingIssue[] = []
  let score = 100

  const h1Count = raw.filter((h) => h.level === 1).length

  if (raw.length === 0) {
    issues.push({
      severity: 'info',
      element: '（文档）',
      message: '未找到任何标题（h1–h6）',
      suggestion: '为页面内容添加层级标题，至少包含一个 h1 作为页面主标题',
    })
    score = 0
    return { outline, issues, stats: { total: 0, h1Count: 0 }, score }
  }

  if (h1Count === 0) {
    issues.push({
      severity: 'error',
      element: '（文档）',
      message: '缺少 h1：页面没有主标题',
      suggestion: '添加一个 h1 作为页面唯一主标题',
    })
    score -= 25
  } else if (h1Count > 1) {
    issues.push({
      severity: 'warning',
      element: 'h1',
      message: `发现 ${h1Count} 个 h1，页面主标题应唯一`,
      suggestion: '只保留一个 h1，其余降级为 h2',
    })
    score -= 15
  }

  for (let i = 0; i < raw.length; i++) {
    const h = raw[i] as RawHeading
    const label = `<h${h.level}> "${short(h.text)}"`
    if (h.text === '') {
      issues.push({
        severity: 'error',
        element: `<h${h.level}>（第 ${h.order} 个标题）`,
        message: '空标题：标题元素没有文本内容',
        suggestion: '填写标题文本，或删除无意义的空标题元素',
      })
      score -= 20
    }
    if (h.text.length > LONG_HEADING_CHARS) {
      issues.push({
        severity: 'warning',
        element: label,
        message: `标题过长（${h.text.length} 字，含省略号），超过 ${LONG_HEADING_CHARS} 字`,
        suggestion: '精简标题，把详细说明移到正文段落',
      })
      score -= 5
    }
    if (i > 0) {
      const prev = raw[i - 1] as RawHeading
      if (h.level > prev.level + 1) {
        issues.push({
          severity: 'warning',
          element: label,
          message: `层级跳跃：从 h${prev.level} 直接跳到 h${h.level}`,
          suggestion: `中间补上 h${prev.level + 1}，保持层级逐级递进`,
        })
        score -= 10
      }
    }
  }

  if (score < 0) score = 0
  return { outline, issues, stats: { total: outline.length, h1Count }, score }
}

/** 评分 → 等级文案 */
export function scoreGrade(score: number): string {
  if (score >= 90) return '优秀'
  if (score >= 75) return '良好'
  if (score >= 60) return '及格'
  return '需改进'
}

/** 分析结果 → 可复制的文本报告 */
export function formatHeadingReport(a: HeadingAnalysis): string {
  const lines: string[] = []
  lines.push(`标题结构评分：${a.score} 分（${scoreGrade(a.score)}）`)
  lines.push(`标题总数：${a.stats.total}，h1 数量：${a.stats.h1Count}`)
  lines.push('')
  lines.push('大纲：')
  if (a.outline.length === 0) {
    lines.push('（无）')
  } else {
    for (const h of a.outline) {
      lines.push(`${'  '.repeat(h.level - 1)}h${h.level} ${h.text === '' ? '（空标题）' : h.text}`)
    }
  }
  lines.push('')
  if (a.issues.length === 0) {
    lines.push('未发现结构问题 ✓')
  } else {
    lines.push(`发现 ${a.issues.length} 个问题：`)
    for (const issue of a.issues) {
      const tag =
        issue.severity === 'error' ? '错误' : issue.severity === 'warning' ? '警告' : '提示'
      lines.push(`[${tag}] ${issue.element}：${issue.message}`)
      lines.push(`  建议：${issue.suggestion}`)
    }
  }
  return lines.join('\n')
}
