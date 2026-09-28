import { describe, expect, it } from 'vitest'
import {
  MAX_PROMPT_CHARS,
  buildReport,
  buildRequestBody,
  chatCompletionsUrl,
  extractAssistantText,
  formatDurationMs,
  parseHttpError,
  validatePrompt,
} from './utils'
import type { SideResult } from './utils'

describe('model-compare · utils', () => {
  it('chatCompletionsUrl 去掉末尾斜杠', () => {
    expect(chatCompletionsUrl('https://a.com/v1/')).toBe('https://a.com/v1/chat/completions')
  })

  it('chatCompletionsUrl 空地址抛中文错', () => {
    expect(() => chatCompletionsUrl('')).toThrow('接口地址不能为空')
    expect(() => chatCompletionsUrl(null as unknown as string)).toThrow('接口地址不能为空')
  })

  it('validatePrompt 正常返回裁剪后的文本', () => {
    expect(validatePrompt(' hi ')).toBe('hi')
  })

  it('validatePrompt 空 / 超长抛中文错', () => {
    expect(() => validatePrompt(' ')).toThrow('提示词不能为空')
    expect(() => validatePrompt('x'.repeat(MAX_PROMPT_CHARS + 1))).toThrow('提示词过长')
  })

  it('buildRequestBody 结构正确', () => {
    const body = buildRequestBody('m', 'p')
    expect(body.model).toBe('m')
    expect(body.messages).toEqual([{ role: 'user', content: 'p' }])
  })

  it('extractAssistantText 正常提取', () => {
    expect(extractAssistantText({ choices: [{ message: { content: ' ok ' } }] })).toBe('ok')
  })

  it('extractAssistantText 异常结构抛中文错', () => {
    expect(() => extractAssistantText({})).toThrow('缺少 choices')
    expect(() => extractAssistantText({ choices: [] })).toThrow('缺少 choices')
    expect(() => extractAssistantText({ choices: [{ message: { content: '' } }] })).toThrow(
      '回复内容为空',
    )
    expect(() => extractAssistantText({ choices: [{ message: { content: 123 } }] })).toThrow(
      '回复内容为空',
    )
  })

  it('parseHttpError 各状态码中文提示', () => {
    expect(parseHttpError(401, '')).toContain('API Key 无效')
    expect(parseHttpError(403, '')).toContain('无权限')
    expect(parseHttpError(404, '')).toContain('接口不存在')
    expect(parseHttpError(429, '')).toContain('过于频繁')
    expect(parseHttpError(503, '')).toContain('服务端错误')
    expect(parseHttpError(400, 'oops')).toContain('HTTP 400')
    expect(parseHttpError(400, 'oops')).toContain('oops')
  })

  it('formatDurationMs 格式化', () => {
    expect(formatDurationMs(1234)).toBe('1.23 秒')
    expect(formatDurationMs(0)).toBe('0.00 秒')
  })

  it('formatDurationMs 非法抛中文错', () => {
    expect(() => formatDurationMs(-1)).toThrow('耗时非法')
    expect(() => formatDurationMs(NaN)).toThrow('耗时非法')
  })

  it('buildReport 成功与失败两侧都展示', () => {
    const a: SideResult = { model: 'm-a', output: 'out-a', durationMs: 1200, error: '' }
    const b: SideResult = { model: 'm-b', output: '', durationMs: 300, error: '认证失败' }
    const r = buildReport('prompt', a, b)
    expect(r).toContain('')
    expect(r).toContain('模型 A：m-a')
    expect(r).toContain('out-a')
    expect(r).toContain('耗时：1.20 秒')
    expect(r).toContain('模型 B：m-b')
    expect(r).toContain('失败：认证失败')
    expect(r).toContain('（无输出）')
  })
})
