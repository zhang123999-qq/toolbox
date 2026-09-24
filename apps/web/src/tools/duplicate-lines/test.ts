import { describe, expect, it } from 'vitest'
import { normalize, report, tally, transform, uniqueLines } from './utils'

describe('duplicate-lines / normalize', () => {
  const base = { mode: 'report', trim: true, ignoreCase: false } as const

  it('默认去掉首尾空白', () => {
    expect(normalize('  a  ', base)).toBe('a')
  })

  it('trim 关闭时保留空白', () => {
    expect(normalize('  a  ', { ...base, trim: false })).toBe('  a  ')
  })

  it('ignoreCase 时转小写', () => {
    expect(normalize('AbC', { ...base, ignoreCase: true })).toBe('abc')
  })
})

describe('duplicate-lines / tally', () => {
  const base = { mode: 'report', trim: true, ignoreCase: false } as const

  it('统计次数', () => {
    const map = tally(['a', 'b', 'a'], base)
    expect(map.get('a')?.count).toBe(3 - 1)
    expect(map.get('b')?.count).toBe(1)
  })
})

describe('duplicate-lines / uniqueLines', () => {
  const base = { mode: 'report', trim: true, ignoreCase: false } as const

  it('去重且保持原顺序', () => {
    expect(uniqueLines(['b', 'a', 'b', 'c', 'a'], base)).toEqual(['b', 'a', 'c'])
  })

  it('ignoreCase 时大小写视为同一行', () => {
    expect(uniqueLines(['A', 'a'], { ...base, ignoreCase: true })).toEqual(['A'])
  })
})

describe('duplicate-lines / report', () => {
  const base = { mode: 'report', trim: true, ignoreCase: false } as const

  it('按次数降序列出重复行', () => {
    const out = report(['北京', '上海', '北京', '广州', '上海', '北京'], base)
    expect(out).toContain('3 次\t北京')
    expect(out).toContain('2 次\t上海')
    expect(out).not.toContain('广州')
  })

  it('没有重复行时给出说明', () => {
    expect(report(['a', 'b'], base)).toBe('没有重复行。')
  })
})

describe('duplicate-lines / transform', () => {
  const base = { mode: 'report', trim: true, ignoreCase: false } as const

  it('空输入返回空串', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })

  it('unique 模式输出去重后的行', () => {
    expect(transform({ text: 'a\nb\na' }, { ...base, mode: 'unique' })).toBe('a\nb')
  })

  it('dupes 模式只留重复过的行', () => {
    expect(transform({ text: 'a\nb\na' }, { ...base, mode: 'dupes' })).toBe('a\na')
  })

  it('trim 关闭时「a」与「 a」不算重复', () => {
    expect(transform({ text: 'a\n a' }, { ...base, trim: false })).toBe('没有重复行。')
  })
})
