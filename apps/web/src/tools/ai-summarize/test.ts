import { describe, expect, it } from 'vitest'
import {
  assertApiKey,
  buildChatUrl,
  buildSummarizeBody,
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
  extractReplyText,
  getSummaryLength,
  httpStatusMessage,
  MAX_INPUT_CHARS,
  networkErrorMessage,
  normalizeBaseUrl,
  REQUEST_TIMEOUT_MS,
  STORAGE_KEY_PREFIX,
  storageKey,
  SUMMARY_LENGTHS,
  truncateInput,
} from './utils'

describe('ai-summarize / 常量与存储键', () => {
  it('默认值与超时配置', () => {
    expect(DEFAULT_BASE_URL).toBe('https://api.openai.com/v1')
    expect(DEFAULT_MODEL).toBe('gpt-4o-mini')
    expect(REQUEST_TIMEOUT_MS).toBe(60_000)
    expect(MAX_INPUT_CHARS).toBe(20_000)
    expect(STORAGE_KEY_PREFIX).toBe('toolbox:ai-summarize')
  })

  it('storageKey 拼出带前缀的键', () => {
    expect(storageKey('apiKey')).toBe('toolbox:ai-summarize:apiKey')
    expect(storageKey('baseUrl')).toBe('toolbox:ai-summarize:baseUrl')
    expect(storageKey('model')).toBe('toolbox:ai-summarize:model')
  })

  it('三种摘要长度', () => {
    expect(SUMMARY_LENGTHS.map((s) => s.id)).toEqual(['brief', 'standard', 'detailed'])
    expect(getSummaryLength('brief').label).toBe('一句话')
    expect(getSummaryLength('detailed').systemPrompt.length).toBeGreaterThan(10)
    expect(() => getSummaryLength('unknown')).toThrow(/未知的摘要长度/)
    expect(() => getSummaryLength('')).toThrow(/未知的摘要长度/)
  })
})

describe('ai-summarize / 服务地址与 Key 校验', () => {
  it('normalizeBaseUrl 去空格 / 去末尾斜杠 / 空回退默认', () => {
    expect(normalizeBaseUrl('https://api.openai.com/v1/')).toBe('https://api.openai.com/v1')
    expect(normalizeBaseUrl('  https://example.com/// ')).toBe('https://example.com')
    expect(normalizeBaseUrl('')).toBe(DEFAULT_BASE_URL)
    expect(normalizeBaseUrl('   ')).toBe(DEFAULT_BASE_URL)
    expect(normalizeBaseUrl('http://127.0.0.1:8080/v1')).toBe('http://127.0.0.1:8080/v1')
  })

  it('normalizeBaseUrl 非 http(s) 抛中文错', () => {
    expect(() => normalizeBaseUrl('ftp://example.com')).toThrow(/服务地址非法/)
    expect(() => normalizeBaseUrl('example.com/v1')).toThrow(/服务地址非法/)
  })

  it('buildChatUrl 拼接 chat/completions', () => {
    expect(buildChatUrl('https://api.openai.com/v1/')).toBe(
      'https://api.openai.com/v1/chat/completions',
    )
    expect(buildChatUrl('')).toBe('https://api.openai.com/v1/chat/completions')
    expect(() => buildChatUrl('example.com')).toThrow(/服务地址非法/)
  })

  it('assertApiKey 空 Key 抛中文错', () => {
    expect(() => assertApiKey('')).toThrow(/请先填写 API Key/)
    expect(() => assertApiKey('   ')).toThrow(/请先填写 API Key/)
    expect(() => assertApiKey('sk-abc')).not.toThrow()
  })
})

describe('ai-summarize / 输入截断与请求体', () => {
  it('truncateInput 短文本不截断、长文本截断', () => {
    expect(truncateInput('hello')).toEqual({ text: 'hello', truncated: false })
    expect(truncateInput('a'.repeat(MAX_INPUT_CHARS))).toEqual({
      text: 'a'.repeat(MAX_INPUT_CHARS),
      truncated: false,
    })
    const long = truncateInput('b'.repeat(MAX_INPUT_CHARS + 10))
    expect(long.text).toBe('b'.repeat(MAX_INPUT_CHARS))
    expect(long.truncated).toBe(true)
    expect(truncateInput('abcdef', 3)).toEqual({ text: 'abc', truncated: true })
  })

  it('truncateInput 非法截断长度抛中文错', () => {
    expect(() => truncateInput('hi', 0)).toThrow(/截断长度非法/)
    expect(() => truncateInput('hi', -5)).toThrow(/截断长度非法/)
    expect(() => truncateInput('hi', 2.5)).toThrow(/截断长度非法/)
  })

  it('buildSummarizeBody 拼出标准 chat 请求体', () => {
    const body = buildSummarizeBody('今天天气不错', 'gpt-4o-mini', 'brief')
    expect(body.model).toBe('gpt-4o-mini')
    expect(body.messages[0]!.role).toBe('system')
    expect(body.messages[0]!.content).toContain('一句话')
    expect(body.messages[1]).toEqual({ role: 'user', content: '今天天气不错' })
    expect(body.temperature).toBe(0.3)
    expect(body.max_tokens).toBe(1024)
  })

  it('buildSummarizeBody 超长文本截断并备注', () => {
    const body = buildSummarizeBody('x'.repeat(MAX_INPUT_CHARS + 5), ' m ', 'standard')
    expect(body.model).toBe('m')
    expect(body.messages[1]!.content.length).toBe(MAX_INPUT_CHARS)
    expect(body.messages[0]!.content).toContain('已截取前')
  })

  it('buildSummarizeBody 非法参数抛中文错', () => {
    expect(() => buildSummarizeBody('', 'm', 'brief')).toThrow(/请输入要摘要的文本/)
    expect(() => buildSummarizeBody('   ', 'm', 'brief')).toThrow(/请输入要摘要的文本/)
    expect(() => buildSummarizeBody('text', '', 'brief')).toThrow(/模型名不能为空/)
    expect(() => buildSummarizeBody('text', '   ', 'brief')).toThrow(/模型名不能为空/)
    expect(() => buildSummarizeBody('text', 'm', 'nope')).toThrow(/未知的摘要长度/)
  })
})

describe('ai-summarize / 响应解析', () => {
  const good = {
    choices: [{ message: { content: '这是摘要' } }],
  }

  it('正常响应提取正文', () => {
    expect(extractReplyText(good)).toBe('这是摘要')
  })

  it('结构异常抛中文错', () => {
    expect(() => extractReplyText(null)).toThrow(/不是合法的 JSON 对象/)
    expect(() => extractReplyText('str')).toThrow(/不是合法的 JSON 对象/)
    expect(() => extractReplyText(42)).toThrow(/不是合法的 JSON 对象/)
    expect(() => extractReplyText({})).toThrow(/缺少 choices/)
    expect(() => extractReplyText({ choices: 'x' })).toThrow(/缺少 choices/)
    expect(() => extractReplyText({ choices: [] })).toThrow(/缺少 choices/)
    expect(() => extractReplyText({ choices: [null] })).toThrow(/choices\[0\] 不是对象/)
    expect(() => extractReplyText({ choices: [42] })).toThrow(/choices\[0\] 不是对象/)
    expect(() => extractReplyText({ choices: [{}] })).toThrow(/返回了空内容/)
    expect(() => extractReplyText({ choices: [{ message: {} }] })).toThrow(/返回了空内容/)
    expect(() => extractReplyText({ choices: [{ message: { content: 123 } }] })).toThrow(
      /返回了空内容/,
    )
    expect(() => extractReplyText({ choices: [{ message: { content: '   ' } }] })).toThrow(
      /返回了空内容/,
    )
  })
})

describe('ai-summarize / 错误文案', () => {
  it('httpStatusMessage 按状态码给中文提示', () => {
    expect(httpStatusMessage(401)).toContain('API Key 无效')
    expect(httpStatusMessage(403)).toContain('无权访问')
    expect(httpStatusMessage(429)).toContain('过于频繁')
    expect(httpStatusMessage(500)).toContain('暂时不可用')
    expect(httpStatusMessage(502)).toContain('502')
    expect(httpStatusMessage(503)).toContain('503')
    expect(httpStatusMessage(400)).toContain('HTTP 400')
    expect(httpStatusMessage(418)).toContain('HTTP 418')
  })

  it('networkErrorMessage 区分超时 / 断网 / 普通错误', () => {
    const abort = { name: 'AbortError', message: 'aborted' }
    expect(networkErrorMessage(abort)).toContain('请求超时')
    expect(networkErrorMessage(new TypeError('fetch failed'))).toContain('网络连接失败')
    expect(networkErrorMessage(new Error('boom'))).toBe('请求失败：boom')
    expect(networkErrorMessage('str')).toBe('请求失败，请重试')
    expect(networkErrorMessage(null)).toBe('请求失败，请重试')
    expect(networkErrorMessage(undefined)).toBe('请求失败，请重试')
    // name 不是 AbortError 的普通对象走 Error 分支
    expect(networkErrorMessage({ name: 'Other', message: 'x' })).toBe('请求失败，请重试')
  })
})
