import { describe, expect, it } from 'vitest'
import { analyze, complexityOf, rating, transform } from './utils'

describe('complexity / complexityOf', () => {
  it('空函数体复杂度为 1', () => {
    expect(complexityOf('function f() {}', 'javascript')).toBe(1)
  })

  it('if / for / && / 三元 各加 1', () => {
    const code = 'if (a) { for (;;) {} } const b = a && c ? 1 : 2'
    // if + for + && + ? = 4 → 5
    expect(complexityOf(code, 'javascript')).toBe(5)
  })

  it('catch 与 else if 计入', () => {
    const code = 'if (a) {} else if (b) {} catch (e) {}'
    // if(a) + else-if(b) + catch = 3 个决策点 → 复杂度 4
    expect(complexityOf(code, 'javascript')).toBe(4)
  })

  it('else if 不被重复计：if/else-if 链每段只算一次', () => {
    // if(a) + else if(b) + else if(c) = 3 个决策点 → 复杂度 4（而非 5）
    const code = 'if (a) {} else if (b) {} else if (c) {}'
    expect(complexityOf(code, 'javascript')).toBe(4)
  })

  it('?? 空值合并只算一次，不被三元正则重复计', () => {
    // a ?? b = 1 个决策点 → 复杂度 2（旧实现会算成 4）
    expect(complexityOf('const r = a ?? b', 'javascript')).toBe(2)
  })

  it('可选链 ?. 不计入三元', () => {
    // a?.b 不含决策点 → 复杂度 1
    expect(complexityOf('const r = a?.b', 'javascript')).toBe(1)
  })

  it('三元与 ?? 同时出现互不干扰', () => {
    // (a ?? b) 1 个 + c ? 1 : 2 1 个 = 2 → 复杂度 3
    expect(complexityOf('const r = (a ?? b) ? 1 : 2', 'javascript')).toBe(3)
  })

  it('python 的 if/elif/for/except 计入', () => {
    const code = 'if a:\n  pass\nelif b:\n  pass\nfor x in y:\n  pass'
    expect(complexityOf(code, 'python')).toBeGreaterThanOrEqual(4)
  })
})

describe('complexity / rating', () => {
  it('分段评级', () => {
    expect(rating(3)).toContain('A')
    expect(rating(8)).toContain('B')
    expect(rating(15)).toContain('C')
    expect(rating(30)).toContain('D')
  })
})

describe('complexity / analyze & transform', () => {
  it('输出整体分数与函数明细', () => {
    const out = analyze('function f() { if (a) {} }', 'javascript')
    expect(out).toContain('整体圈复杂度')
    expect(out).toContain('f：')
  })

  it('空输入返回空串', () => {
    expect(transform({ text: '  ' }, { language: 'javascript' })).toBe('')
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, { language: 'javascript' })).toThrow(
      /上限/,
    )
  })
})
