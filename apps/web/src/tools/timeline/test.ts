import { describe, expect, it } from 'vitest'
import { buildTimeline, transform } from './utils'

const SAMPLE = ['2024-04-02 | 正式上线', '2024-01-15 | 项目启动', '2024-03-01 | 内测发布'].join(
  '\n',
)

describe('timeline / buildTimeline', () => {
  it('按日期升序排列（输入乱序）', () => {
    const out = buildTimeline(SAMPLE)
    const lines = out.split('\n')
    expect(lines[0]).toContain('2024-01-15')
    expect(lines[0]).toContain('项目启动')
    expect(lines[1]).toContain('2024-03-01')
    expect(lines[2]).toContain('2024-04-02')
  })

  it('标注相邻事件间隔天数', () => {
    const out = buildTimeline(SAMPLE)
    expect(out).toContain('+46 天') // 01-15 → 03-01
    expect(out).toContain('+32 天') // 03-01 → 04-02
  })

  it('跳过空行与无法解析的行', () => {
    const out = buildTimeline(
      ['', '不是事件行', '2024-01-15 | 启动', '', 'bad-date | 测试'].join('\n'),
    )
    expect(out).toBe('2024-01-15  启动')
  })

  it('没有任何有效事件时返回空串', () => {
    expect(buildTimeline('')).toBe('')
    expect(buildTimeline('只有一些\n乱七八糟的行')).toBe('')
  })
})

describe('timeline / transform', () => {
  it('transform 输出排序后的时间线', () => {
    const out = transform({ text: SAMPLE }, {})
    expect(out.split('\n')[0]).toContain('2024-01-15')
  })

  it('空输入返回空串', () => {
    expect(transform({ text: '' }, {})).toBe('')
    expect(transform({ text: '   \n  ' }, {})).toBe('')
  })

  it('超上限报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, {})).toThrow(/上限/)
  })
})
