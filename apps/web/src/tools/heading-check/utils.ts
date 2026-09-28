import { MAX_INPUT } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class HeadingCheckError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'HeadingCheckError'
  }
}

export interface Heading {
  /** 文档中的出现顺序（从 1 开始） */
  readonly order: number
  readonly level: 1 | 2 | 3 | 4 | 5 | 6
  readonly text: string
}

/** 去掉标签、压缩空白，得到标题纯文本 */
export function cleanHeadingText(innerHtml: string): string {
  return innerHtml
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

/** 从 HTML 中按文档顺序提取 h1–h6（纯函数，可单测） */
export function parseHeadings(html: string): Heading[] {
  const headings: Heading[] = []
  const re = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1\s*>/gi
  let m: RegExpExecArray | null
  let order = 0
  while ((m = re.exec(html)) !== null) {
    order += 1
    headings.push({
      order,
      level: Number(m[1]) as Heading['level'],
      text: cleanHeadingText(m[2]),
    })
  }
  return headings
}

export type IssueLevel = 'error' | 'warning'

export interface HeadingIssue {
  readonly level: IssueLevel
  readonly message: string
  /** 关联的标题序号（文档顺序），无关联时为 null */
  readonly order: number | null
}

export interface HeadingCheckResult {
  readonly total: number
  readonly h1Count: number
  readonly issues: readonly HeadingIssue[]
  readonly score: number
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

/** 检查标题结构（纯函数，可单测） */
export function checkHeadings(headings: readonly Heading[]): HeadingCheckResult {
  const issues: HeadingIssue[] = []
  let score = 100

  const h1Count = headings.filter((h) => h.level === 1).length
  if (headings.length === 0) {
    issues.push({ level: 'error', message: '未找到任何标题标签（h1–h6）', order: null })
    return { total: 0, h1Count: 0, issues, score: 0 }
  }
  if (h1Count === 0) {
    issues.push({
      level: 'error',
      message: '缺少 h1 标题：每个页面应有且仅有 1 个 h1',
      order: null,
    })
    score -= 30
  } else if (h1Count > 1) {
    issues.push({
      level: 'error',
      message: `存在 ${h1Count} 个 h1 标题，建议只保留 1 个`,
      order: null,
    })
    score -= 15
  }

  let jumpPenalty = 0
  let emptyPenalty = 0
  let longPenalty = 0
  for (let i = 1; i < headings.length; i++) {
    const prev = headings[i - 1]
    const cur = headings[i]
    if (cur.level > prev.level + 1) {
      issues.push({
        level: 'warning',
        message: `第 ${cur.order} 个标题从 h${prev.level} 直接跳到 h${cur.level}，层级跳跃（建议逐级使用）`,
        order: cur.order,
      })
      jumpPenalty += 10
    }
  }
  for (const h of headings) {
    if (h.text === '') {
      issues.push({
        level: 'warning',
        message: `第 ${h.order} 个标题（h${h.level}）内容为空`,
        order: h.order,
      })
      emptyPenalty += 10
    } else if ([...h.text].length > 70) {
      issues.push({
        level: 'warning',
        message: `第 ${h.order} 个标题过长（${[...h.text].length} 字符），建议不超过 70 字符`,
        order: h.order,
      })
      longPenalty += 5
    }
  }
  const seen = new Map<string, number>()
  for (const h of headings) {
    if (h.text === '') continue
    seen.set(h.text, (seen.get(h.text) ?? 0) + 1)
  }
  let dupPenalty = 0
  for (const [text, count] of seen) {
    if (count >= 2) {
      issues.push({ level: 'warning', message: `标题「${text}」重复出现 ${count} 次`, order: null })
      dupPenalty += 10
    }
  }

  score -=
    Math.min(30, jumpPenalty) +
    Math.min(20, emptyPenalty) +
    Math.min(15, longPenalty) +
    Math.min(20, dupPenalty)
  return { total: headings.length, h1Count, issues, score: clampScore(score) }
}

/** 渲染大纲树文本 */
export function renderOutline(headings: readonly Heading[]): string {
  return headings
    .map((h) => `${'  '.repeat(h.level - 1)}h${h.level} ${h.text === '' ? '（空）' : h.text}`)
    .join('\n')
}

/** 渲染检查报告文本（复制 / 下载用） */
export function renderReport(headings: readonly Heading[], result: HeadingCheckResult): string {
  const lines: string[] = []
  lines.push(
    `标题总数：${result.total}\u3000h1 数量：${result.h1Count}\u3000综合评分：${result.score} / 100`,
  )
  lines.push('')
  lines.push('大纲：')
  lines.push(renderOutline(headings))
  lines.push('')
  if (result.issues.length === 0) {
    lines.push('未发现问题，标题结构良好')
  } else {
    lines.push(`发现 ${result.issues.length} 个问题：`)
    result.issues.forEach((issue, i) => {
      lines.push(`  ${i + 1}. [${issue.level === 'error' ? '错误' : '警告'}] ${issue.message}`)
    })
  }
  return lines.join('\n')
}

/** 入口：校验 HTML 并返回解析与检查结果 */
export function analyzeHtml(html: string): { headings: Heading[]; result: HeadingCheckResult } {
  const trimmed = html.trim()
  if (trimmed === '') throw new HeadingCheckError('请粘贴页面的 HTML 源码')
  if (trimmed.length > MAX_INPUT) throw new HeadingCheckError(`输入超过 ${MAX_INPUT} 字符上限`)
  const headings = parseHeadings(trimmed)
  return { headings, result: checkHeadings(headings) }
}
