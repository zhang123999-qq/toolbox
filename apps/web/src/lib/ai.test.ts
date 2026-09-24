/**
 * lib/ai 单测（可行性 D 的工具共用）。
 *
 * 只测「不联网也能测」的部分：配置校验、地址归一化，以及用桩替换 fetch 之后的
 * 请求拼装与错误处理。真正发请求的部分不在单测里覆盖（要自备 API）。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AI_TIMEOUT, assertConfig, chat, normalizeBase } from './ai'

const CONFIG = { apiBase: 'https://api.example.com/v1/', apiKey: 'sk-test', model: 'gpt-mini' }

function stubFetch(impl: () => Promise<Response>) {
  const spy = vi.fn(impl)
  vi.stubGlobal('fetch', spy)
  return spy
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ai / normalizeBase', () => {
  it('去掉末尾多余斜杠，避免拼出 //chat/completions', () => {
    expect(normalizeBase('https://api.example.com/v1///')).toBe('https://api.example.com/v1')
  })

  it('两侧空白也一并去掉', () => {
    expect(normalizeBase('  https://api.example.com/v1  ')).toBe('https://api.example.com/v1')
  })
})

describe('ai / assertConfig', () => {
  it('三项齐全时不抛错', () => {
    expect(() => assertConfig(CONFIG)).not.toThrow()
  })

  it('缺哪一项就在报错里点名', () => {
    expect(() => assertConfig({ ...CONFIG, apiKey: '' })).toThrow(/API Key/)
    expect(() => assertConfig({ ...CONFIG, model: '  ' })).toThrow(/模型名/)
    expect(() => assertConfig({ ...CONFIG, apiBase: '   ' })).toThrow(/接口地址/)
  })

  it('多项缺失时一起列出', () => {
    expect(() => assertConfig({ apiBase: '', apiKey: '', model: '' })).toThrow(
      /接口地址、API Key、模型名/,
    )
  })
})

describe('ai / chat', () => {
  it('请求打到 chat/completions，带上 Bearer 与模型名', async () => {
    const fetchSpy = stubFetch(() =>
      Promise.resolve(
        new Response(JSON.stringify({ choices: [{ message: { content: ' 你好 ' } }] }), {
          status: 200,
        }),
      ),
    )
    await expect(chat(CONFIG, '你是助手', '你好')).resolves.toBe('你好')

    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.example.com/v1/chat/completions')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sk-test')
    expect(JSON.parse(String(init.body)).model).toBe('gpt-mini')
  })

  it('配置不全时先在本地报错，不发请求', async () => {
    const fetchSpy = stubFetch(() => Promise.resolve(new Response('{}', { status: 200 })))
    await expect(chat({ ...CONFIG, apiKey: '' }, 's', 'u')).rejects.toThrow(/请先填写/)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('非 200 时把状态码带进报错', async () => {
    stubFetch(() => Promise.resolve(new Response('unauthorized', { status: 401 })))
    await expect(chat(CONFIG, 's', 'u')).rejects.toThrow(/401/)
  })

  it('返回体没有内容时给出明确报错', async () => {
    stubFetch(() => Promise.resolve(new Response(JSON.stringify({ choices: [] }), { status: 200 })))
    await expect(chat(CONFIG, 's', 'u')).rejects.toThrow(/没有返回文本内容/)
  })

  it('超时时间用的是统一的常量', () => {
    expect(AI_TIMEOUT).toBeGreaterThan(0)
  })
})
