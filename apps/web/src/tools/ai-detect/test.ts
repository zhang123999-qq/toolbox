import { describe, expect, it } from 'vitest'
import {
  MAX_TEXT_CHARS,
  MIN_TEXT_CHARS,
  buildDetectPrompt,
  buildReport,
  buildRequestBody,
  chatCompletionsUrl,
  extractAssistantText,
  parseHttpError,
  parseVerdict,
  validateText,
  verdictLabel,
} from './utils'

const GOOD = JSON.stringify({ verdict: 'ai', confidence: 82, reasons: ['句式单一', '信息密度低'] })

describe('ai-detect · utils', () => {
  it('chatCompletionsUrl 去掉末尾斜杠', () => {
    expect(chatCompletionsUrl('https://a.com/v1/')).toBe('https://a.com/v1/chat/completions')
  })

  it('chatCompletionsUrl 空地址抛中文错', () => {
    expect(() => chatCompletionsUrl('')).toThrow('接口地址不能为空')
    expect(() => chatCompletionsUrl(null as unknown as string)).toThrow('接口地址不能为空')
  })

  it('validateText 正常 / 空 / 太短 / 超长', () => {
    expect(validateText('  ' + 'x'.repeat(60) + '  ')).toBe('x'.repeat(60))
    expect(() => validateText('  ')).toThrow('待检测文本不能为空')
    expect(() => validateText('x'.repeat(MIN_TEXT_CHARS - 1))).toThrow('文本太短')
    expect(() => validateText('x'.repeat(MAX_TEXT_CHARS + 1))).toThrow('文本过长')
  })

  it('buildDetectPrompt 包含文本并要求 JSON', () => {
    const p = buildDetectPrompt('待测文本')
    expect(p).toContain('待测文本')
    expect(p).toContain('只返回 JSON')
  })

  it('buildRequestBody temperature 为 0', () => {
    const body = buildRequestBody('m', 't')
    expect(body.temperature).toBe(0)
    expect(body.messages[0].content).toContain('t')
  })

  it('extractAssistantText 正常提取', () => {
    expect(extractAssistantText({ choices: [{ message: { content: ' ok ' } }] })).toBe('ok')
  })

  it('extractAssistantText 异常结构抛中文错', () => {
    expect(() => extractAssistantText({})).toThrow('缺少 choices')
    expect(() => extractAssistantText({ choices: [{ message: { content: '' } }] })).toThrow(
      '回复内容为空',
    )
  })

  it('parseVerdict 解析标准 JSON', () => {
    expect(parseVerdict(GOOD)).toEqual({
      verdict: 'ai',
      confidence: 82,
      reasons: ['句式单一', '信息密度低'],
    })
  })

  it('parseVerdict 从包裹文本中提取 JSON', () => {
    const r = parseVerdict('分析如下：' + GOOD + '完毕')
    expect(r.verdict).toBe('ai')
  })

  it('parseVerdict 非法输入抛中文错', () => {
    expect(() => parseVerdict('  ')).toThrow('模型返回为空')
    expect(() => parseVerdict('纯文本无 JSON')).toThrow('不是有效的 JSON')
    expect(() => parseVerdict('{不是 json}')).toThrow('不是有效的 JSON')
    expect(() => parseVerdict('null')).toThrow('verdict 字段无效')
    expect(() => parseVerdict(JSON.stringify({ verdict: 'x', confidence: 1, reasons: [] }))).toThrow(
      'verdict 字段无效',
    )
    expect(
      () => parseVerdict(JSON.stringify({ verdict: 'ai', confidence: '高', reasons: [] })),
    ).toThrow('confidence 字段无效')
    expect(() =>
      parseVerdict(JSON.stringify({ verdict: 'ai', confidence: NaN, reasons: [] })),
    ).toThrow('confidence 字段无效')
    expect(() =>
      parseVerdict(JSON.stringify({ verdict: 'ai', confidence: -1, reasons: [] })),
    ).toThrow('confidence 字段无效')
    expect(() =>
      parseVerdict(JSON.stringify({ verdict: 'ai', confidence: 101, reasons: [] })),
    ).toThrow('confidence 字段无效')
    expect(() => parseVerdict(JSON.stringify({ verdict: 'ai', confidence: 50 }))).toThrow(
      'reasons 字段无效',
    )
    expect(() =>
      parseVerdict(JSON.stringify({ verdict: 'ai', confidence: 50, reasons: ['ok', 1] })),
    ).toThrow('reasons 字段无效')
  })

  it('verdictLabel 三种结论', () => {
    expect(verdictLabel('ai')).toBe('疑似 AI 生成')
    expect(verdictLabel('human')).toBe('疑似人类撰写')
    expect(verdictLabel('uncertain')).toBe('无法确定')
  })

  it('parseHttpError 各状态码中文提示', () => {
    expect(parseHttpError(401, '')).toContain('API Key 无效')
    expect(parseHttpError(403, '')).toContain('无权限')
    expect(parseHttpError(404, '')).toContain('接口不存在')
    expect(parseHttpError(429, '')).toContain('过于频繁')
    expect(parseHttpError(500, '')).toContain('服务端错误')
    expect(parseHttpError(400, 'oops')).toBe('请求失败（HTTP 400）（oops）')
  })

  it('buildReport 包含结论与理由', () => {
    const r = buildReport('待测', 'm', { verdict: 'human', confidence: 90, reasons: ['有个性'] })
    expect(r).toContain('疑似人类撰写')
    expect(r).toContain('置信度 90%')
    expect(r).toContain('1. 有个性')
    expect(r).toContain('待测')
  })

  it('buildReport 长文本截断', () => {
    const r = buildReport('x'.repeat(600), 'm', { verdict: 'ai', confidence: 1, reasons: [] })
    expect(r).toContain('…')
  })
})
