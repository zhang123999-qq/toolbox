import { describe, expect, it } from 'vitest'
import {
  MAX_TEXT_CHARS,
  buildClassifyPrompt,
  buildRequestBody,
  chatCompletionsUrl,
  extractJsonLabel,
  formatResult,
  parseCategories,
  parseHttpError,
  validateText,
} from './utils'

/** 包一层 chat/completions 的正常响应 */
function okResponse(content: unknown): unknown {
  return { choices: [{ message: { content } }] }
}

describe('text-classify · utils', () => {
  it('chatCompletionsUrl 去掉末尾斜杠', () => {
    expect(chatCompletionsUrl('https://a.com/v1/')).toBe('https://a.com/v1/chat/completions')
    expect(chatCompletionsUrl('https://a.com/v1')).toBe('https://a.com/v1/chat/completions')
  })

  it('chatCompletionsUrl 空地址抛中文错', () => {
    expect(() => chatCompletionsUrl('')).toThrow('接口地址不能为空')
    expect(() => chatCompletionsUrl('   ')).toThrow('接口地址不能为空')
    expect(() => chatCompletionsUrl(null as unknown as string)).toThrow('接口地址不能为空')
  })

  it('validateText 正常 / 空 / 超长', () => {
    expect(validateText('  新闻文本  ')).toBe('新闻文本')
    expect(() => validateText('  ')).toThrow('待分类文本不能为空')
    expect(() => validateText('x'.repeat(MAX_TEXT_CHARS + 1))).toThrow('文本过长')
  })

  it('parseCategories 支持多种分隔符并去重保序', () => {
    expect(parseCategories('科技、体育,娱乐\n财经；科技')).toEqual(['科技', '体育', '娱乐', '财经'])
  })

  it('parseCategories 跳过空片段', () => {
    expect(parseCategories('科技,,，\n体育')).toEqual(['科技', '体育'])
  })

  it('parseCategories 全空抛中文错', () => {
    expect(() => parseCategories(' ,,，\n')).toThrow('候选类别不能为空')
  })

  it('buildClassifyPrompt 包含类别与文本并要求 JSON', () => {
    const p = buildClassifyPrompt('新闻', ['科技', '体育'])
    expect(p).toContain('科技、体育')
    expect(p).toContain('新闻')
    expect(p).toContain('只输出 JSON')
    expect(p).toContain('"confidence"')
  })

  it('buildRequestBody temperature 为 0', () => {
    const body = buildRequestBody('m', 't', ['a'])
    expect(body.temperature).toBe(0)
    expect(body.model).toBe('m')
    expect(body.messages[0]?.content).toContain('t')
  })

  it('extractJsonLabel 正常提取并 trim label', () => {
    expect(extractJsonLabel(okResponse('{"label":" 科技 ","confidence":0.95}'))).toEqual({
      label: '科技',
      confidence: 0.95,
    })
  })

  it('extractJsonLabel 兼容 ```json 代码块', () => {
    const r = extractJsonLabel(okResponse('```json\n{"label":"体育","confidence":0.8}\n```'))
    expect(r).toEqual({ label: '体育', confidence: 0.8 })
  })

  it('extractJsonLabel choices 缺失或为空抛中文错', () => {
    expect(() => extractJsonLabel(null)).toThrow('缺少 choices')
    expect(() => extractJsonLabel({})).toThrow('缺少 choices')
    expect(() => extractJsonLabel({ choices: [] })).toThrow('缺少 choices')
  })

  it('extractJsonLabel 内容缺失或为空抛中文错', () => {
    expect(() => extractJsonLabel({ choices: [{}] })).toThrow('回复内容为空')
    expect(() => extractJsonLabel(okResponse(1))).toThrow('回复内容为空')
    expect(() => extractJsonLabel(okResponse('   '))).toThrow('回复内容为空')
  })

  it('extractJsonLabel 非 JSON 抛中文错', () => {
    expect(() => extractJsonLabel(okResponse('not json'))).toThrow('无法解析 JSON')
  })

  it('extractJsonLabel 非对象结果抛中文错', () => {
    for (const body of ['42', 'null', '[]']) {
      expect(() => extractJsonLabel(okResponse(body))).toThrow('不是 JSON 对象')
    }
  })

  it('extractJsonLabel label 非法抛中文错', () => {
    for (const body of ['{}', '{"label":1}', '{"label":"   "}']) {
      expect(() => extractJsonLabel(okResponse(body))).toThrow('缺少 label')
    }
  })

  it('extractJsonLabel confidence 非法抛中文错', () => {
    for (const body of [
      '{"label":"a"}',
      '{"label":"a","confidence":"高"}',
      '{"label":"a","confidence":null}',
      '{"label":"a","confidence":-0.5}',
      '{"label":"a","confidence":1.5}',
    ]) {
      expect(() => extractJsonLabel(okResponse(body))).toThrow('confidence')
    }
  })

  it('extractJsonLabel 边界置信度 0 与 1 合法', () => {
    expect(extractJsonLabel(okResponse('{"label":"a","confidence":0}')).confidence).toBe(0)
    expect(extractJsonLabel(okResponse('{"label":"a","confidence":1}')).confidence).toBe(1)
  })

  it('parseHttpError 各状态码中文提示', () => {
    expect(parseHttpError(401, '')).toContain('API Key 无效')
    expect(parseHttpError(401, 'bad key')).toContain('bad key')
    expect(parseHttpError(403, '')).toContain('无权限')
    expect(parseHttpError(404, '')).toContain('接口不存在')
    expect(parseHttpError(429, '')).toContain('过于频繁')
    expect(parseHttpError(500, '')).toContain('服务端错误')
    expect(parseHttpError(418, '')).toContain('HTTP 418')
  })

  it('formatResult 生成可复制报告', () => {
    const s = formatResult({ label: '科技', confidence: 0.95 }, ['科技', '体育'])
    expect(s).toContain('分类结果：科技')
    expect(s).toContain('置信度：95.0%')
    expect(s).toContain('科技、体育')
  })
})
