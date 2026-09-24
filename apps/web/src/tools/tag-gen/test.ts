import { describe, expect, it, afterEach, beforeEach, vi } from 'vitest'
import { grams, localTags, transform } from './utils'

const CONFIG = {
  text: '静态站点部署，静态站点构建，静态站点发布，容器镜像与宿主机共享配置。',
  apiBase: 'https://api.example.com/v1',
  apiKey: 'test-key',
  model: 'test-model',
}

/** 用一个固定的 OpenAI 风格响应替掉 fetch，测试里不发真实请求 */
function mockFetch(content: string) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content } }] }),
    text: async () => content,
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

beforeEach(() => {
  mockFetch('静态站点\n容器镜像')
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('tag-gen / grams', () => {
  it('切出 2–4 字候选', () => {
    expect(grams('静态站点')).toEqual(['静态', '态站', '站点', '静态站', '态站点', '静态站点'])
  })
})

describe('tag-gen / localTags', () => {
  it('按频次抽短语，长候选优先', () => {
    const tags = localTags('静态站点部署，静态站点构建，静态站点发布。', 5)
    expect(tags[0]).toBe('静态站点')
  })

  it('出现一次的短语不算标签', () => {
    expect(localTags('只出现一次的独特短语', 5)).toEqual([])
  })

  it('过滤停用词与单字母', () => {
    expect(localTags('this is a test this is a test', 5)).not.toContain('this')
  })

  it('受 limit 约束', () => {
    expect(localTags('静态站点静态站点容器镜像容器镜像部署脚本部署脚本', 1).length).toBe(1)
  })
})

describe('tag-gen / transform', () => {
  const base = { mode: 'local', limit: '5' } as const

  it('空输入返回空串且不发请求', async () => {
    await expect(transform({ ...CONFIG, text: '  ' }, base)).resolves.toBe('')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('抽不到短语时给出说明', async () => {
    await expect(transform({ ...CONFIG, text: '孤零零的一句话' }, base)).resolves.toContain(
      '没有抽到',
    )
  })

  it('ai 模式返回模型给的标签', async () => {
    const fetchMock = mockFetch('静态站点\n容器镜像')
    await expect(transform(CONFIG, { mode: 'ai', limit: '5' })).resolves.toBe('静态站点\n容器镜像')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('缺 API Key 时给出缺项提示', async () => {
    await expect(transform({ ...CONFIG, apiKey: '' }, { mode: 'ai', limit: '5' })).rejects.toThrow(
      '请先填写',
    )
  })
})
