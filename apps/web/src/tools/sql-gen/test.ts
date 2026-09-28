import { describe, expect, it } from 'vitest'
import {
  DEFAULT_DIALECT,
  DIALECTS,
  DIALECT_LABELS,
  MAX_DESC_CHARS,
  buildReport,
  buildRequestBody,
  buildSqlPrompt,
  chatCompletionsUrl,
  dialectLabel,
  extractAssistantText,
  extractSqlCodeBlock,
  parseHttpError,
  validateDescription,
  validateDialect,
} from './utils'

describe('sql-gen · utils', () => {
  it('chatCompletionsUrl 去掉末尾斜杠', () => {
    expect(chatCompletionsUrl('https://a.com/v1/')).toBe('https://a.com/v1/chat/completions')
  })

  it('chatCompletionsUrl 空地址抛中文错', () => {
    expect(() => chatCompletionsUrl('')).toThrow('接口地址不能为空')
    expect(() => chatCompletionsUrl(null as unknown as string)).toThrow('接口地址不能为空')
  })

  it('validateDescription 正常 / 空 / 超长', () => {
    expect(validateDescription('  查出所有用户  ')).toBe('查出所有用户')
    expect(() => validateDescription('  ')).toThrow('需求描述不能为空')
    expect(() => validateDescription('x'.repeat(MAX_DESC_CHARS + 1))).toThrow('需求描述过长')
  })

  it('validateDialect 接受候选 / 拒绝其他', () => {
    for (const d of DIALECTS) expect(validateDialect(d)).toBe(d)
    expect(() => validateDialect('hive')).toThrow('不支持的方言')
  })

  it('dialectLabel 覆盖全部方言', () => {
    for (const d of DIALECTS) expect(dialectLabel(d)).toBe(DIALECT_LABELS[d])
  })

  it('DEFAULT_DIALECT 为 mysql', () => {
    expect(DEFAULT_DIALECT).toBe('mysql')
  })

  it('buildSqlPrompt 含方言名与需求', () => {
    const p = buildSqlPrompt('查出所有用户', 'postgresql')
    expect(p).toContain('PostgreSQL')
    expect(p).toContain('查出所有用户')
    expect(p).toContain('```sql')
  })

  it('buildRequestBody temperature 为 0.2', () => {
    const body = buildRequestBody('m', '查用户', 'sqlite')
    expect(body.temperature).toBe(0.2)
    expect(body.model).toBe('m')
    expect(body.messages[0].content).toContain('查用户')
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

  it('extractSqlCodeBlock 优先取 sql 代码块', () => {
    const text = '好的：\n```sql\nSELECT * FROM users;\n```\n解释文字'
    expect(extractSqlCodeBlock(text)).toBe('SELECT * FROM users;')
  })

  it('extractSqlCodeBlock 退化取任意代码块', () => {
    expect(extractSqlCodeBlock('```\nSELECT 1;\n```')).toBe('SELECT 1;')
  })

  it('extractSqlCodeBlock 无代码块 / 空代码块抛中文错', () => {
    expect(() => extractSqlCodeBlock('SELECT 1;')).toThrow('未找到 SQL 代码块')
    expect(() => extractSqlCodeBlock('```\n```')).toThrow('未找到 SQL 代码块')
  })

  it('buildReport 包含方言与 SQL', () => {
    const r = buildReport('查用户', 'mysql', 'm', 'SELECT * FROM users;')
    expect(r).toContain('方言：MySQL')
    expect(r).toContain('模型：m')
    expect(r).toContain('SELECT * FROM users;')
  })
})
