import { describe, expect, it } from 'vitest'
import { analyze, fingerprints, hashLine, render, transform } from './utils'

describe('duplicate-code / hashLine', () => {
  it('相同字符串同 hash，不同字符串不同 hash', () => {
    expect(hashLine('const a = 1')).toBe(hashLine('const a = 1'))
    expect(hashLine('const a = 1')).not.toBe(hashLine('const b = 2'))
  })
})

describe('duplicate-code / fingerprints', () => {
  it('忽略空行与首尾空白', () => {
    const fps = fingerprints('  const a = 1  \n\nconst a = 1')
    expect(fps).toHaveLength(2)
    expect(fps[0].hash).toBe(fps[1].hash)
  })
})

describe('duplicate-code / analyze', () => {
  const src = ['console.log("x")', 'console.log("x")', 'console.log("x")', 'unique line'].join('\n')

  it('统计重复行与重复率', () => {
    const r = analyze(src, 3)
    expect(r.duplicateLines).toBe(3)
    expect(r.duplicateRate).toBeCloseTo(0.75)
    expect(r.blocks[0].count).toBe(3)
  })

  it('阈值以下不算重复', () => {
    const r = analyze(src, 5)
    expect(r.blocks).toHaveLength(0)
    expect(r.duplicateLines).toBe(0)
  })
})

describe('duplicate-code / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '  ' }, { minBlock: 3 })).toBe('')
  })

  it('render 输出重复率', () => {
    const out = render(analyze('a\na\na', 3))
    expect(out).toContain('重复率：100.0%')
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, { minBlock: 3 })).toThrow(/上限/)
  })
})
