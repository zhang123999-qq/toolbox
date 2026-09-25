import { describe, expect, it } from 'vitest'
import { HASH_PATTERN, hashPassword, parseCost, readCost, transform, verifyPassword } from './utils'

const hashOpt = { direction: 'hash', cost: '4' } as const
const verifyOpt = { direction: 'verify', cost: '4' } as const

const PASSWORD = 'P@ssw0rd-demo'

describe('bcrypt-hash / 参数', () => {
  it('cost 取值受白名单约束', () => {
    expect(parseCost('10')).toBe(10)
    expect(() => parseCost('20')).toThrow(/不支持的 cost/)
  })

  it('哈希串形状校验能识别非法输入', () => {
    expect(HASH_PATTERN.test('$2b$10$' + 'a'.repeat(53))).toBe(true)
    expect(HASH_PATTERN.test('$2b$10$abc')).toBe(false)
    expect(HASH_PATTERN.test('not-a-hash')).toBe(false)
  })
})

describe('bcrypt-hash / 哈希与校验', () => {
  it('生成的哈希符合 bcrypt 形状且 cost 生效', async () => {
    const hashed = await hashPassword(PASSWORD, '4')
    expect(hashed).toMatch(HASH_PATTERN)
    expect(readCost(hashed)).toBe(4)
  })

  it('同一口令两次哈希结果不同（盐随机）', async () => {
    const first = await hashPassword(PASSWORD, '4')
    const second = await hashPassword(PASSWORD, '4')
    expect(first).not.toBe(second)
  })

  it('正确口令校验通过，错误口令校验失败', async () => {
    const hashed = await hashPassword(PASSWORD, '4')
    await expect(verifyPassword(PASSWORD, hashed)).resolves.toContain('校验通过')
    await expect(verifyPassword(PASSWORD + 'x', hashed)).resolves.toContain('校验失败')
  })

  it('哈希串非法时报错而不是返回假结论', async () => {
    await expect(verifyPassword(PASSWORD, '')).rejects.toThrow(/请先粘贴/)
    await expect(verifyPassword(PASSWORD, 'plain-text')).rejects.toThrow(/不是合法的 bcrypt 哈希/)
  })
})

describe('bcrypt-hash / transform', () => {
  it('哈希方向产出可校验的哈希', async () => {
    const hashed = await transform({ text: PASSWORD, hash: '' }, hashOpt)
    await expect(transform({ text: PASSWORD, hash: hashed }, verifyOpt)).resolves.toContain(
      '校验通过',
    )
  })

  it('空输入返回空串（不触发任何哈希运算）', async () => {
    await expect(transform({ text: '', hash: '' }, hashOpt)).resolves.toBe('')
    await expect(transform({ text: '', hash: '' }, verifyOpt)).resolves.toBe('')
  })
})
