import { describe, expect, it } from 'vitest'
import { DEMO_CERTIFICATE, daysBetween, detectKind, parsePem, readLabel, transform } from './utils'

const VALID_FROM = Date.UTC(2024, 0, 1)
const VALID_TO = Date.UTC(2034, 0, 1)

describe('pem-parse / 类型识别', () => {
  it('按 PEM 标签判断种类', () => {
    expect(detectKind('-----BEGIN CERTIFICATE-----\nabc\n-----END CERTIFICATE-----')).toBe(
      'certificate',
    )
    expect(detectKind('-----BEGIN RSA PRIVATE KEY-----\nabc\n-----END RSA PRIVATE KEY-----')).toBe(
      'privateKey',
    )
    expect(detectKind('-----BEGIN PUBLIC KEY-----\nabc\n-----END PUBLIC KEY-----')).toBe(
      'publicKey',
    )
    expect(
      detectKind('-----BEGIN CERTIFICATE REQUEST-----\nabc\n-----END CERTIFICATE REQUEST-----'),
    ).toBe('csr')
    expect(detectKind('-----BEGIN SOMETHING ELSE-----\nabc\n-----END SOMETHING ELSE-----')).toBe(
      'unknown',
    )
  })

  it('没有 BEGIN 标记时报错', () => {
    expect(() => readLabel('plain text')).toThrow(/不是 PEM/)
    expect(() => detectKind('plain text')).toThrow(/不是 PEM/)
  })
})

describe('pem-parse / 证书解析', () => {
  it('读出主题、签发者、有效期、公钥与 SAN', async () => {
    const text = await parsePem(DEMO_CERTIFICATE, VALID_FROM + 86_400_000)
    expect(text).toContain('X.509 证书')
    expect(text).toContain('CN=demo.toolbox.local')
    expect(text).toContain('同上（自签发）')
    expect(text).toContain('RSA 2048 位')
    expect(text).toContain('2024-01-01T00:00:00.000Z')
    expect(text).toContain('2034-01-01T00:00:00.000Z')
    expect(text).toContain('DNS:demo.toolbox.local')
  })

  it('有效期状态随时间判断', async () => {
    const before = await parsePem(DEMO_CERTIFICATE, Date.UTC(2020, 0, 1))
    expect(before).toContain('尚未生效')

    const inside = await parsePem(DEMO_CERTIFICATE, Date.UTC(2025, 0, 1))
    expect(inside).toContain('有效期内')

    const after = await parsePem(DEMO_CERTIFICATE, Date.UTC(2035, 0, 1))
    expect(after).toContain('已过期')
  })

  it('天数计算按整天取整', () => {
    expect(daysBetween(VALID_FROM, VALID_TO)).toBe(3653)
  })
})

describe('pem-parse / 其它类型与异常', () => {
  it('加密私钥不会尝试解析内容', async () => {
    const text = await parsePem(
      '-----BEGIN ENCRYPTED PRIVATE KEY-----\nMIGb\n-----END ENCRYPTED PRIVATE KEY-----',
    )
    expect(text).toContain('已加密')
  })

  it('未识别的标签给出提示而不是崩溃', async () => {
    const text = await parsePem('-----BEGIN WHATEVER-----\nabc\n-----END WHATEVER-----')
    expect(text).toContain('暂不支持该标签')
  })

  it('内容是 PEM 壳子但结构不对时报错', async () => {
    await expect(
      parsePem('-----BEGIN CERTIFICATE-----\nnot-a-cert\n-----END CERTIFICATE-----'),
    ).rejects.toThrow()
  })
})

describe('pem-parse / transform', () => {
  it('空输入返回空串（不加载解析库）', async () => {
    await expect(transform({ text: '' }, {})).resolves.toBe('')
    await expect(transform({ text: '   ' }, {})).resolves.toBe('')
  })
})
