import { describe, expect, it } from 'vitest'
import { EXAMPLES, MAX_CODE_LENGTH, MERMAID_DIRECTIVE, prepareCode, validate } from './utils'

describe('mindmap / prepareCode 预处理', () => {
  it('空输入返回空 code 且不截断（边界）', () => {
    expect(prepareCode('')).toEqual({ code: '', truncated: false })
    expect(prepareCode('   \n  ')).toEqual({ code: '', truncated: false })
  })

  it('普通代码去首尾空白后原样返回', () => {
    const code = 'mindmap\n  root((中心))'
    expect(prepareCode('\n  ' + code + '  \n')).toEqual({ code, truncated: false })
  })

  it('恰好等于上限不截断（边界）', () => {
    const code = 'x'.repeat(MAX_CODE_LENGTH)
    const result = prepareCode(code)
    expect(result.truncated).toBe(false)
    expect(result.code).toBe(code)
  })

  it('超过上限截断到上限并标记（边界）', () => {
    const result = prepareCode('y'.repeat(MAX_CODE_LENGTH + 1))
    expect(result.truncated).toBe(true)
    expect(result.code).toHaveLength(MAX_CODE_LENGTH)
  })

  it('超过 200000 字符触发 Zod 上限（边界）', () => {
    expect(() => prepareCode('z'.repeat(200001))).toThrow(/200,000/)
  })
})

describe('mindmap / validate 校验', () => {
  it('空代码抛提示（边界）', () => {
    expect(() => validate('')).toThrow('代码为空')
    expect(() => validate('  \n\t ')).toThrow('代码为空')
  })

  it('首行指令错误抛提示（边界）', () => {
    expect(() => validate('flowchart TD\n  A-->B')).toThrow(/首行应为.*mindmap/)
  })

  it('指令前允许空行与缩进', () => {
    expect(() => validate('\n   \n  mindmap\n  root((中心))')).not.toThrow()
  })

  it('合法代码通过校验', () => {
    expect(() => validate('mindmap\n  root((中心))')).not.toThrow()
  })
})

describe('mindmap / 内置示例', () => {
  it('提供至少 1 个示例', () => {
    expect(EXAMPLES.length).toBeGreaterThanOrEqual(1)
  })

  it('每个示例都能通过校验', () => {
    for (const example of EXAMPLES) {
      expect(() => validate(example)).not.toThrow()
    }
  })

  it('示例互不相同', () => {
    expect(new Set(EXAMPLES).size).toBe(EXAMPLES.length)
  })
})

describe('mindmap / 常量', () => {
  it('指令与长度上限符合预期', () => {
    expect(MERMAID_DIRECTIVE).toBe('mindmap')
    expect(MAX_CODE_LENGTH).toBe(20_000)
  })
})
