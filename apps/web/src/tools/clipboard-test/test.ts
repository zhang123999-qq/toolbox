/**
 * clipboard-test 工具测试（#864）：clipboard 经参数注入字面 mock。
 */
import { describe, expect, it, vi } from 'vitest'
import { readText, roundtripCheck, roundtripText, supportsClipboard, writeText } from './utils'
import type { ClipboardLike } from './utils'

function mockClip(store: { text: string }): ClipboardLike {
  return {
    writeText: vi.fn(async (t: string) => {
      store.text = t
    }),
    readText: vi.fn(async () => store.text),
  }
}

describe('clipboard-test · supportsClipboard', () => {
  it('nav 为空时返回 false', () => {
    expect(supportsClipboard(null)).toBe(false)
    expect(supportsClipboard(undefined)).toBe(false)
  })

  it('clipboard 缺失时返回 false', () => {
    expect(supportsClipboard({})).toBe(false)
    expect(supportsClipboard({ clipboard: null })).toBe(false)
  })

  it('仅有写函数时返回 false', () => {
    expect(supportsClipboard({ clipboard: { writeText: async () => {} } })).toBe(false)
  })

  it('读写函数齐备时返回 true', () => {
    expect(supportsClipboard({ clipboard: mockClip({ text: '' }) })).toBe(true)
  })
})

describe('clipboard-test · writeText / readText', () => {
  it('clip 为空时抛中文错', async () => {
    await expect(writeText(null, 'a')).rejects.toThrow('不支持 Clipboard 写入')
    await expect(readText(null)).rejects.toThrow('不支持 Clipboard 读取')
  })

  it('写入后可读回', async () => {
    const store = { text: '' }
    const clip = mockClip(store)
    await writeText(clip, 'hello')
    await expect(readText(clip)).resolves.toBe('hello')
  })

  it('writeText 缺失时抛中文错', async () => {
    await expect(writeText({}, 'a')).rejects.toThrow('不支持 Clipboard 写入')
  })

  it('readText 缺失时抛中文错', async () => {
    await expect(readText({ writeText: async () => {} })).rejects.toThrow('不支持 Clipboard 读取')
  })
})

describe('clipboard-test · roundtripCheck', () => {
  it('一致时 ok 为 true', async () => {
    const r = await roundtripCheck(mockClip({ text: '' }), 'abc')
    expect(r.ok).toBe(true)
    expect(r.readBack).toBe('abc')
    expect(roundtripText(r)).toContain('往返一致')
  })

  it('读回不同时 ok 为 false', async () => {
    const clip: ClipboardLike = {
      writeText: async () => {},
      readText: async () => 'different',
    }
    const r = await roundtripCheck(clip, 'abc')
    expect(r.ok).toBe(false)
    expect(roundtripText(r)).toContain('往返不一致')
  })

  it('clip 不可用时向上抛错', async () => {
    await expect(roundtripCheck(null, 'a')).rejects.toThrow('不支持 Clipboard 写入')
  })
})
