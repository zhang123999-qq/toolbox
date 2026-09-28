import { describe, expect, it } from 'vitest'
import {
  CANDIDATE_COUNT,
  COPY_TYPES,
  DEFAULT_COPY_TYPE,
  DEFAULT_TONE,
  MAX_PRODUCT_CHARS,
  TONES,
  buildCopyPrompt,
  buildReport,
  buildRequestBody,
  chatCompletionsUrl,
  extractAssistantText,
  parseHttpError,
  parseListOutput,
  validateCopyType,
  validateProduct,
  validateTone,
} from './utils'

describe('copywriting · utils', () => {
  it('chatCompletionsUrl 去掉末尾斜杠', () => {
    expect(chatCompletionsUrl('https://a.com/v1/')).toBe('https://a.com/v1/chat/completions')
  })

  it('chatCompletionsUrl 空地址抛中文错', () => {
    expect(() => chatCompletionsUrl('')).toThrow('接口地址不能为空')
    expect(() => chatCompletionsUrl(null as unknown as string)).toThrow('接口地址不能为空')
  })

  it('validateProduct 正常 / 空 / 超长', () => {
    expect(validateProduct('  无线耳机  ')).toBe('无线耳机')
    expect(() => validateProduct('  ')).toThrow('产品描述不能为空')
    expect(() => validateProduct('x'.repeat(MAX_PRODUCT_CHARS + 1))).toThrow('产品描述过长')
  })

  it('validateCopyType 接受候选 / 拒绝其他', () => {
    for (const t of COPY_TYPES) expect(validateCopyType(t)).toBe(t)
    expect(() => validateCopyType('广告')).toThrow('不支持的文案类型')
  })

  it('validateTone 接受候选 / 拒绝其他', () => {
    for (const t of TONES) expect(validateTone(t)).toBe(t)
    expect(() => validateTone('暴躁')).toThrow('不支持的语气')
  })

  it('DEFAULT_COPY_TYPE / DEFAULT_TONE', () => {
    expect(DEFAULT_COPY_TYPE).toBe('标题')
    expect(DEFAULT_TONE).toBe('专业')
  })

  it('buildCopyPrompt 含类型语气与条数', () => {
    const p = buildCopyPrompt('无线耳机', '口号', '活泼')
    expect(p).toContain('口号')
    expect(p).toContain('活泼')
    expect(p).toContain(String(CANDIDATE_COUNT))
    expect(p).toContain('无线耳机')
  })

  it('buildRequestBody temperature 为 0.8', () => {
    const body = buildRequestBody('m', '耳机', '标题', '正式')
    expect(body.temperature).toBe(0.8)
    expect(body.model).toBe('m')
    expect(body.messages[0].content).toContain('耳机')
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
    const out = parseListOutput('1. 好耳机\n- `真无线`\n• 降噪强\n\n')
    expect(out).toEqual(['好耳机', '真无线', '降噪强'])
  })

  it('buildReport 包含类型语气与文案', () => {
    const r = buildReport('耳机', '口号', '活泼', 'm', ['戴上就不想摘', '好声音无负担'])
    expect(r).toContain('类型：口号')
    expect(r).toContain('语气：活泼')
    expect(r).toContain('1. 戴上就不想摘')
    expect(r).toContain('2. 好声音无负担')
  })
})
