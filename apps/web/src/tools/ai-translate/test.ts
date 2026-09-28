import { describe, expect, it } from 'vitest'
import {
  assertApiKey,
  buildChatUrl,
  buildTranslateBody,
  buildTranslateSystemPrompt,
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
  extractReplyText,
  getLanguage,
  httpStatusMessage,
  LANGUAGES,
  MAX_INPUT_CHARS,
  networkErrorMessage,
  normalizeBaseUrl,
  REQUEST_TIMEOUT_MS,
  STORAGE_KEY_PREFIX,
  storageKey,
  truncateInput,
  validateTranslatePair,
} from './utils'

describe('ai-translate / 语言选项', () => {
  it('语言名中文友好且含自动检测', () => {
    expect(LANGUAGES[0]).toEqual({ code: 'auto', name: '自动检测' })
    expect(getLanguage('zh').name).toBe('中文（简体）')
    expect(getLanguage('en').name).toBe('英语')
    expect(getLanguage('ja').name).toBe('日语')
    expect(() => getLanguage('xx')).toThrow(/不支持的语言/)
    expect(() => getLanguage('')).toThrow(/不支持的语言/)
  })

  it('validateTranslatePair 校验语言对', () => {
    expect(() => validateTranslatePair('auto', 'en')).not.toThrow()
    expect(() => validateTranslatePair('zh', 'en')).not.toThrow()
    expect(() => validateTranslatePair('zh', 'auto')).toThrow(/目标语言不能是"自动检测"/)
    expect(() => validateTranslatePair('auto', 'auto')).toThrow(/目标语言不能是"自动检测"/)
    expect(() => validateTranslatePair('en', 'en')).toThrow(/源语言与目标语言相同/)
    expect(() => validateTranslatePair('xx', 'en')).toThrow(/不支持的语言/)
    expect(() => validateTranslatePair('zh', 'xx')).toThrow(/不支持的语言/)
  })

  it('buildTranslateSystemPrompt 按源语言生成提示词', () => {
    const auto = buildTranslateSystemPrompt('auto', 'en')
    expect(auto).toContain('英语')
    expect(auto).not.toContain('自动检测')
    const zh2en = buildTranslateSystemPrompt('zh', 'en')
    expect(zh2en).toContain('中文（简体）')
    expect(zh2en).toContain('英语')
    expect(() => buildTranslateSystemPrompt('en', 'en')).toThrow(/源语言与目标语言相同/)
    expect(() => buildTranslateSystemPrompt('zh', 'auto')).toThrow(/目标语言不能是/)
  })
})

describe('ai-translate / 服务地址与 Key 校验', () => {
  it('normalizeBaseUrl 归一化', () => {
    expect(normalizeBaseUrl('https://api.openai.com/v1/')).toBe('https://api.openai.com/v1')
    expect(normalizeBaseUrl('')).toBe(DEFAULT_BASE_URL)
    expect(() => normalizeBaseUrl('example.com')).toThrow(/服务地址非法/)
  })

  it('buildChatUrl 拼接地址', () => {
    expect(buildChatUrl('')).toBe('https://api.openai.com/v1/chat/completions')
    expect(() => buildChatUrl('ftp://x')).toThrow(/服务地址非法/)
  })

  it('assertApiKey 空 Key 抛中文错', () => {
    expect(() => assertApiKey('')).toThrow(/请先填写 API Key/)
    expect(() => assertApiKey('   ')).toThrow(/请先填写 API Key/)
    expect(() => assertApiKey('sk-x')).not.toThrow()
  })

  it('常量', () => {
    expect(DEFAULT_MODEL).toBe('gpt-4o-mini')
    expect(REQUEST_TIMEOUT_MS).toBe(60_000)
    expect(MAX_INPUT_CHARS).toBe(20_000)
    expect(STORAGE_KEY_PREFIX).toBe('toolbox:ai-translate')
    expect(storageKey('model')).toBe('toolbox:ai-translate:model')
  })
})

describe('ai-translate / 请求体拼装', () => {
  it('buildTranslateBody 拼出翻译请求体', () => {
    const body = buildTranslateBody('你好', 'gpt-4o-mini', 'zh', 'en')
    expect(body.model).toBe('gpt-4o-mini')
    expect(body.messages[0]!.content).toContain('中文（简体）')
    expect(body.messages[0]!.content).toContain('英语')
    expect(body.messages[1]).toEqual({ role: 'user', content: '你好' })
    expect(body.temperature).toBe(0.2)
    expect(body.max_tokens).toBe(4096)
  })

  it('buildTranslateBody 超长文本截断并备注', () => {
    const body = buildTranslateBody('x'.repeat(MAX_INPUT_CHARS + 1), 'm', 'auto', 'ja')
    expect(body.messages[1]!.content.length).toBe(MAX_INPUT_CHARS)
    expect(body.messages[0]!.content).toContain('已截取前')
    expect(body.messages[0]!.content).toContain('日语')
  })

  it('buildTranslateBody 非法参数抛中文错', () => {
    expect(() => buildTranslateBody('', 'm', 'zh', 'en')).toThrow(/请输入要翻译的文本/)
    expect(() => buildTranslateBody('  ', 'm', 'zh', 'en')).toThrow(/请输入要翻译的文本/)
    expect(() => buildTranslateBody('hi', '', 'zh', 'en')).toThrow(/模型名不能为空/)
    expect(() => buildTranslateBody('hi', 'm', 'en', 'en')).toThrow(/源语言与目标语言相同/)
    expect(() => buildTranslateBody('hi', 'm', 'zh', 'auto')).toThrow(/目标语言不能是/)
    expect(() => truncateInput('hi', -1)).toThrow(/截断长度非法/)
  })
})

describe('ai-translate / 响应解析与错误文案', () => {
  it('extractReplyText 提取译文', () => {
    expect(extractReplyText({ choices: [{ message: { content: 'Hello' } }] })).toBe('Hello')
    expect(() => extractReplyText(null)).toThrow(/不是合法的 JSON 对象/)
    expect(() => extractReplyText({})).toThrow(/缺少 choices/)
    expect(() => extractReplyText({ choices: [] })).toThrow(/缺少 choices/)
    expect(() => extractReplyText({ choices: [null] })).toThrow(/choices\[0\] 不是对象/)
    expect(() => extractReplyText({ choices: [{ message: { content: '' } }] })).toThrow(
      /返回了空内容/,
    )
  })

  it('httpStatusMessage 按状态码给中文提示', () => {
    expect(httpStatusMessage(401)).toContain('API Key 无效')
    expect(httpStatusMessage(403)).toContain('无权访问')
    expect(httpStatusMessage(429)).toContain('过于频繁')
    expect(httpStatusMessage(500)).toContain('500')
    expect(httpStatusMessage(502)).toContain('502')
    expect(httpStatusMessage(503)).toContain('503')
    expect(httpStatusMessage(400)).toContain('HTTP 400')
  })

  it('networkErrorMessage 区分超时 / 断网 / 普通错误', () => {
    expect(networkErrorMessage({ name: 'AbortError' })).toContain('请求超时')
    expect(networkErrorMessage(new TypeError('x'))).toContain('网络连接失败')
    expect(networkErrorMessage(new Error('boom'))).toBe('请求失败：boom')
    expect(networkErrorMessage(undefined)).toBe('请求失败，请重试')
  })
})
