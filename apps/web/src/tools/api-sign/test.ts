/**
 * api-sign（#757）utils 单测：HMAC-SHA256 签名与验签（用 Node 真实 webcrypto）。
 */
import { webcrypto } from 'node:crypto'
import { describe, expect, it, vi, afterEach } from 'vitest'
import {
  buildQueryString,
  buildStringToSign,
  bytesToBase64,
  bytesToHex,
  defaultSubtle,
  parseSignParams,
  signRequest,
  verifySignature,
  type SubtleLike,
} from './utils'

afterEach(() => {
  vi.unstubAllGlobals()
})

const subtle = webcrypto.subtle as unknown as SubtleLike

const FIXED = {
  method: 'GET',
  path: '/api/users',
  params: { b: '2', a: '1' },
  secret: 'test-secret',
  timestamp: '1700000000',
  nonce: 'abc123',
}
// 由 Node webcrypto 独立计算的固定向量
const EXPECTED_HEX = '84d35472869ac4ba7a89a60007c4acb209c0d2579174e45d35433618588a5825'
const EXPECTED_B64 = 'hNNUcoaaxLp6iaYAB8SssgnA0leRdORdNUM2GFiKWCU='

describe('bytesToHex / bytesToBase64', () => {
  it('字节转 hex', () => {
    expect(bytesToHex(new Uint8Array([0xab, 0x01]))).toBe('ab01')
  })
  it('字节转 base64', () => {
    expect(bytesToBase64(new Uint8Array([104, 105]))).toBe('aGk=')
  })
})

describe('buildQueryString', () => {
  it('按键排序拼接', () => {
    expect(buildQueryString({ b: '2', a: '1' })).toBe('a=1&b=2')
  })
  it('空对象返回空字符串', () => {
    expect(buildQueryString({})).toBe('')
  })
})

describe('parseSignParams', () => {
  it('非法 JSON 抛错', () => {
    expect(() => parseSignParams('{')).toThrow('不是合法 JSON')
  })
  it('非对象抛错', () => {
    expect(() => parseSignParams('[1]')).toThrow('必须是 JSON 对象')
    expect(() => parseSignParams('null')).toThrow('必须是 JSON 对象')
  })
  it('对象值转字符串', () => {
    expect(parseSignParams('{"a":1,"b":"x","c":true}')).toEqual({ a: '1', b: 'x', c: 'true' })
  })
  it('空对象通过', () => {
    expect(parseSignParams('{}')).toEqual({})
  })
})

describe('buildStringToSign', () => {
  it('默认模板五行拼接', () => {
    expect(
      buildStringToSign({
        method: 'get',
        path: '/api/users',
        query: 'a=1',
        timestamp: 't',
        nonce: 'n',
      }),
    ).toBe('GET\n/api/users\na=1\nt\nn')
  })
  it('自定义模板占位替换', () => {
    expect(
      buildStringToSign({
        method: 'POST',
        path: '/x',
        query: 'a=1',
        timestamp: 't',
        nonce: 'n',
        template: '{method}|{path}|{query}|{timestamp}|{nonce}',
      }),
    ).toBe('POST|/x|a=1|t|n')
  })
  it('非法占位抛错', () => {
    expect(() =>
      buildStringToSign({
        method: 'GET',
        path: '/',
        query: '',
        timestamp: 't',
        nonce: 'n',
        template: '{method} {hack}',
      }),
    ).toThrow('模板占位非法：{hack}')
  })
  it('模板无占位原样返回', () => {
    expect(
      buildStringToSign({
        method: 'GET',
        path: '/',
        query: '',
        timestamp: 't',
        nonce: 'n',
        template: 'static',
      }),
    ).toBe('static')
  })
})

describe('defaultSubtle', () => {
  it('返回可用的 subtle', () => {
    expect(typeof defaultSubtle().importKey).toBe('function')
  })
  it('无 WebCrypto 时抛错', () => {
    const orig = globalThis.crypto
    vi.stubGlobal('crypto', undefined)
    try {
      expect(() => defaultSubtle()).toThrow('不支持 WebCrypto')
    } finally {
      vi.stubGlobal('crypto', orig)
    }
  })
})

describe('signRequest', () => {
  it('固定向量 hex 与独立计算一致', async () => {
    const r = await signRequest(FIXED, subtle)
    expect(r.stringToSign).toBe('GET\n/api/users\na=1&b=2\n1700000000\nabc123')
    expect(r.query).toBe('a=1&b=2')
    expect(r.signatureHex).toBe(EXPECTED_HEX)
    expect(r.signatureBase64).toBe(EXPECTED_B64)
    expect(r.signature).toBe(EXPECTED_HEX)
    expect(r.timestamp).toBe('1700000000')
    expect(r.nonce).toBe('abc123')
  })
  it('base64 编码输出', async () => {
    const r = await signRequest({ ...FIXED, encoding: 'base64' }, subtle)
    expect(r.signature).toBe(EXPECTED_B64)
  })
  it('空密钥抛错', async () => {
    await expect(signRequest({ ...FIXED, secret: '' }, subtle)).rejects.toThrow('请输入签名密钥')
  })
  it('空方法抛错', async () => {
    await expect(signRequest({ ...FIXED, method: '  ' }, subtle)).rejects.toThrow('请输入请求方法')
  })
  it('非字符串方法抛错', async () => {
    await expect(
      signRequest({ ...FIXED, method: 42 as unknown as string }, subtle),
    ).rejects.toThrow('请输入请求方法')
  })
  it('path 非 / 开头抛错', async () => {
    await expect(signRequest({ ...FIXED, path: 'api' }, subtle)).rejects.toThrow(
      'path 必须以 / 开头',
    )
  })
  it('非字符串 path 抛错', async () => {
    await expect(signRequest({ ...FIXED, path: 42 as unknown as string }, subtle)).rejects.toThrow(
      'path 必须以 / 开头',
    )
  })
  it('缺省 timestamp/nonce 自动生成', async () => {
    const { timestamp: _ts, nonce: _nc, ...rest } = FIXED
    const r = await signRequest(rest, subtle)
    expect(r.timestamp).toMatch(/^\d+$/)
    expect(r.nonce).toBeTruthy()
  })
  it('缺省 params 为空', async () => {
    const { params: _p, ...rest } = FIXED
    const r = await signRequest(rest, subtle)
    expect(r.query).toBe('')
  })
  it('默认 encoding 为 hex', async () => {
    const { encoding: _e, ...rest } = { ...FIXED, encoding: 'hex' as const }
    const r = await signRequest(rest, subtle)
    expect(r.signature).toBe(r.signatureHex)
  })
  it('自定义模板参与签名', async () => {
    const r = await signRequest({ ...FIXED, template: '{method} {path}' }, subtle)
    expect(r.stringToSign).toBe('GET /api/users')
    expect(r.signatureHex).not.toBe(EXPECTED_HEX)
  })
})

describe('verifySignature', () => {
  it('正确 hex 签名验签通过', async () => {
    await expect(verifySignature({ ...FIXED, signature: EXPECTED_HEX }, subtle)).resolves.toBe(true)
  })
  it('正确 base64 签名验签通过', async () => {
    await expect(verifySignature({ ...FIXED, signature: EXPECTED_B64 }, subtle)).resolves.toBe(true)
  })
  it('错误签名验签失败', async () => {
    await expect(verifySignature({ ...FIXED, signature: 'deadbeef' }, subtle)).resolves.toBe(false)
  })
  it('参数被篡改验签失败', async () => {
    await expect(
      verifySignature({ ...FIXED, params: { a: '9' }, signature: EXPECTED_HEX }, subtle),
    ).resolves.toBe(false)
  })
})
