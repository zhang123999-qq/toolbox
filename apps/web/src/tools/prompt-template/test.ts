import { describe, expect, it } from 'vitest'
import {
  assertAllFilled,
  extractVariables,
  fillTemplate,
  getTemplate,
  missingVariables,
  PROMPT_TEMPLATES,
  renderPrompt,
} from './utils'

describe('prompt-template / 模板库', () => {
  it('内置 8 个常用模板', () => {
    expect(PROMPT_TEMPLATES.map((t) => t.id)).toEqual([
      'translate',
      'summarize',
      'rewrite',
      'code-explain',
      'email',
      'sql',
      'regex',
      'brainstorm',
    ])
    for (const t of PROMPT_TEMPLATES) {
      expect(t.name.length).toBeGreaterThan(0)
      expect(t.template).toContain('{{')
    }
  })

  it('getTemplate 取模板；未知 id 抛中文错', () => {
    expect(getTemplate('translate').name).toBe('翻译助手')
    expect(() => getTemplate('nope')).toThrow(/未知的提示词模板/)
    expect(() => getTemplate('')).toThrow(/未知的提示词模板/)
  })
})

describe('prompt-template / 变量提取', () => {
  it('extractVariables 提取并去重、保持顺序', () => {
    expect(extractVariables('{{a}} 和 {{b}} 再 {{a}}')).toEqual(['a', 'b'])
    expect(extractVariables('无变量')).toEqual([])
    expect(extractVariables('')).toEqual([])
  })

  it('extractVariables 容忍占位符内空格、支持中文变量名', () => {
    expect(extractVariables('{{ 目标语言 }}')).toEqual(['目标语言'])
    expect(extractVariables('{{目标语言}}')).toEqual(['目标语言'])
  })

  it('extractVariables 跳过空占位符', () => {
    expect(extractVariables('{{ }} 和 {{a}}')).toEqual(['a'])
  })
})

describe('prompt-template / 填充与校验', () => {
  it('fillTemplate 替换变量', () => {
    expect(fillTemplate('你好，{{name}}！', { name: '老板' })).toBe('你好，老板！')
    expect(fillTemplate('{{a}}{{b}}', { a: '1', b: '2' })).toBe('12')
    // 空字符串也是有效值，会替换
    expect(fillTemplate('a{{x}}b', { x: '' })).toBe('ab')
  })

  it('fillTemplate 缺失变量保留占位符原样', () => {
    expect(fillTemplate('你好，{{name}}！', {})).toBe('你好，{{name}}！')
    expect(fillTemplate('{{a}} {{b}}', { a: '1' })).toBe('1 {{b}}')
  })

  it('missingVariables 列出缺失或空白的变量', () => {
    expect(missingVariables('{{a}} {{b}}', { a: '1', b: '2' })).toEqual([])
    expect(missingVariables('{{a}} {{b}}', { a: '1' })).toEqual(['b'])
    expect(missingVariables('{{a}} {{b}}', { a: '  ', b: '2' })).toEqual(['a'])
    expect(missingVariables('无变量', {})).toEqual([])
  })

  it('assertAllFilled 缺失抛中文错并列出变量名', () => {
    expect(() => assertAllFilled('{{a}}', { a: 'x' })).not.toThrow()
    expect(() => assertAllFilled('{{a}} {{b}}', { a: '1' })).toThrow(/请填写以下变量：b/)
    expect(() => assertAllFilled('{{a}} {{b}}', {})).toThrow(/请填写以下变量：a、b/)
  })

  it('renderPrompt 一站式渲染', () => {
    const prompt = renderPrompt('translate', { 目标语言: '英语', 原文: '你好' })
    expect(prompt).toContain('英语')
    expect(prompt).toContain('你好')
    expect(prompt).not.toContain('{{')
    expect(() => renderPrompt('nope', {})).toThrow(/未知的提示词模板/)
    expect(() => renderPrompt('translate', { 目标语言: '英语' })).toThrow(/请填写以下变量：原文/)
  })

  it('连续调用不受正则 lastIndex 状态影响', () => {
    extractVariables('{{a}}')
    expect(extractVariables('{{b}}')).toEqual(['b'])
    fillTemplate('{{a}}', { a: '1' })
    expect(fillTemplate('{{b}}', { b: '2' })).toBe('2')
  })
})
