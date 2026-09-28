import { describe, expect, it } from 'vitest'
import { EXAMPLES, MAX_CODE_LENGTH, prepareCode, validate } from './utils'

const opts = (direction = 'TB') => ({ direction })

describe('flowchart / prepareCode 预处理', () => {
  it('空输入返回空 code 且不截断（边界）', () => {
    expect(prepareCode('', opts())).toEqual({ code: '', truncated: false })
    expect(prepareCode('   \n  ', opts())).toEqual({ code: '', truncated: false })
  })

  it('无头部时自动补全 flowchart TB', () => {
    const r = prepareCode('A[开始] --> B[结束]', opts('TB'))
    expect(r.code.startsWith('flowchart TB')).toBe(true)
    expect(r.truncated).toBe(false)
  })

  it('无头部时按 LR 补全', () => {
    const r = prepareCode('A --> B', opts('LR'))
    expect(r.code.startsWith('flowchart LR')).toBe(true)
  })

  it('已有头部不重复补全', () => {
    const code = 'flowchart TD\n  A --> B'
    const r = prepareCode(code, opts('TB'))
    expect(r.code).toBe(code)
  })

  it('graph 指令也识别为已有头部', () => {
    const code = 'graph LR\n  A --> B'
    const r = prepareCode(code, opts('TB'))
    expect(r.code).toBe(code)
  })

  it('超过上限截断并标记（边界）', () => {
    const r = prepareCode('x'.repeat(MAX_CODE_LENGTH + 1), opts())
    expect(r.truncated).toBe(true)
    expect(r.code).toHaveLength(MAX_CODE_LENGTH)
  })

  it('超过 200000 字符触发 Zod 上限（边界）', () => {
    expect(() => prepareCode('z'.repeat(200001), opts())).toThrow(/200,000/)
  })

  it('非法方向抛错', () => {
    expect(() => prepareCode('A --> B', opts('TD'))).toThrow(/方向非法/)
  })
})

describe('flowchart / validate 校验', () => {
  it('空代码抛提示（边界）', () => {
    expect(() => validate('')).toThrow('代码为空')
  })
  it('非空代码通过校验', () => {
    expect(() => validate('flowchart TB\n  A --> B')).not.toThrow()
  })
})

describe('flowchart / 内置示例', () => {
  it('提供至少 1 个示例', () => {
    expect(EXAMPLES.length).toBeGreaterThanOrEqual(1)
  })

  it('每个示例补全后都非空且通过校验', () => {
    for (const example of EXAMPLES) {
      const prepared = prepareCode(example, opts('TB'))
      expect(prepared.code).toContain('flowchart TB')
      expect(() => validate(prepared.code)).not.toThrow()
    }
  })

  it('示例互不相同', () => {
    expect(new Set(EXAMPLES).size).toBe(EXAMPLES.length)
  })
})

describe('flowchart / 常量', () => {
  it('长度上限符合预期', () => {
    expect(MAX_CODE_LENGTH).toBe(20_000)
  })
})
