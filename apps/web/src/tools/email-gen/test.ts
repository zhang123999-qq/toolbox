import { describe, expect, it } from 'vitest'
import {
  DEFAULT_EMAIL_LANGUAGE,
  DEFAULT_TONE,
  EMAIL_LANGUAGES,
  MAX_PURPOSE_CHARS,
  MAX_RECIPIENT_CHARS,
  TONES,
  buildEmailPrompt,
  buildReport,
  buildRequestBody,
  chatCompletionsUrl,
  extractAssistantText,
  parseEmailOutput,
  parseHttpError,
  parseListOutput,
  validateEmailLanguage,
  validatePurpose,
  validateRecipient,
  validateTone,
} from './utils'

describe('email-gen · utils', () => {
  it('chatCompletionsUrl 去掉末尾斜杠', () => {
    expect(chatCompletionsUrl('https://a.com/v1/')).toBe('https://a.com/v1/chat/completions')
  })

  it('chatCompletionsUrl 空地址抛中文错', () => {
    expect(() => chatCompletionsUrl('')).toThrow('接口地址不能为空')
    expect(() => chatCompletionsUrl(null as unknown as string)).toThrow('接口地址不能为空')
  })

  it('validateRecipient 正常 / 空 / 超长', () => {
    expect(validateRecipient('  张经理  ')).toBe('张经理')
    expect(() => validateRecipient('  ')).toThrow('收件人不能为空')
    expect(() => validateRecipient('x'.repeat(MAX_RECIPIENT_CHARS + 1))).toThrow('收件人过长')
  })

  it('validatePurpose 正常 / 空 / 超长', () => {
    expect(validatePurpose('  申请调休  ')).toBe('申请调休')
    expect(() => validatePurpose('  ')).toThrow('写信目的不能为空')
    expect(() => validatePurpose('x'.repeat(MAX_PURPOSE_CHARS + 1))).toThrow('写信目的过长')
  })

  it('validateTone 接受候选 / 拒绝其他', () => {
    for (const t of TONES) expect(validateTone(t)).toBe(t)
    expect(() => validateTone('暴躁')).toThrow('不支持的语气')
  })

  it('validateEmailLanguage 接受候选 / 拒绝其他', () => {
    for (const l of EMAIL_LANGUAGES) expect(validateEmailLanguage(l)).toBe(l)
    expect(() => validateEmailLanguage('日文')).toThrow('不支持的语言')
  })

  it('DEFAULT_TONE / DEFAULT_EMAIL_LANGUAGE', () => {
    expect(DEFAULT_TONE).toBe('正式')
    expect(DEFAULT_EMAIL_LANGUAGE).toBe('中文')
  })

  it('buildEmailPrompt 含收件人目的语气语言', () => {
    const p = buildEmailPrompt('张经理', '申请调休', '恳切', '中文')
    expect(p).toContain('张经理')
    expect(p).toContain('申请调休')
    expect(p).toContain('恳切')
    expect(p).toContain('中文')
    expect(p).toContain('主题：')
  })

  it('buildRequestBody temperature 为 0.7', () => {
    const body = buildRequestBody('m', '张经理', '申请调休', '正式', '英文')
    expect(body.temperature).toBe(0.7)
    expect(body.model).toBe('m')
    expect(body.messages[0].content).toContain('英文')
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
    const out = parseListOutput('1. 你好\n- `谢谢`\n\n')
    expect(out).toEqual(['你好', '谢谢'])
  })

  it('parseEmailOutput 正常解析主题与正文', () => {
    const r = parseEmailOutput('主题：调休申请\n\n张经理您好，我想申请调休。')
    expect(r.subject).toBe('调休申请')
    expect(r.body).toBe('张经理您好，我想申请调休。')
  })

  it('parseEmailOutput 兼容英文冒号', () => {
    const r = parseEmailOutput('主题: Hello\n\nBody text.')
    expect(r.subject).toBe('Hello')
    expect(r.body).toBe('Body text.')
  })

  it('parseEmailOutput 缺主题 / 正文为空抛中文错', () => {
    expect(() => parseEmailOutput('张经理您好')).toThrow('未找到邮件主题')
    expect(() => parseEmailOutput('主题：调休申请')).toThrow('邮件正文为空')
    expect(() => parseEmailOutput('主题：\n\n')).toThrow('未找到邮件主题')
  })

  it('buildReport 包含主题与正文', () => {
    const r = buildReport('张经理', '调休', '正式', '中文', 'm', {
      subject: '调休申请',
      body: '您好',
    })
    expect(r).toContain('主题：调休申请')
    expect(r).toContain('您好')
    expect(r).toContain('语气：正式')
  })
})
