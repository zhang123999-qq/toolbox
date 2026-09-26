import { describe, expect, it, vi } from 'vitest'
import type { Argon2Options } from './schema'
import type { Argon2Params } from './utils'
import {
  HASH_LENGTH,
  ITERATIONS,
  MEMORIES,
  PARALLELISMS,
  PHC_PATTERN,
  buildParams,
  randomSalt,
  transform,
  verifyPassword,
} from './utils'

/**
 * argon2-browser（自包含 bundled 产物）在 Node 测试环境不跑真实 wasm。
 * 这里用桩件替换它：被测的是「参数构造 / 结果处理 / 错误分类」。
 * mock 的模块名必须与 utils.ts 动态 import 的自包含产物路径一致。
 */
const hashMock = vi.fn(async (_params: Argon2Params) => ({
  encoded: '$argon2id$v=19$m=19456,t=2,p=1$c2FsdHNhbHRzYWx0c2FsdA$Y2hlY2tjaGVja2NoZWNrY2hlY2s',
  hash: new Uint8Array(32),
  hashHex: '00'.repeat(32),
}))
const verifyMock = vi.fn(async () => undefined)

vi.mock('argon2-browser/dist/argon2-bundled.min.js', () => ({
  default: {
    ArgonType: { Argon2d: 0, Argon2i: 1, Argon2id: 2 },
    hash: hashMock,
    verify: verifyMock,
  },
}))

const hashOpt = { direction: 'hash', iterations: '2', memory: '19456', parallelism: '1' } as const
const verifyOpt = { ...hashOpt, direction: 'verify' } as const

const PASSWORD = 'P@ssw0rd-demo'
const PHC = '$argon2id$v=19$m=19456,t=2,p=1$c2FsdHNhbHRzYWx0c2FsdA$Y2hlY2tjaGVja2NoZWNrY2hlY2s'

describe('argon2-hash / 参数构造', () => {
  it('选项映射成 Argon2 参数（Argon2id）', () => {
    expect(buildParams(PASSWORD, 'saltsaltsaltsaltsalt', hashOpt)).toEqual({
      pass: PASSWORD,
      salt: 'saltsaltsaltsaltsalt',
      time: 2,
      mem: 19456,
      parallelism: 1,
      hashLen: HASH_LENGTH,
      type: 2,
    })
  })

  it('非法取值直接报错', () => {
    expect(() =>
      buildParams(PASSWORD, 's', { ...hashOpt, iterations: '9' } as unknown as Argon2Options),
    ).toThrow(/迭代次数/)
    expect(() =>
      buildParams(PASSWORD, 's', { ...hashOpt, memory: '1' } as unknown as Argon2Options),
    ).toThrow(/内存开销/)
    expect(() =>
      buildParams(PASSWORD, 's', { ...hashOpt, parallelism: '9' } as unknown as Argon2Options),
    ).toThrow(/并行度/)
  })

  it('取值白名单与 schema 一致', () => {
    expect(ITERATIONS).toEqual(['1', '2', '3'])
    expect(MEMORIES).toEqual(['8192', '19456', '32768'])
    expect(PARALLELISMS).toEqual(['1', '2'])
  })

  it('随机盐是 16 字节的 Base64（22 字符）', () => {
    const salt = randomSalt()
    expect(salt).toMatch(/^[A-Za-z0-9+/]{22}[A-Za-z0-9+/=]{0,2}$/)
    expect(atob(salt).length).toBe(16)
  })
})

describe('argon2-hash / 哈希与校验', () => {
  it('哈希方向把选项透传给 WASM 并回传 PHC 串', async () => {
    hashMock.mockClear()
    const result = await transform({ text: PASSWORD, hash: '' }, hashOpt)
    expect(result).toBe(PHC)
    const params = hashMock.mock.calls[0]?.[0]
    expect(params?.time).toBe(2)
    expect(params?.mem).toBe(19456)
    expect(params?.type).toBe(2)
  })

  it('校验通过 / 失败分别给出结论', async () => {
    verifyMock.mockClear()
    await expect(verifyPassword(PASSWORD, PHC)).resolves.toContain('校验通过')

    verifyMock.mockRejectedValueOnce(new Error('mismatch'))
    await expect(verifyPassword(PASSWORD + 'x', PHC)).resolves.toContain('校验失败')
  })

  it('PHC 串不合法时报错而不是给出假结论', async () => {
    await expect(verifyPassword(PASSWORD, '')).rejects.toThrow(/请先粘贴/)
    await expect(verifyPassword(PASSWORD, 'plain')).rejects.toThrow(/不是合法的 Argon2 PHC 串/)
    expect(PHC_PATTERN.test(PHC)).toBe(true)
  })
})

describe('argon2-hash / transform', () => {
  it('空输入返回空串（不会去加载 WASM）', async () => {
    hashMock.mockClear()
    await expect(transform({ text: '', hash: '' }, hashOpt)).resolves.toBe('')
    await expect(transform({ text: '', hash: '' }, verifyOpt)).resolves.toBe('')
    expect(hashMock).not.toHaveBeenCalled()
  })
})
