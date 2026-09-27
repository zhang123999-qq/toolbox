import { describe, expect, it } from 'vitest'
import { createTranslator } from '../../i18n'
import { EXAMPLES, MAX_CODE_LENGTH, MERMAID_DIRECTIVE, prepareCode, validateDiagram } from './utils'

const t = createTranslator('zh')
const ten = createTranslator('en')

describe('gantt / prepareCode 预处理', () => {
  it('空输入返回空 code 且不截断（边界）', () => {
    expect(prepareCode('')).toEqual({ code: '', truncated: false })
    expect(prepareCode('   \n  ')).toEqual({ code: '', truncated: false })
  })

  it('普通代码去首尾空白后原样返回', () => {
    const code = 'gantt\n    title T\n    section S\n    A :a1, 2026-01-01, 1d'
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

  it('特殊字符原样保留，不转义不删减（边界）', () => {
    const code = 'gantt\n    title <tag> & "引号"'
    expect(prepareCode(code).code).toBe(code)
  })

  it('超过 200000 字符触发 Zod 上限（边界）', () => {
    expect(() => prepareCode('z'.repeat(200001))).toThrow(/200,000/)
  })
})

describe('gantt / validateDiagram 校验', () => {
  it('空代码抛双语提示（边界）', () => {
    expect(() => validateDiagram('', t)).toThrow('代码为空')
    expect(() => validateDiagram('', ten)).toThrow('Code is empty')
  })

  it('全空白代码同样视为空（边界）', () => {
    expect(() => validateDiagram('  \n\t ', t)).toThrow('代码为空')
  })

  it('首行指令错误抛双语提示（边界）', () => {
    expect(() => validateDiagram('erDiagram\n    A ||--o{ B : has', t)).toThrow(/首行应为.*gantt/)
    expect(() => validateDiagram('erDiagram', ten)).toThrow(/must be "gantt"/)
  })

  it('指令前允许空行与缩进', () => {
    expect(() => validateDiagram('\n   \n  gantt\n    title T', t)).not.toThrow()
  })

  it('合法代码通过校验', () => {
    expect(() => validateDiagram('gantt\n    title T', t)).not.toThrow()
  })
})

describe('gantt / 内置示例', () => {
  it('提供 3 个示例', () => {
    expect(EXAMPLES).toHaveLength(3)
  })

  it('每个示例都能通过校验', () => {
    for (const example of EXAMPLES) {
      expect(() => validateDiagram(example, t)).not.toThrow()
    }
  })

  it('示例互不相同', () => {
    expect(new Set(EXAMPLES).size).toBe(3)
  })
})

describe('gantt / 常量', () => {
  it('指令与长度上限符合预期', () => {
    expect(MERMAID_DIRECTIVE).toBe('gantt')
    expect(MAX_CODE_LENGTH).toBe(20_000)
  })
})
