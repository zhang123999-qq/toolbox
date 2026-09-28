import { describe, expect, it } from 'vitest'
import {
  DEFAULT_LANGUAGE,
  LANGUAGES,
  MAX_CODE_CHARS,
  buildExplainPrompt,
  buildReport,
  buildRequestBody,
  chatCompletionsUrl,
  extractAssistantText,
  languageLabel,
  parseHttpError,
  validateCode,
  validateLanguage,
} from './utils'

describe('code-explain · utils', () => {
  it('chatCompletionsUrl 去掉末尾斜杠', () => {
    expect(chatCompletionsUrl('https://a.com/v1/')).toBe('https://a.com/v1/chat/completions')
  })

  it('chatCompletionsUrl 空地址抛中文错', () => {
    expect(() => chatCompletionsUrl('')).toThrow('接口地址不能为空')
    expect(() => chatCompletionsUrl(null as unknown as string)).toThrow('接口地址不能为空')
  })

  it('validateCode 正常 / 空 / 超长', () => {
    expect(validateCode('  print(1)  ')).toBe('print(1)')
    expect(() => validateCode('  ')).toThrow('代码不能为空')
    expect(() => validateCode('x'.repeat(MAX_CODE_CHARS + 1))).toThrow('代码过长')
  })

  it('validateLanguage 接受候选 / 拒绝其他', () => {
    for (const l of LANGUAGES) expect(validateLanguage(l)).toBe(l)
    expect(() => validateLanguage('brainfuck')).toThrow('不支持的语言')
  })

  it('languageLabel auto 显示自动识别', () => {
    expect(languageLabel('auto')).toBe('自动识别')
    expect(languageLabel('python')).toBe('python')
  })

  it('DEFAULT_LANGUAGE 为 auto', () => {
    expect(DEFAULT_LANGUAGE).toBe('auto')
  })

  it('buildExplainPrompt auto 与指定语言的提示不同', () => {
    const a = buildExplainPrompt('code', 'auto')
    expect(a).toContain('请先识别代码的语言')
    expect(a).toContain('功能概述')
    const p = buildExplainPrompt('code', 'python')
    expect(p).toContain('这是一段 python 代码')
    expect(p).toContain('code')
  })

  it('buildRequestBody temperature 为 0.3', () => {
    const body = buildRequestBody('m', 'c', 'go')
    expect(body.temperature).toBe(0.3)
    expect(body.model).toBe('m')
    expect(body.messages[0].content).toContain('c')
  })

  it('extractAssistantText 正常提取', () => {
    expect(extractAssistantText({ choices: [{ message: { content: ' ok ' } }] })).toBe('ok')
  })

  it('extractAssistantText 异常结构抛中文错', () => {
    expect(() => extractAssistantText(null)).toThrow('缺少 choices')
    expect(() => extractAssistantText({ choices: [] })).toThrow('缺少 choices')
    expect(() => extractAssistantText({ choices: [{ message: { content: 1 } }] })).toThrow(
      '回复内容为空',
    )
  })

  it('parseHttpError 各状态码中文提示', () => {
    expect(parseHttpError(401, '')).toContain('API Key 无效')
    expect(parseHttpError(403, '')).toContain('无权限')
    expect(parseHttpError(404, '')).toContain('接口不存在')
    expect(parseHttpError(429, '')).toContain('过于频繁')
    expect(parseHttpError(502, '')).toContain('服务端错误')
    expect(parseHttpError(400, 'oops')).toBe('请求失败（HTTP 400）（oops）')
  })

  it('buildReport 包含语言与解释', () => {
    const r = buildReport('print(1)', 'python', 'm', '输出数字 1')
    expect(r).toContain('语言：python')
    expect(r).toContain('模型：m')
    expect(r).toContain('print(1)')
    expect(r).toContain('输出数字 1')
  })
})
