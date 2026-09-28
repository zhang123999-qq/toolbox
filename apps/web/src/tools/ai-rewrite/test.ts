import { describe, expect, it } from 'vitest'
import {
  assertApiKey,
  buildChatUrl,
  buildRewriteBody,
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
  extractReplyText,
  getRewriteStyle,
  httpStatusMessage,
  MAX_INPUT_CHARS,
  networkErrorMessage,
  normalizeBaseUrl,
  REQUEST_TIMEOUT_MS,
  STORAGE_KEY_PREFIX,
  storageKey,
  REWRITE_STYLES,
  truncateInput,
} from './utils'

describe('ai-rewrite / 常量与存储键', () => {
  it('默认值与超时配置', () => {
    expect(DEFAULT_BASE_URL).toBe('https://api.openai.com/v1')
    expect(DEFAULT_MODEL).toBe('gpt-4o-mini')
    expect(REQUEST_TIMEOUT_MS).toBe(60_000)
    expect(MAX_INPUT_CHARS).toBe(20_000)
    expect(STORAGE_KEY_PREFIX).toBe('toolbox:ai-rewrite')
  })

  it('storageKey 拼出带前缀的键', () => {
    expect(storageKey('apiKey')).toBe('toolbox:ai-rewrite:apiKey')
    expect(storageKey('baseUrl')).toBe('toolbox:ai-rewrite:baseUrl')
    expect(storageKey('model')).toBe('toolbox:ai-rewrite:model')
  })

  it('四种改写风格', () => {
    expect(REWRITE_STYLES.map((s) => s.id)).toEqual(['formal', 'concise', 'vivid', 'expand'])
    expect(getRewriteStyle('formal').label).toBe('正式')
    expect(getRewriteStyle('concise').label).toBe('简洁')
    expect(getRewriteStyle('vivid').label).toBe('生动')
    expect(getRewriteStyle('expand').label).toBe('扩写')
    expect(() => getRewriteStyle('unknown')).toThrow(/未知的改写风格/)
    expect(() => getRewriteStyle('')).toThrow(/未知的改写风格/)
  })
})

describe('ai-rewrite / 服务地址与 Key 校验', () => {
  it('normalizeBaseUrl 去空格 / 去末尾斜杠 / 空回退默认', () => {
    expect(normalizeBaseUrl('https://api.openai.com/v1/')).toBe('https://api.openai.com/v1')
    expect(normalizeBaseUrl('  https://example.com/// ')).toBe('https://example.com')
    expect(normalizeBaseUrl('')).toBe(DEFAULT_BASE_URL)
    expect(normalizeBaseUrl('   ')).toBe(DEFAULT_BASE_URL)
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

describe('ai-rewrite / 输入截断与请求体', () => {
  it('truncateInput 短文本不截断、长文本截断', () => {
    expect(truncateInput('hello')).toEqual({ text: 'hello', truncated: false })
    const long = truncateInput('b'.repeat(MAX_INPUT_CHARS + 10))
    expect(long.text).toBe('b'.repeat(MAX_INPUT_CHARS))
    expect(long.truncated).toBe(true)
    expect(() => truncateInput('hi', 0)).toThrow(/截断长度非法/)
    expect(() => truncateInput('hi', 2.5)).toThrow(/截断长度非法/)
  })

  it('buildRewriteBody 按风格拼装请求体', () => {
    for (const styleId of ['formal', 'concise', 'vivid', 'expand'] as const) {
      const body = buildRewriteBody('原文', 'gpt-4o-mini', styleId)
      expect(body.model).toBe('gpt-4o-mini')
      expect(body.messages[0]!.role).toBe('system')
      expect(body.messages[1]).toEqual({ role: 'user', content: '原文' })
      expect(body.temperature).toBe(0.7)
      expect(body.max_tokens).toBe(2048)
    }
    const formal = buildRewriteBody('原文', 'm', 'formal')
    expect(formal.messages[0]!.content).toContain('正式')
    const vivid = buildRewriteBody('原文', 'm', 'vivid')
    expect(vivid.messages[0]!.content).toContain('生动')
  })

  it('buildRewriteBody 超长文本截断并备注', () => {
    const body = buildRewriteBody('x'.repeat(MAX_INPUT_CHARS + 5), ' m ', 'concise')
    expect(body.model).toBe('m')
    expect(body.messages[1]!.content.length).toBe(MAX_INPUT_CHARS)
    expect(body.messages[0]!.content).toContain('已截取前')
  })

  it('buildRewriteBody 非法参数抛中文错', () => {
    expect(() => buildRewriteBody('', 'm', 'formal')).toThrow(/请输入要改写的文本/)
    expect(() => buildRewriteBody('   ', 'm', 'formal')).toThrow(/请输入要改写的文本/)
    expect(() => buildRewriteBody('text', '', 'formal')).toThrow(/模型名不能为空/)
    expect(() => buildRewriteBody('text', '   ', 'formal')).toThrow(/模型名不能为空/)
    expect(() => buildRewriteBody('text', 'm', 'nope')).toThrow(/未知的改写风格/)
  })
})

describe('ai-rewrite / 响应解析', () => {
  it('正常响应提取正文', () => {
    expect(extractReplyText({ choices: [{ message: { content: '改写后' } }] })).toBe('改写后')
  })

  it('结构异常抛中文错', () => {
    expect(() => extractReplyText(null)).toThrow(/不是合法的 JSON 对象/)
    expect(() => extractReplyText('str')).toThrow(/不是合法的 JSON 对象/)
    expect(() => extractReplyText({})).toThrow(/缺少 choices/)
    expect(() => extractReplyText({ choices: [] })).toThrow(/缺少 choices/)
    expect(() => extractReplyText({ choices: [null] })).toThrow(/choices\[0\] 不是对象/)
    expect(() => extractReplyText({ choices: [{}] })).toThrow(/返回了空内容/)
    expect(() => extractReplyText({ choices: [{ message: { content: '  ' } }] })).toThrow(
      /返回了空内容/,
    )
  })
})

describe('ai-rewrite / 错误文案', () => {
  it('httpStatusMessage 按状态码给中文提示', () => {
    expect(httpStatusMessage(401)).toContain('API Key 无效')
    expect(httpStatusMessage(403)).toContain('无权访问')
    expect(httpStatusMessage(429)).toContain('过于频繁')
    expect(httpStatusMessage(503)).toContain('503')
    expect(httpStatusMessage(500)).toContain('500')
    expect(httpStatusMessage(502)).toContain('502')
    expect(httpStatusMessage(404)).toContain('HTTP 404')
  })

  it('networkErrorMessage 区分超时 / 断网 / 普通错误', () => {
    expect(networkErrorMessage({ name: 'AbortError' })).toContain('请求超时')
    expect(networkErrorMessage(new TypeError('x'))).toContain('网络连接失败')
    expect(networkErrorMessage(new Error('boom'))).toBe('请求失败：boom')
    expect(networkErrorMessage(42)).toBe('请求失败，请重试')
    expect(networkErrorMessage(null)).toBe('请求失败，请重试')
  })
})
