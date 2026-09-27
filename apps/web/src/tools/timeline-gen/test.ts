import { describe, expect, it } from 'vitest'
import { createTranslator } from '../../i18n'
import {
  EXAMPLES,
  MAX_EVENTS,
  buildTimelineHtml,
  daysBetween,
  escapeHtml,
  parseDateStrict,
  parseEvents,
  parseLine,
} from './utils'
import type { TimelineGenOptions } from './schema'

const t = createTranslator('zh')
const ten = createTranslator('en')
const VERTICAL: TimelineGenOptions = { direction: 'vertical', showGap: true }

describe('timeline-gen / escapeHtml 转义', () => {
  it('5 种特殊字符全部转义（边界）', () => {
    expect(escapeHtml(`<script>alert("x&y")</script>it's`)).toBe(
      '&lt;script&gt;alert(&quot;x&amp;y&quot;)&lt;/script&gt;it&#39;s',
    )
  })

  it('普通文本原样返回', () => {
    expect(escapeHtml('2026-09-27 上线')).toBe('2026-09-27 上线')
  })
})

describe('timeline-gen / parseDateStrict 严格日期', () => {
  it('合法日期解析正确', () => {
    const d = parseDateStrict('2026-09-27', t)
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(8)
    expect(d.getDate()).toBe(27)
  })

  it('首尾空白被容忍', () => {
    expect(parseDateStrict('  2026-01-05  ', t).getDate()).toBe(5)
  })

  it('格式错误抛双语提示（边界）', () => {
    expect(() => parseDateStrict('2026/01/05', t)).toThrow('无法解析的日期')
    expect(() => parseDateStrict('not-a-date', ten)).toThrow('Unparseable date')
    expect(() => parseDateStrict('', t)).toThrow('无法解析的日期')
  })

  it('月份越界抛错（边界）', () => {
    expect(() => parseDateStrict('2026-13-01', t)).toThrow('无法解析的日期')
    expect(() => parseDateStrict('2026-00-10', t)).toThrow('无法解析的日期')
  })

  it('日期越界抛错（边界）', () => {
    expect(() => parseDateStrict('2026-01-32', t)).toThrow('无法解析的日期')
    expect(() => parseDateStrict('2026-01-00', t)).toThrow('无法解析的日期')
  })

  it('不存在的日历日期抛错（边界）', () => {
    expect(() => parseDateStrict('2026-02-30', t)).toThrow('无法解析的日期')
    expect(() => parseDateStrict('2025-02-29', t)).toThrow('无法解析的日期')
  })

  it('闰年 2 月 29 日合法', () => {
    expect(parseDateStrict('2024-02-29', t).getDate()).toBe(29)
  })
})

describe('timeline-gen / parseLine 单行解析', () => {
  it('空行返回 null（边界）', () => {
    expect(parseLine('', 1, t)).toBeNull()
    expect(parseLine('   ', 2, t)).toBeNull()
  })

  it('# 注释行返回 null（边界）', () => {
    expect(parseLine('# 里程碑', 1, t)).toBeNull()
    expect(parseLine('   # 缩进注释', 2, t)).toBeNull()
  })

  it('缺少分隔符抛双语提示（边界）', () => {
    expect(() => parseLine('2026-01-01 没有标题', 3, t)).toThrow('第 3 行格式错误')
    expect(() => parseLine('oops', 1, ten)).toThrow('Line 1 is malformed')
  })

  it('标题为空抛双语提示（边界）', () => {
    expect(() => parseLine('2026-01-01 |   ', 2, t)).toThrow('第 2 行标题为空')
    expect(() => parseLine('2026-01-01 |', 1, ten)).toThrow('empty title')
  })

  it('非法日期透出日期错误', () => {
    expect(() => parseLine('2026-13-01 | 标题', 1, t)).toThrow('无法解析的日期')
  })

  it('正常行解析出日期/标题/描述', () => {
    const event = parseLine('2026-01-05 | 立项 | 确定做工具库', 1, t)
    expect(event).toMatchObject({
      dateText: '2026-01-05',
      title: '立项',
      description: '确定做工具库',
    })
    expect(event?.date.getFullYear()).toBe(2026)
  })

  it('无描述时 description 为空串', () => {
    expect(parseLine('2026-01-05 | 立项', 1, t)).toMatchObject({ description: '' })
  })

  it('描述中的 | 原样保留', () => {
    expect(parseLine('2026-01-05 | 标题 | a | b', 1, t)).toMatchObject({ description: 'a | b' })
  })
})

describe('timeline-gen / parseEvents 多行解析', () => {
  it('空输入返回空事件且不报错（边界）', () => {
    expect(parseEvents('', t)).toEqual({ events: [], truncated: false })
    expect(parseEvents('  \n ', t).events).toHaveLength(0)
  })

  it('非空但无有效事件抛双语提示（边界）', () => {
    expect(() => parseEvents('# 只有注释', t)).toThrow('没有可解析的事件')
    expect(() => parseEvents('# only comment', ten)).toThrow('No parsable events')
  })

  it('事件按日期升序排列', () => {
    const { events } = parseEvents('2026-03-01 | C\n2026-01-01 | A\n2026-02-01 | B', t)
    expect(events.map((e) => e.title)).toEqual(['A', 'B', 'C'])
  })

  it('空行与注释行被跳过', () => {
    const { events } = parseEvents('# 注\n\n2026-01-01 | A\n   \n2026-01-02 | B', t)
    expect(events).toHaveLength(2)
  })

  it('恰好 500 条不截断（边界）', () => {
    const input = Array.from({ length: MAX_EVENTS }, (_, i) => `2026-01-01 | E${i}`).join('\n')
    const { events, truncated } = parseEvents(input, t)
    expect(events).toHaveLength(MAX_EVENTS)
    expect(truncated).toBe(false)
  })

  it('超过 500 条截断并标记（边界）', () => {
    const input = Array.from({ length: MAX_EVENTS + 1 }, (_, i) => `2026-01-01 | E${i}`).join('\n')
    const { events, truncated } = parseEvents(input, t)
    expect(events).toHaveLength(MAX_EVENTS)
    expect(truncated).toBe(true)
  })

  it('超过 200000 字符触发 Zod 上限（边界）', () => {
    expect(() => parseEvents('z'.repeat(200001), t)).toThrow(/200,000/)
  })

  it('行内错误透出对应行号', () => {
    expect(() => parseEvents('2026-01-01 | A\n坏行\n2026-01-03 | C', t)).toThrow('第 2 行')
  })
})

describe('timeline-gen / daysBetween', () => {
  it('同一天为 0', () => {
    const d = new Date(2026, 0, 1)
    expect(daysBetween(d, d)).toBe(0)
  })

  it('正向天数', () => {
    expect(daysBetween(new Date(2026, 0, 1), new Date(2026, 0, 6))).toBe(5)
  })

  it('逆序为负数', () => {
    expect(daysBetween(new Date(2026, 0, 6), new Date(2026, 0, 1))).toBe(-5)
  })
})

describe('timeline-gen / buildTimelineHtml 生成', () => {
  const events = parseEvents('2026-01-01 | 开始 | 描述A\n2026-01-06 | 上线', t).events

  it('纵向容器类名正确', () => {
    const html = buildTimelineHtml(events, VERTICAL, t)
    expect(html).toContain('class="tl tl-vertical"')
    expect(html).not.toContain('class="tl tl-horizontal"')
  })

  it('横向容器类名正确', () => {
    const html = buildTimelineHtml(events, { direction: 'horizontal', showGap: false }, t)
    expect(html).toContain('class="tl tl-horizontal"')
  })

  it('标题与描述正常输出', () => {
    const html = buildTimelineHtml(events, VERTICAL, t)
    expect(html).toContain('>开始<')
    expect(html).toContain('>描述A<')
    expect(html).toContain('2026-01-01')
  })

  it('无描述时不输出描述节点', () => {
    const html = buildTimelineHtml(events, VERTICAL, t)
    const secondItem = html.split('<li class="tl-item">')[2]
    expect(secondItem).not.toContain('tl-desc')
  })

  it('showGap 开启时第二个起标注间隔天数', () => {
    const html = buildTimelineHtml(events, VERTICAL, t)
    expect(html).toContain('<div class="tl-gap">')
    expect(html).toContain('间隔 5 天')
    // 第一个事件不标注
    const firstItem = html.split('<li class="tl-item">')[1]
    expect(firstItem).not.toContain('<div class="tl-gap">')
  })

  it('showGap 关闭时不标注', () => {
    const html = buildTimelineHtml(events, { direction: 'vertical', showGap: false }, t)
    expect(html).not.toContain('<div class="tl-gap">')
  })

  it('英文 gap 文案正确', () => {
    const html = buildTimelineHtml(events, VERTICAL, ten)
    expect(html).toContain('5 days after the previous event')
  })

  it('标题中的脚本标签被转义（边界）', () => {
    const evil = parseEvents('2026-01-01 | <script>alert(1)</script>', t).events
    const html = buildTimelineHtml(evil, VERTICAL, t)
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).not.toContain('<script>alert(1)</script>')
  })

  it('自带样式块且类名前缀为 tl-', () => {
    const html = buildTimelineHtml(events, VERTICAL, t)
    expect(html).toContain('<style>')
    expect(html).toContain('.tl-item')
  })
})

describe('timeline-gen / 内置示例', () => {
  it('提供 3 个示例', () => {
    expect(EXAMPLES).toHaveLength(3)
  })

  it('每个示例都能解析', () => {
    const counts = EXAMPLES.map((example) => parseEvents(example, t).events.length)
    expect(counts).toEqual([4, 4, 3])
  })

  it('示例互不相同', () => {
    expect(new Set(EXAMPLES).size).toBe(3)
  })
})

describe('timeline-gen / 常量', () => {
  it('事件上限符合预期', () => {
    expect(MAX_EVENTS).toBe(500)
  })
})
