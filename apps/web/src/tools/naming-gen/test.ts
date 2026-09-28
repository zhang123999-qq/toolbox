import { describe, expect, it } from 'vitest'
import {
  DEFAULT_STYLE,
  MAX_DESC_CHARS,
  STYLES,
  buildNamingPrompt,
  buildReport,
  buildRequestBody,
  chatCompletionsUrl,
  extractAssistantText,
  parseHttpError,
  parseListOutput,
  toNamingStyle,
  validateDescription,
  validateStyle,
} from './utils'

describe('naming-gen · utils', () => {
  it('chatCompletionsUrl 去掉末尾斜杠', () => {
    expect(chatCompletionsUrl('https://a.com/v1/')).toBe('https://a.com/v1/chat/completions')
  })

  it('chatCompletionsUrl 空地址抛中文错', () => {
    expect(() => chatCompletionsUrl('')).toThrow('接口地址不能为空')
    expect(() => chatCompletionsUrl(null as unknown as string)).toThrow('接口地址不能为空')
  })

  it('validateDescription 正常 / 空 / 超长', () => {
    expect(validateDescription('  用户姓名  ')).toBe('用户姓名')
    expect(() => validateDescription('  ')).toThrow('描述不能为空')
    expect(() => validateDescription('x'.repeat(MAX_DESC_CHARS + 1))).toThrow('描述过长')
  })

  it('validateStyle 接受候选 / 拒绝其他', () => {
    for (const s of STYLES) expect(validateStyle(s)).toBe(s)
    expect(() => validateStyle('UPPER')).toThrow('不支持的命名风格')
  })

  it('DEFAULT_STYLE 为 camelCase', () => {
    expect(DEFAULT_STYLE).toBe('camelCase')
  })

  it('buildNamingPrompt 含风格与描述', () => {
    const p = buildNamingPrompt('用户姓名', 'snake_case')
    expect(p).toContain('snake_case')
    expect(p).toContain('用户姓名')
    expect(p).toContain('5 个')
  })

  it('buildRequestBody temperature 为 0.7', () => {
    const body = buildRequestBody('m', '用户姓名', 'camelCase')
    expect(body.temperature).toBe(0.7)
    expect(body.model).toBe('m')
    expect(body.messages[0].content).toContain('用户姓名')
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

  it('parseListOutput 去编号去符号去空行', () => {
    const out = parseListOutput('1. userName\n- `user_name`\n• UserName\n\n')
    expect(out).toEqual(['userName', 'user_name', 'UserName'])
  })

  it('toNamingStyle 四种风格转换', () => {
    expect(toNamingStyle(['user', 'name'], 'camelCase')).toBe('userName')
    expect(toNamingStyle(['user', 'name'], 'snake_case')).toBe('user_name')
    expect(toNamingStyle(['user', 'name'], 'PascalCase')).toBe('UserName')
    expect(toNamingStyle(['user', 'name'], 'kebab-case')).toBe('user-name')
  })

  it('toNamingStyle 清洗大小写与空白', () => {
    expect(toNamingStyle(['  User ', 'NAME'], 'camelCase')).toBe('userName')
  })

  it('toNamingStyle 无有效单词抛中文错', () => {
    expect(() => toNamingStyle([], 'camelCase')).toThrow('没有可用的单词')
    expect(() => toNamingStyle(['  ', ''], 'snake_case')).toThrow('没有可用的单词')
  })

  it('buildReport 包含风格与候选名', () => {
    const r = buildReport('用户姓名', 'camelCase', 'm', ['userName', 'userFullName'])
    expect(r).toContain('风格：camelCase')
    expect(r).toContain('1. userName')
    expect(r).toContain('2. userFullName')
  })
})
