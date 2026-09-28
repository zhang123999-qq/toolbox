import { describe, expect, it } from 'vitest'
import {
  MAX_PROMPT_CHARS,
  buildRequestBody,
  buildSystemPrompt,
  buildUserPrompt,
  chatCompletionsUrl,
  extractAssistantText,
  formatComparison,
  parseHttpError,
} from './utils'

describe('prompt-optimize · utils', () => {
  it('buildSystemPrompt 包含四个结构化部分的要求', () => {
    const s = buildSystemPrompt()
    expect(s).toContain('任务')
    expect(s).toContain('背景')
    expect(s).toContain('约束')
    expect(s).toContain('输出格式')
  })

  it('buildUserPrompt 正常返回', () => {
    expect(buildUserPrompt(' 写篇文章 ')).toContain('写篇文章')
  })

  it('buildUserPrompt 空文本抛中文错', () => {
    expect(() => buildUserPrompt(' ')).toThrow('待优化的提示词不能为空')
  })

  it('buildUserPrompt 超长抛中文错', () => {
    expect(() => buildUserPrompt('x'.repeat(MAX_PROMPT_CHARS + 1))).toThrow('提示词过长')
  })

  it('chatCompletionsUrl 去掉末尾斜杠', () => {
    expect(chatCompletionsUrl('https://api.openai.com/v1///')).toBe(
      'https://api.openai.com/v1/chat/completions',
    )
    expect(chatCompletionsUrl(' https://x.ai/api ')).toBe('https://x.ai/api/chat/completions')
  })

  it('chatCompletionsUrl 空地址抛中文错', () => {
    expect(() => chatCompletionsUrl('')).toThrow('接口地址不能为空')
    expect(() => chatCompletionsUrl(' ')).toThrow('接口地址不能为空')
    expect(() => chatCompletionsUrl(undefined as unknown as string)).toThrow('接口地址不能为空')
  })

  it('buildRequestBody 结构正确', () => {
    const body = buildRequestBody('gpt-4o-mini', 'sys', 'user')
    expect(body.model).toBe('gpt-4o-mini')
    expect(body.messages).toHaveLength(2)
    expect(body.messages[0]).toEqual({ role: 'system', content: 'sys' })
    expect(body.messages[1]).toEqual({ role: 'user', content: 'user' })
    expect(body.temperature).toBe(0.7)
  })

  it('extractAssistantText 正常提取', () => {
    const data = { choices: [{ message: { content: ' 优化结果 ' } }] }
    expect(extractAssistantText(data)).toBe('优化结果')
  })

  it('extractAssistantText 缺少 choices 抛中文错', () => {
    expect(() => extractAssistantText({})).toThrow('缺少 choices')
    expect(() => extractAssistantText(null)).toThrow('缺少 choices')
    expect(() => extractAssistantText({ choices: [] })).toThrow('缺少 choices')
  })

  it('extractAssistantText 内容为空或非字符串抛中文错', () => {
    expect(() => extractAssistantText({ choices: [{ message: { content: ' ' } }] })).toThrow(
      '回复内容为空',
    )
    expect(() => extractAssistantText({ choices: [{ message: {} }] })).toThrow('回复内容为空')
    expect(() => extractAssistantText({ choices: [{}] })).toThrow('回复内容为空')
  })

  it('parseHttpError 各状态码中文提示', () => {
    expect(parseHttpError(401, '')).toContain('API Key 无效')
    expect(parseHttpError(403, 'forbidden')).toContain('无权限')
    expect(parseHttpError(404, '')).toContain('接口不存在')
    expect(parseHttpError(429, '')).toContain('过于频繁')
    expect(parseHttpError(500, '')).toContain('服务端错误')
    expect(parseHttpError(400, 'bad request')).toContain('HTTP 400')
    expect(parseHttpError(400, 'bad request')).toContain('bad request')
    expect(parseHttpError(400, '')).toBe('请求失败（HTTP 400）')
  })

  it('formatComparison 拼出对比报告', () => {
    const r = formatComparison('raw', 'opt')
    expect(r).toContain('')
    expect(r).toContain('')
    expect(r).toContain('raw')
    expect(r).toContain('opt')
  })
})
