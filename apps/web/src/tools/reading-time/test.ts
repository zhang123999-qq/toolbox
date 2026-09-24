import { describe, expect, it } from 'vitest'
import { formatDuration, transform } from './utils'
import type { ReadingTimeOptions } from './schema'

const base: ReadingTimeOptions = { speed: '300' }

describe('reading-time / transform', () => {
  it('输出字数与阅读速度两行', () => {
    const out = transform({ text: '工具库 toolbox' }, base)
    expect(out).toContain('字数：4 词（中文 3 字 + 英文 1 词）')
    expect(out).toContain('阅读速度：300 字/分钟')
  })

  it('速度越快，估算时长越短', () => {
    const text = { text: 'a '.repeat(900) }
    const slow = transform(text, { speed: '200' })
    const fast = transform(text, { speed: '500' })
    expect(slow).toContain('阅读速度：200 字/分钟')
    expect(fast).toContain('阅读速度：500 字/分钟')
    expect(slow).not.toBe(fast)
  })

  it('短文本按秒显示，不出现「约 0 分钟」', () => {
    expect(transform({ text: '你好' }, base)).toContain('秒')
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '   ' }, base)).toBe('')
  })
})

describe('reading-time / formatDuration', () => {
  it('不足 1 分钟显示为秒', () => {
    expect(formatDuration(0.5)).toBe('30 秒')
  })

  it('超过 1 分钟显示为分钟', () => {
    expect(formatDuration(3.2)).toBe('约 3 分钟')
  })

  it('非正数显示 0 秒', () => {
    expect(formatDuration(0)).toBe('0 秒')
  })
})
