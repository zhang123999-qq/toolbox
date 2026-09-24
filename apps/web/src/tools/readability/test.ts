import { describe, expect, it } from 'vitest'
import { analyze, fleschLevel, transform } from './utils'

describe('readability / analyze', () => {
  it('简单短句得到较高的 Flesch 分数', () => {
    const s = analyze('The cat sat on the mat. It was warm.')
    expect(s.flesch).toBeGreaterThan(60)
  })

  it('长句与复杂词降低易读度', () => {
    const easy = analyze('The cat sat. The dog ran.')
    const hard = analyze(
      'Notwithstanding the aforementioned considerations, implementation remains.',
    )
    expect(hard.flesch).toBeLessThan(easy.flesch)
  })

  it('空文本不产生 NaN（边界）', () => {
    const s = analyze('')
    expect(Number.isNaN(s.flesch)).toBe(false)
    expect(s.words).toBe(0)
  })
})

describe('readability / fleschLevel', () => {
  it('按分数区间给出等级', () => {
    expect(fleschLevel(95)).toBe('很容易')
    expect(fleschLevel(65)).toBe('普通')
    expect(fleschLevel(10)).toBe('很难')
  })
})

describe('readability / transform', () => {
  it('输出四项指标', () => {
    const out = transform({ text: 'The cat sat on the mat.' })
    expect(out).toContain('Flesch 阅读易读度')
    expect(out).toContain('Gunning Fog 指数')
    expect(out).toContain('自动可读性指数 ARI')
  })

  it('含中文时附口径提示', () => {
    expect(transform({ text: '这是一个工具库。' })).toContain('结果仅供参考')
  })

  it('纯空白输入返回空串（边界）', () => {
    expect(transform({ text: '  ' })).toBe('')
  })
})
