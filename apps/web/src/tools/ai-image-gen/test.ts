import { describe, expect, it } from 'vitest'
import {
  IMAGE_SIZES,
  MAX_PROMPT_CHARS,
  buildReport,
  buildRequestBody,
  extractImageResult,
  imagesGenerationsUrl,
  parseHttpError,
  validatePrompt,
  validateSize,
} from './utils'

describe('ai-image-gen · utils', () => {
  it('imagesGenerationsUrl 去掉末尾斜杠', () => {
    expect(imagesGenerationsUrl('https://a.com/v1/')).toBe('https://a.com/v1/images/generations')
    expect(imagesGenerationsUrl('https://a.com/v1')).toBe('https://a.com/v1/images/generations')
  })

  it('imagesGenerationsUrl 空地址抛中文错', () => {
    expect(() => imagesGenerationsUrl('')).toThrow('接口地址不能为空')
    expect(() => imagesGenerationsUrl('   ')).toThrow('接口地址不能为空')
    expect(() => imagesGenerationsUrl(null as unknown as string)).toThrow('接口地址不能为空')
  })

  it('validatePrompt 正常返回裁剪后的文本', () => {
    expect(validatePrompt(' 一只猫 ')).toBe('一只猫')
  })

  it('validatePrompt 空 / 超长抛中文错', () => {
    expect(() => validatePrompt(' ')).toThrow('图像描述不能为空')
    expect(() => validatePrompt('x'.repeat(MAX_PROMPT_CHARS + 1))).toThrow('图像描述过长')
  })

  it('validateSize 接受列表内的尺寸', () => {
    for (const s of IMAGE_SIZES) expect(validateSize(s)).toBe(s)
  })

  it('validateSize 拒绝列表外的尺寸', () => {
    expect(() => validateSize('512x512')).toThrow('不支持的尺寸')
  })

  it('buildRequestBody 结构正确', () => {
    const body = buildRequestBody('m', 'p', '1024x1024')
    expect(body).toEqual({ model: 'm', prompt: 'p', size: '1024x1024', n: 1 })
  })

  it('extractImageResult 提取 url', () => {
    const r = extractImageResult({ data: [{ url: ' https://x/y.png ' }] })
    expect(r).toEqual({ kind: 'url', url: 'https://x/y.png' })
  })

  it('extractImageResult 提取 b64_json', () => {
    const r = extractImageResult({ data: [{ b64_json: ' aGVsbG8= ' }] })
    expect(r).toEqual({ kind: 'b64', b64: 'aGVsbG8=' })
  })

  it('extractImageResult 异常结构抛中文错', () => {
    expect(() => extractImageResult(null)).toThrow('缺少 data 数组')
    expect(() => extractImageResult({})).toThrow('缺少 data 数组')
    expect(() => extractImageResult({ data: 'x' })).toThrow('缺少 data 数组')
    expect(() => extractImageResult({ data: [] })).toThrow('缺少 data 数组')
    expect(() => extractImageResult({ data: [null] })).toThrow('没有可用的图片')
    expect(() => extractImageResult({ data: [{}] })).toThrow('没有可用的图片')
    expect(() => extractImageResult({ data: [{ url: '  ' }] })).toThrow('没有可用的图片')
    expect(() => extractImageResult({ data: [{ url: 123 }] })).toThrow('没有可用的图片')
    expect(() => extractImageResult({ data: [{ b64_json: '' }] })).toThrow('没有可用的图片')
  })

  it('parseHttpError 各状态码中文提示', () => {
    expect(parseHttpError(401, '')).toContain('API Key 无效')
    expect(parseHttpError(403, '')).toContain('无权限')
    expect(parseHttpError(404, '')).toContain('接口不存在')
    expect(parseHttpError(429, '')).toContain('过于频繁')
    expect(parseHttpError(503, '')).toContain('服务端错误')
    expect(parseHttpError(400, 'oops')).toContain('HTTP 400')
    expect(parseHttpError(400, 'oops')).toContain('oops')
    expect(parseHttpError(400, '  ')).toBe('请求失败（HTTP 400）')
  })

  it('buildReport url 与 b64 两种结果都展示', () => {
    const a = buildReport('猫', 'm', '1024x1024', { kind: 'url', url: 'https://x/y.png' })
    expect(a).toContain('提示词：猫')
    expect(a).toContain('模型：m')
    expect(a).toContain('尺寸：1024x1024')
    expect(a).toContain('![生成的图像](https://x/y.png)')
    const b = buildReport('猫', 'm', '1024x1024', { kind: 'b64', b64: 'aaa' })
    expect(b).toContain('base64 图片')
  })
})
