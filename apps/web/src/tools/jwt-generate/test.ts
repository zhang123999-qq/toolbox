import { describe, expect, it } from 'vitest'
import {
  ALGORITHMS,
  parsePayload,
  requireAlgorithm,
  requireSecret,
  signJwt,
  transform,
} from './utils'

const hs256 = { algorithm: 'HS256' } as const
const hs512 = { algorithm: 'HS512' } as const

const SECRET = 'demo-secret-1234567890-demo-secret'
const PAYLOAD = '{"sub":"1234567890","name":"工具库 Toolbox","role":"admin"}'

/** 与示例完全一致的已知令牌（不写 iat/exp，故可复现） */
const KNOWN_HS256 =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IuW3peWFt-W6kyBUb29sYm94Iiwicm9sZSI6ImFkbWluIn0.ZBhZL0i-YX8INfmGx5HLpPl62RGIhBfCkhK-ymqzmuA'
const KNOWN_HS512 =
  'eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IuW3peWFt-W6kyBUb29sYm94Iiwicm9sZSI6ImFkbWluIn0.yK0c5QQqFJcNa6OpITPiCb5SyjedxxaDfPCoRpjM-a76kDel3i5xGrieHP0r7LGw8ERp93xG77X8pDThXLPsNw'

describe('jwt-generate / 输入校验', () => {
  it('payload 必须是 JSON 对象', () => {
    expect(parsePayload('{"a":1}')).toEqual({ a: 1 })
    expect(() => parsePayload('[1,2]')).toThrow(/必须是 JSON 对象/)
    expect(() => parsePayload('"str"')).toThrow(/必须是 JSON 对象/)
    expect(() => parsePayload('{oops')).toThrow(/不是合法的 JSON/)
  })

  it('密钥为空或过短时报错', () => {
    expect(() => requireSecret('')).toThrow(/请先填写密钥/)
    expect(() => requireSecret('short')).toThrow(/密钥太短/)
    expect(requireSecret(SECRET).length).toBe(SECRET.length)
  })

  it('算法白名单', () => {
    expect(ALGORITHMS).toEqual(['HS256', 'HS384', 'HS512'])
    expect(requireAlgorithm('HS256')).toBe('HS256')
    expect(() => requireAlgorithm('RS256')).toThrow(/不支持的算法/)
  })
})

describe('jwt-generate / 签名', () => {
  it('HS256 产出已知令牌（确定性）', async () => {
    await expect(signJwt(parsePayload(PAYLOAD), SECRET, 'HS256')).resolves.toBe(KNOWN_HS256)
  })

  it('HS512 产出已知令牌（确定性）', async () => {
    await expect(signJwt(parsePayload(PAYLOAD), SECRET, 'HS512')).resolves.toBe(KNOWN_HS512)
  })

  it('不同密钥得到不同签名', async () => {
    const other = await signJwt(parsePayload(PAYLOAD), SECRET + 'x', 'HS256')
    expect(other).not.toBe(KNOWN_HS256)
    // header.payload 两段应完全一致，只有签名段不同
    expect(other.split('.').slice(0, 2)).toEqual(KNOWN_HS256.split('.').slice(0, 2))
  })

  it('产出的令牌是 3 段且 header 写明算法', async () => {
    const token = await signJwt({ a: 1 }, SECRET, 'HS384')
    expect(token.split('.').length).toBe(3)
    expect(JSON.parse(atob(token.split('.')[0] ?? ''))).toEqual({ alg: 'HS384', typ: 'JWT' })
  })
})

describe('jwt-generate / transform', () => {
  it('按选项生成令牌', async () => {
    await expect(transform({ text: PAYLOAD, secret: SECRET }, hs256)).resolves.toBe(KNOWN_HS256)
    await expect(transform({ text: PAYLOAD, secret: SECRET }, hs512)).resolves.toBe(KNOWN_HS512)
  })

  it('空输入返回空串（不触发签名）', async () => {
    await expect(transform({ text: '', secret: SECRET }, hs256)).resolves.toBe('')
    await expect(transform({ text: '   ', secret: '' }, hs256)).resolves.toBe('')
  })
})
