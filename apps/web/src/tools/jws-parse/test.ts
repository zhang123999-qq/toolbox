import { describe, expect, it } from 'vitest'
import {
  ALGORITHMS,
  describeFailure,
  formatResult,
  requireSecret,
  transform,
  verifyJws,
} from './utils'

const SECRET = 'demo-secret-1234567890-demo-secret'
const TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IuW3peWFt-W6kyBUb29sYm94Iiwicm9sZSI6ImFkbWluIn0.ZBhZL0i-YX8INfmGx5HLpPl62RGIhBfCkhK-ymqzmuA'

describe('jws-parse / 输入校验', () => {
  it('密钥为空或过短时报错（属于输入错误，抛错）', () => {
    expect(() => requireSecret('')).toThrow(/请先填写密钥/)
    expect(() => requireSecret('short')).toThrow(/密钥太短/)
    expect(ALGORITHMS).toEqual(['HS256', 'HS384', 'HS512'])
  })

  it('不是 3 段时抛错', async () => {
    await expect(verifyJws('a.b', SECRET, 'HS256')).rejects.toThrow(/应由 3 段组成/)
  })
})

describe('jws-parse / 验签', () => {
  it('正确密钥 → 验签通过并读出 payload', async () => {
    const result = await verifyJws(TOKEN, SECRET, 'HS256')
    expect(result.valid).toBe(true)
    expect((result.payload as Record<string, unknown>).name).toBe('工具库 Toolbox')
    expect(result.header).toEqual({ alg: 'HS256', typ: 'JWT' })
  })

  it('错误密钥 → 验签失败但不抛错', async () => {
    const result = await verifyJws(TOKEN, SECRET + 'x', 'HS256')
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('签名不匹配')
  })

  it('算法选错 → 提示算法不匹配', async () => {
    const result = await verifyJws(TOKEN, SECRET, 'HS512')
    expect(result.valid).toBe(false)
    expect(result.reason).toMatch(/算法不匹配|验签失败/)
  })

  it('内容被篡改 → 签名不匹配', async () => {
    const parts = TOKEN.split('.')
    const tampered = [parts[0], 'eyJzdWIiOiJoYWNrZXIifQ', parts[2]].join('.')
    const result = await verifyJws(tampered, SECRET, 'HS256')
    expect(result.valid).toBe(false)
  })

  it('输出：成功带 payload，失败只给结论', () => {
    expect(
      formatResult({ valid: true, header: { alg: 'HS256' }, payload: { a: 1 }, reason: '' }),
    ).toContain('验签通过')
    expect(formatResult({ valid: false, header: null, payload: null, reason: '签名不匹配' })).toBe(
      '验签失败：签名不匹配',
    )
  })
})

describe('jws-parse / 报错翻译', () => {
  it('jose 的英文报错翻成中文', () => {
    expect(describeFailure('signature verification failed')).toContain('签名不匹配')
    expect(describeFailure('"alg" (Algorithm) Header Parameter not allowed')).toContain(
      '算法不匹配',
    )
    expect(describeFailure('"exp" claim timestamp check failed')).toContain('已过期')
    expect(describeFailure('something else')).toContain('验签失败')
  })
})

describe('jws-parse / transform', () => {
  it('整体流程：示例令牌验签通过', async () => {
    await expect(
      transform({ text: TOKEN, secret: SECRET }, { algorithm: 'HS256' }),
    ).resolves.toContain('验签通过')
  })

  it('空输入返回空串（不触发验签）', async () => {
    await expect(transform({ text: '', secret: SECRET }, { algorithm: 'HS256' })).resolves.toBe('')
  })
})
