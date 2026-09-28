import { describe, expect, it } from 'vitest'
import {
  DEFAULT_QUESTION,
  MAX_IMAGE_BYTES,
  MAX_QUESTION_CHARS,
  buildReport,
  buildRequestBody,
  chatCompletionsUrl,
  extractAssistantText,
  parseHttpError,
  validateImage,
  validateQuestion,
} from './utils'

describe('ai-image-rec · utils', () => {
  it('chatCompletionsUrl 去掉末尾斜杠', () => {
    expect(chatCompletionsUrl('https://a.com/v1/')).toBe('https://a.com/v1/chat/completions')
  })

  it('chatCompletionsUrl 空地址抛中文错', () => {
    expect(() => chatCompletionsUrl('')).toThrow('接口地址不能为空')
    expect(() => chatCompletionsUrl(null as unknown as string)).toThrow('接口地址不能为空')
  })

  it('validateImage 通过合法图片', () => {
    expect(() => validateImage({ size: 1024, type: 'image/png' })).not.toThrow()
    expect(() => validateImage({ size: MAX_IMAGE_BYTES, type: 'image/jpeg' })).not.toThrow()
  })

  it('validateImage 拒绝非图片 / 异常大小 / 超大', () => {
    expect(() => validateImage({ size: 1024, type: 'text/plain' })).toThrow('请选择图片文件')
    expect(() => validateImage({ size: 1024, type: '' })).toThrow('请选择图片文件')
    expect(() => validateImage({ size: 1024, type: null as unknown as string })).toThrow(
      '请选择图片文件',
    )
    expect(() => validateImage({ size: 0, type: 'image/png' })).toThrow('图片文件大小异常')
    expect(() => validateImage({ size: -1, type: 'image/png' })).toThrow('图片文件大小异常')
    expect(() => validateImage({ size: NaN, type: 'image/png' })).toThrow('图片文件大小异常')
    expect(() => validateImage({ size: MAX_IMAGE_BYTES + 1, type: 'image/png' })).toThrow(
      '图片过大',
    )
  })

  it('validateQuestion 为空返回默认问题', () => {
    expect(validateQuestion('  ')).toBe(DEFAULT_QUESTION)
  })

  it('validateQuestion 正常裁剪 / 超长抛错', () => {
    expect(validateQuestion(' 图里有什么 ')).toBe('图里有什么')
    expect(() => validateQuestion('x'.repeat(MAX_QUESTION_CHARS + 1))).toThrow('提问过长')
  })

  it('buildRequestBody 多模态结构正确', () => {
    const body = buildRequestBody('m', 'q', 'data:image/png;base64,aaa')
    expect(body.model).toBe('m')
    expect(body.messages).toHaveLength(1)
    const content = body.messages[0].content
    expect(content[0]).toEqual({ type: 'text', text: 'q' })
    expect(content[1]).toEqual({
      type: 'image_url',
      image_url: { url: 'data:image/png;base64,aaa' },
    })
  })

  it('extractAssistantText 正常提取', () => {
    expect(extractAssistantText({ choices: [{ message: { content: ' ok ' } }] })).toBe('ok')
  })

  it('extractAssistantText 异常结构抛中文错', () => {
    expect(() => extractAssistantText(null)).toThrow('缺少 choices')
    expect(() => extractAssistantText({ choices: [] })).toThrow('缺少 choices')
    expect(() => extractAssistantText({ choices: [{ message: { content: '' } }] })).toThrow(
      '回复内容为空',
    )
    expect(() => extractAssistantText({ choices: [{ message: { content: 1 } }] })).toThrow(
      '回复内容为空',
    )
  })

  it('parseHttpError 各状态码中文提示', () => {
    expect(parseHttpError(401, '')).toContain('API Key 无效')
    expect(parseHttpError(403, '')).toContain('无权限')
    expect(parseHttpError(404, '')).toContain('接口不存在')
    expect(parseHttpError(429, '')).toContain('过于频繁')
    expect(parseHttpError(500, '')).toContain('服务端错误')
    expect(parseHttpError(400, 'oops')).toBe('请求失败（HTTP 400）（oops）')
  })

  it('buildReport 结构正确', () => {
    const r = buildReport('q', 'm', 'desc')
    expect(r).toContain('提问：q')
    expect(r).toContain('模型：m')
    expect(r).toContain('desc')
  })
})
