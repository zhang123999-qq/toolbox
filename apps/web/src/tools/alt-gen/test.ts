/**
 * alt-gen（#731）utils 单测：fetch 全部 mock 注入，无真实网络。
 */
import { describe, expect, it, vi, afterEach } from 'vitest'
import {
  IMAGE_KIND_LABELS,
  MAX_HINT_CHARS,
  MAX_IMAGE_BYTES,
  REQUEST_TIMEOUT_MS,
  buildAltPrompt,
  buildReport,
  buildRequestBody,
  chatCompletionsUrl,
  extractAssistantText,
  parseHttpError,
  requestAltText,
  validateHint,
  validateImage,
  type AltGenConfig,
  type FetchImpl,
  type ImageKind,
} from './utils'

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

function cfg(over: Partial<AltGenConfig> = {}): AltGenConfig {
  return {
    baseURL: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    apiKey: 'sk-test-key',
    imageKind: 'photo',
    extraHint: '',
    ...over,
  }
}

const DATA_URL = 'data:image/png;base64,iVBORw0KGgo='

describe('buildAltPrompt', () => {
  it('五种图片类型各有针对性指引', () => {
    const kinds: ImageKind[] = ['photo', 'screenshot', 'chart', 'illustration', 'other']
    for (const k of kinds) {
      const p = buildAltPrompt(k, '')
      expect(p).toContain('125')
      expect(p).not.toContain('补充要求')
    }
    expect(buildAltPrompt('chart', '')).toContain('图表')
    expect(buildAltPrompt('screenshot', '')).toContain('截图')
  })
  it('补充说明拼入 prompt', () => {
    expect(buildAltPrompt('photo', '重点描述人物表情')).toContain('补充要求：重点描述人物表情。')
  })
  it('未知类型回退到通用指引', () => {
    const p = buildAltPrompt('xxx' as ImageKind, '')
    expect(p).toContain('客观描述这张图片的内容')
  })
  it('要求不写废话开头', () => {
    expect(buildAltPrompt('photo', '')).toContain('废话')
  })
})

describe('chatCompletionsUrl', () => {
  it('空地址抛中文错', () => {
    expect(() => chatCompletionsUrl('')).toThrow('接口地址不能为空')
    expect(() => chatCompletionsUrl('   ')).toThrow('接口地址不能为空')
    expect(() => chatCompletionsUrl(undefined as unknown as string)).toThrow('接口地址不能为空')
  })
  it('拼接并去掉尾部斜杠', () => {
    expect(chatCompletionsUrl('https://x.com/v1///')).toBe('https://x.com/v1/chat/completions')
    expect(chatCompletionsUrl('https://x.com/v1')).toBe('https://x.com/v1/chat/completions')
  })
})

describe('validateImage', () => {
  it('非图片类型抛错', () => {
    expect(() => validateImage({ size: 100, type: 'text/plain' })).toThrow('请选择图片文件')
    expect(() => validateImage({} as { size: number; type: string })).toThrow('请选择图片文件')
    expect(() => validateImage(null as unknown as { size: number; type: string })).toThrow(
      '请选择图片文件',
    )
  })
  it('异常大小抛错', () => {
    expect(() => validateImage({ size: 0, type: 'image/png' })).toThrow('图片文件大小异常')
    expect(() => validateImage({ size: -5, type: 'image/png' })).toThrow('图片文件大小异常')
    expect(() => validateImage({ size: NaN, type: 'image/png' })).toThrow('图片文件大小异常')
  })
  it('超大图片抛错并带 MB 数', () => {
    expect(() => validateImage({ size: MAX_IMAGE_BYTES + 1, type: 'image/jpeg' })).toThrow('超过 10MB 上限')
  })
  it('合法图片通过', () => {
    expect(() => validateImage({ size: 1024, type: 'image/webp' })).not.toThrow()
  })
})

describe('validateHint', () => {
  it('超长抛错', () => {
    expect(() => validateHint('x'.repeat(MAX_HINT_CHARS + 1))).toThrow('补充说明过长')
  })
  it('返回去空格后的文本', () => {
    expect(validateHint('  hi  ')).toBe('hi')
    expect(validateHint('')).toBe('')
  })
})

describe('buildRequestBody', () => {
  it('多模态请求体结构正确', () => {
    const body = buildRequestBody('m', DATA_URL, 'prompt')
    expect(body.model).toBe('m')
    const msg = body.messages[0]
    expect(msg.role).toBe('user')
    expect(msg.content[0]).toEqual({ type: 'text', text: 'prompt' })
    expect(msg.content[1]).toEqual({ type: 'image_url', image_url: { url: DATA_URL } })
  })
})

describe('extractAssistantText', () => {
  it('缺少 choices 抛错', () => {
    expect(() => extractAssistantText({})).toThrow('缺少 choices 字段')
    expect(() => extractAssistantText({ choices: [] })).toThrow('缺少 choices 字段')
    expect(() => extractAssistantText(null)).toThrow('缺少 choices 字段')
  })
  it('空内容抛错', () => {
    expect(() => extractAssistantText({ choices: [{ message: { content: '  ' } }] })).toThrow(
      '回复内容为空',
    )
    expect(() => extractAssistantText({ choices: [{ message: { content: 123 } }] })).toThrow(
      '回复内容为空',
    )
  })
  it('正常提取并 trim', () => {
    expect(extractAssistantText({ choices: [{ message: { content: '  一只猫  ' } }] })).toBe('一只猫')
  })
})

describe('parseHttpError', () => {
  it('各状态码中文提示', () => {
    expect(parseHttpError(401, '')).toContain('认证失败')
    expect(parseHttpError(403, '')).toContain('无权限')
    expect(parseHttpError(404, '')).toContain('接口不存在')
    expect(parseHttpError(429, '')).toContain('配额不足')
    expect(parseHttpError(500, '')).toContain('服务端错误')
    expect(parseHttpError(418, '')).toContain('HTTP 418')
  })
  it('错误体截断 200 字符并拼后缀', () => {
    const long = 'x'.repeat(300)
    const msg = parseHttpError(400, long)
    expect(msg).toContain('x'.repeat(200))
    expect(msg).not.toContain('x'.repeat(201))
    expect(parseHttpError(400, '')).toBe('请求失败（HTTP 400）')
  })
})

describe('requestAltText', () => {
  it('图片数据异常抛错', async () => {
    await expect(requestAltText('not-a-data-url', cfg())).rejects.toThrow('图片数据异常')
    await expect(requestAltText('', cfg())).rejects.toThrow('图片数据异常')
  })
  it('未填 Key 抛中文提示', async () => {
    await expect(requestAltText(DATA_URL, cfg({ apiKey: '  ' }))).rejects.toThrow('请先填写 API Key')
  })
  it('成功时 Authorization 只进请求头', async () => {
    let captured: { url: string; init: RequestInit } | null = null
    const fetchImpl = vi.fn(async (url: string, init: RequestInit) => {
      captured = { url, init }
      return {
        ok: true,
        json: async () => ({ choices: [{ message: { content: '一只橘猫' } }] }),
      }
    }) as unknown as FetchImpl
    const text = await requestAltText(DATA_URL, cfg(), fetchImpl)
    expect(text).toBe('一只橘猫')
    expect(captured!.url).toBe('https://api.openai.com/v1/chat/completions')
    const headers = captured!.init.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer sk-test-key')
    expect(String(captured!.init.body)).toContain(DATA_URL)
    expect(String(captured!.init.body)).toContain('image_url')
  })
  it('HTTP 错误映射为中文', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 404,
      text: async () => 'model_not_found',
    })) as unknown as FetchImpl
    await expect(requestAltText(DATA_URL, cfg(), fetchImpl)).rejects.toThrow('接口不存在')
  })
  it('错误体读取失败时无后缀', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 500,
      text: async () => {
        throw new Error('boom')
      },
    })) as unknown as FetchImpl
    await expect(requestAltText(DATA_URL, cfg(), fetchImpl)).rejects.toThrow('服务端错误（500）')
  })
  it('网络 TypeError 映射为中文', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    }) as unknown as FetchImpl
    await expect(requestAltText(DATA_URL, cfg(), fetchImpl)).rejects.toThrow('网络请求失败')
  })
  it('超时抛中文错', async () => {
    vi.useFakeTimers()
    const fetchImpl = vi.fn(
      (_url: string, init?: { signal?: AbortSignal }) =>
        new Promise<never>((_, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('aborted', 'AbortError'))
          })
        }),
    ) as unknown as FetchImpl
    const p = requestAltText(DATA_URL, cfg(), fetchImpl)
    const assertion = expect(p).rejects.toThrow('请求超时')
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS + 1000)
    await assertion
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })
})

describe('buildReport', () => {
  it('报告含类型标签与模型', () => {
    const r = buildReport('chart', 'm1', '柱状图')
    expect(r).toContain(IMAGE_KIND_LABELS.chart)
    expect(r).toContain('m1')
    expect(r).toContain('柱状图')
  })
  it('未知类型直接输出原值', () => {
    expect(buildReport('zzz' as ImageKind, 'm', 't')).toContain('zzz')
  })
})
