import { describe, expect, it } from 'vitest'
import { convert, transform } from './utils'

describe('code-convert / jsToPy', () => {
  it('function → def，console.log → print，let 去掉声明', () => {
    const out = convert(
      'function greet(name) {\n  let msg = "hi"\n  console.log(msg)\n}',
      'javascript',
      'python',
    )
    expect(out).toContain('def greet(name):')
    expect(out).toContain('msg = "hi"')
    expect(out).toContain('print(msg)')
  })

  it('for 循环映射到 range', () => {
    const out = convert('for (let i = 0; i < n; i++) {', 'javascript', 'python')
    expect(out).toContain('for i in range(n):')
  })

  it('布尔字面量映射', () => {
    const out = convert('console.log(true)', 'javascript', 'python')
    expect(out).toContain('print(True)')
  })
})

describe('code-convert / pyToJs', () => {
  it('def → function，print → console.log', () => {
    const out = convert('def greet(name):\n  print("hi")', 'python', 'javascript')
    expect(out).toContain('function greet(name) {')
    expect(out).toContain('console.log("hi")')
  })

  it('if cond: → if (cond) {', () => {
    const out = convert('if x > 1:', 'python', 'javascript')
    expect(out).toContain('if (x > 1) {')
  })
})

describe('code-convert / transform', () => {
  it('from === to 原样返回', () => {
    expect(transform({ text: 'const a = 1' }, { from: 'javascript', to: 'javascript' })).toBe(
      'const a = 1',
    )
  })

  it('空输入返回空串', () => {
    expect(transform({ text: '' }, { from: 'javascript', to: 'python' })).toBe('')
  })

  it('超长输入报错', () => {
    expect(() =>
      transform({ text: 'x'.repeat(50001) }, { from: 'javascript', to: 'python' }),
    ).toThrow(/上限/)
  })
})
