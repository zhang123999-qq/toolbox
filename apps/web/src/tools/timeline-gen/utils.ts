import type { Translate } from '../../i18n'
import { inputSchema } from './schema'
import type { TimelineGenOptions } from './schema'

/** 最多解析的事件数：超出后只取前 N 条并在 UI 提示，避免超长输入拖慢渲染 */
export const MAX_EVENTS = 500

/** 一天的毫秒数（事件间隔天数换算用） */
const DAY_MS = 86_400_000

/** 日期格式：严格 YYYY-MM-DD */
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

/** 解析后的一条事件（日期已校验为真实日历日期） */
export interface TimelineEvent {
  readonly date: Date
  /** 原样回显的日期串（YYYY-MM-DD） */
  readonly dateText: string
  readonly title: string
  readonly description: string
}

/** parseEvents 的返回：按日期升序的事件与是否发生截断 */
export interface ParsedEvents {
  readonly events: readonly TimelineEvent[]
  readonly truncated: boolean
}

/** 内置示例（3 个）：「示例」按钮填入第 1 个，全部示例见 README */
export const EXAMPLES: readonly string[] = [
  `2026-01-05 | 立项 | 确定做在线工具库
2026-03-12 | 内测 | 邀请 50 位用户试用
2026-06-01 | 公测 | 开放注册
2026-09-27 | v0.0.4 发布 | 310 个工具上线`,
  `2018-09-01 | 入学 | XX 大学计算机系
2022-06-30 | 毕业 | 获学士学位
2022-07-15 | 入职 | 前端工程师
2024-03-01 | 晋升 | 高级前端工程师`,
  `# 项目里程碑（# 开头为注释，会被忽略）
2025-01-01 | 需求冻结

2025-02-15 | 开发完成 | 前后端联调通过
2025-03-01 | 上线`,
]

/** HTML 转义：用户输入的标题 / 描述在拼 HTML 前必须经过它（防 XSS） */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** 严格解析 YYYY-MM-DD：格式 / 范围 / 真实日历日期三层校验，错误信息走 i18n */
export function parseDateStrict(text: string, t: Translate): Date {
  const m = DATE_PATTERN.exec(text.trim())
  if (m === null) {
    throw new Error(t('timelineGen.error.badDate', { value: text.trim() }))
  }
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error(t('timelineGen.error.badDate', { value: text.trim() }))
  }
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new Error(t('timelineGen.error.badDate', { value: text.trim() }))
  }
  return date
}

/**
 * 解析单行事件。空行与 `#` 注释行返回 null（跳过）；
 * 格式错误 / 标题为空 / 日期非法时抛双语错误（走 i18n）。
 */
export function parseLine(line: string, lineNo: number, t: Translate): TimelineEvent | null {
  const trimmed = line.trim()
  if (trimmed === '' || trimmed.startsWith('#')) return null
  const parts = trimmed.split('|')
  if (parts.length < 2) {
    throw new Error(t('timelineGen.error.badLine', { line: lineNo }))
  }
  const title = parts[1].trim()
  if (title === '') {
    throw new Error(t('timelineGen.error.emptyTitle', { line: lineNo }))
  }
  const date = parseDateStrict(parts[0], t)
  const description = parts.slice(2).join('|').trim()
  return { date, dateText: parts[0].trim(), title, description }
}

/**
 * 解析全部事件：Zod 校验 → 逐行解析 → 按日期升序 → 超过 MAX_EVENTS 截断。
 * 输入全空返回空事件（UI 显示引导文案，不视为错误）；
 * 输入非空但一行有效事件都没有 → 抛双语错误。
 */
export function parseEvents(raw: string, t: Translate): ParsedEvents {
  const parsed = inputSchema.parse({ text: raw })
  if (parsed.text.trim() === '') {
    return { events: [], truncated: false }
  }
  const lines = parsed.text.split('\n')
  const events: TimelineEvent[] = []
  lines.forEach((line, index) => {
    const event = parseLine(line, index + 1, t)
    if (event !== null) events.push(event)
  })
  if (events.length === 0) {
    throw new Error(t('timelineGen.error.noValidEvents'))
  }
  events.sort((a, b) => a.date.getTime() - b.date.getTime())
  if (events.length <= MAX_EVENTS) {
    return { events, truncated: false }
  }
  return { events: events.slice(0, MAX_EVENTS), truncated: true }
}

/** 两日期相差天数（四舍五入，忽略时分秒） */
export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / DAY_MS)
}

/** 时间线自带样式（tl- 前缀避免与站点样式冲突，随 HTML 一起输出） */
const TIMELINE_STYLE = `<style>
.tl{font-size:14px;line-height:1.6}
.tl-list{list-style:none;margin:0;padding:0}
.tl-vertical .tl-list{border-left:2px solid #cbd5e1;margin-left:8px;padding-left:20px}
.tl-vertical .tl-item{position:relative;margin:0 0 18px}
.tl-vertical .tl-dot{position:absolute;left:-27px;top:6px;width:10px;height:10px;border-radius:50%;background:#3b82f6;border:2px solid #fff;box-shadow:0 0 0 2px #3b82f6}
.tl-horizontal .tl-list{display:flex;gap:0;overflow-x:auto;border-top:2px solid #cbd5e1;padding-top:20px}
.tl-horizontal .tl-item{position:relative;min-width:180px;flex:1;padding:0 12px}
.tl-horizontal .tl-dot{position:absolute;top:-27px;left:12px;width:10px;height:10px;border-radius:50%;background:#3b82f6;border:2px solid #fff;box-shadow:0 0 0 2px #3b82f6}
.tl-date{font-size:12px;color:#64748b;font-variant-numeric:tabular-nums}
.tl-title{font-weight:600;color:#0f172a}
.tl-desc{color:#475569;font-size:13px}
.tl-gap{font-size:12px;color:#8a6d1b;background:#fef9c3;border-radius:4px;display:inline-block;padding:0 6px;margin-top:4px}
</style>`

/**
 * 生成时间线 HTML（纯函数，不碰 DOM）：
 * 用户内容全部经 escapeHtml，结构固定，便于单测断言。
 */
export function buildTimelineHtml(
  events: readonly TimelineEvent[],
  options: TimelineGenOptions,
  t: Translate,
): string {
  const directionClass = options.direction === 'horizontal' ? 'tl-horizontal' : 'tl-vertical'
  const items = events
    .map((event, index) => {
      const desc =
        event.description === ''
          ? ''
          : `<div class="tl-desc">${escapeHtml(event.description)}</div>`
      const gap =
        options.showGap && index > 0
          ? `<div class="tl-gap">${escapeHtml(t('timelineGen.gapDays', { days: daysBetween(events[index - 1].date, event.date) }))}</div>`
          : ''
      return `<li class="tl-item"><span class="tl-dot"></span><div class="tl-date">${escapeHtml(event.dateText)}</div><div class="tl-title">${escapeHtml(event.title)}</div>${desc}${gap}</li>`
    })
    .join('')
  return `${TIMELINE_STYLE}<div class="tl ${directionClass}"><ol class="tl-list">${items}</ol></div>`
}
