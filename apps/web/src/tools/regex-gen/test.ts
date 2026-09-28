import { describe, expect, it } from 'vitest'
import {
  MAX_DESC_CHARS,
  MAX_TEST_CHARS,
  buildRegexPrompt,
  buildReport,
  buildRequestBody,
  buildTestResult,
  chatCompletionsUrl,
  extractAssistantText,
  extractRegexCodeBlock,
  parseHttpError,
  validateDescription,
  validateTestText,
} from './utils'

describe('regex-gen · utils', () => {
  it('chatCompletionsUrl 去掉末尾斜杠', () => {
    expect(chatCompletionsUrl('https://a.com/v1/')).toBe('https://a.com/v1/chat/completions')
  })

  it('chatCompletionsUrl 空地址抛中文错', () => {
    expect(() => chatCompletionsUrl('')).toThrow('接口地址不能为空')
    expect(() => chatCompletionsUrl(null as unknown as string)).toThrow('接口地址不能为空')
  })

  it('validateDescription 正常 / 空 / 超长', () => {
    expect(validateDescription('  匹配手机号  ')).toBe('匹配手机号')
    expect(() => validateDescription('  ')).toThrow('需求描述不能为空')
    expect(() => validateDescription('x'.repeat(MAX_DESC_CHARS + 1))).toThrow('需求描述过长')
  })

  it('validateTestText 允许为空 / 超长抛错', () => {
    expect(validateTestText('')).toBe('')
    expect(validateTestText('abc')).toBe('abc')
    expect(() => validateTestText('x'.repeat(MAX_TEST_CHARS + 1))).toThrow('测试文本过长')
  })

  it('buildRegexPrompt 含需求与格式要求', () => {
    const p = buildRegexPrompt('匹配手机号')
    expect(p).toContain('匹配手机号')
    expect(p).toContain('```')
    expect(p).toContain('逐段解释')
  })

  it('buildRequestBody temperature 为 0.2', () => {
    const body = buildRequestBody('m', '匹配邮箱')
    expect(body.temperature).toBe(0.2)
    expect(body.model).toBe('m')
    expect(body.messages[0].content).toContain('匹配邮箱')
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

  it('extractRegexCodeBlock 取代码块首行', () => {
    expect(extractRegexCodeBlock('```\n^1[3-9]\\d{9}$\n```\n解释')).toBe('^1[3-9]\\d{9}$')
  })

  it('extractRegexCodeBlock 无代码块取全文首行', () => {
    expect(extractRegexCodeBlock('\\d+\n第二行')).toBe('\\d+')
  })

  it('extractRegexCodeBlock 空内容抛中文错', () => {
    expect(() => extractRegexCodeBlock('')).toThrow('未找到正则表达式')
    expect(() => extractRegexCodeBlock('```\n```')).toThrow('未找到正则表达式')
  })

  it('buildTestResult 正常匹配', () => {
    const r = buildTestResult('\\d+', 'a1b22c333')
    expect(r.pattern).toBe('\\d+')
    expect(r.matches).toEqual(['1', '22', '333'])
  })

  it('buildTestResult 无匹配返回空数组', () => {
    expect(buildTestResult('z+', 'abc').matches).toEqual([])
  })

  it('buildTestResult 非法正则抛中文错', () => {
    expect(() => buildTestResult('([', 'abc')).toThrow('正则表达式非法')
  })

  it('buildReport 包含正则与解释', () => {
    const r = buildReport('匹配数字', 'm', '\\d+', '\\d 表示数字')
    expect(r).toContain('模型：m')
    expect(r).toContain('\\d+')
    expect(r).toContain('\\d 表示数字')
  })
})
