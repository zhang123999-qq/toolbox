import { afterEach, describe, expect, it, vi } from 'vitest'
import { LENGTHS, encodeSalt, parseLength, toBase64, toHex, transform } from './utils'

const encoder = new TextEncoder()
const base = { length: '16', format: 'hex' } as const

/** 确定性随机源：全部填 0xab，便于断言输出 */
const fillAb: (bytes: Uint8Array) => Uint8Array = (bytes) => bytes.fill(0xab)

/** 计数随机源：用于确认「空输入不会调用随机源」 */
function countingRng(): { rng: (bytes: Uint8Array) => Uint8Array; calls: () => number } {
  let calls = 0
  return {
    rng: (bytes) => {
      calls += 1
      return bytes.fill(0x01)
    },
    calls: () => calls,
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('random-salt / 编码辅助', () => {
  it('逐字节转两位小写十六进制', () => {
    expect(toHex(Uint8Array.from([0x00, 0x0f, 0xff]))).toBe('000fff')
  })

  it('Base64 编码正确处理 3 / 2 / 1 三种尾部长度', () => {
    expect(toBase64(encoder.encode('abc'))).toBe('YWJj')
    expect(toBase64(encoder.encode('ab'))).toBe('YWI=')
    expect(toBase64(encoder.encode('a'))).toBe('YQ==')
  })

  it('encodeSalt 支持 hex / base64 / base64url', () => {
    const bytes = Uint8Array.from([0xfb, 0xef, 0xbe])
    expect(encodeSalt(bytes, 'hex')).toBe('fbefbe')
    expect(encodeSalt(bytes, 'base64')).toBe('++++')
    expect(encodeSalt(bytes, 'base64url')).toBe('----')
  })
})

describe('random-salt / parseLength', () => {
  it('三种长度的取值与字节数', () => {
    expect(LENGTHS.map(parseLength)).toEqual([16, 32, 64])
  })

  it('非法长度直接报错', () => {
    expect(() => parseLength('7')).toThrow(/不支持的长度/)
    expect(() => parseLength('1e3')).toThrow(/不支持的长度/)
  })
})

describe('random-salt / transform（可注入随机源）', () => {
  it('空输入返回空串，且不调用随机源（SSG 友好）', async () => {
    const counter = countingRng()
    await expect(transform({ text: '' }, base, counter.rng)).resolves.toBe('')
    expect(counter.calls()).toBe(0)
  })

  it('注入确定性随机源后输出可预测：16 字节 → 32 位 hex', async () => {
    await expect(transform({ text: 'x' }, base, fillAb)).resolves.toBe('ab'.repeat(16))
  })

  it('长度选项分别产出 32 / 64 / 128 位 hex', async () => {
    for (const [length, chars] of [
      ['16', 32],
      ['32', 64],
      ['64', 128],
    ] as const) {
      const out = await transform({ text: 'x' }, { length, format: 'hex' }, fillAb)
      expect(out).toHaveLength(chars)
    }
  })

  it('base64 / base64url 输出符合各自字母表', async () => {
    const b64 = await transform({ text: 'x' }, { length: '16', format: 'base64' }, fillAb)
    const url = await transform({ text: 'x' }, { length: '16', format: 'base64url' }, fillAb)
    expect(b64).toBe('q6urq6urq6urq6urq6urqw==')
    expect(url).toBe('q6urq6urq6urq6urq6urqw')
    expect(url).not.toMatch(/[+/=]/)
  })

  it('默认随机源（CSPRNG）产出的盐每次不同，且格式合法', async () => {
    const a = await transform({ text: 'x' }, { length: '32', format: 'hex' })
    const b = await transform({ text: 'x' }, { length: '32', format: 'hex' })
    expect(a).toMatch(/^[0-9a-f]{64}$/)
    expect(b).toMatch(/^[0-9a-f]{64}$/)
    expect(a).not.toBe(b)
  })

  it('环境没有 crypto.getRandomValues 时报错而不是产出弱随机', async () => {
    vi.stubGlobal('crypto', undefined)
    await expect(transform({ text: 'x' }, base)).rejects.toThrow(/getRandomValues/)
  })
})
