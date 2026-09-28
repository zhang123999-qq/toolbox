/**
 * private-key（#692）utils 单测：随机源注入确定性 / 范围校验 / 格式化 / 解析。
 */
import { describe, expect, it } from 'vitest'
import {
  SECP256K1_N,
  bytesToHex,
  formatPrivateKey,
  generatePrivateKey,
  generatePrivateKeys,
  hexToBytes,
  isValidPrivateKeyBytes,
  parsePrivateKey,
} from './utils'

/** 固定 32 字节：k = 1 */
const ONE = new Uint8Array(32).fill(0)
ONE[31] = 1
const ONE_HEX = '0000000000000000000000000000000000000000000000000000000000000001'

/** n − 1（最大有效私钥） */
const N_MINUS_ONE_HEX = (SECP256K1_N - 1n).toString(16).padStart(64, '0')

describe('isValidPrivateKeyBytes', () => {
  it('k=1 有效', () => {
    expect(isValidPrivateKeyBytes(ONE)).toBe(true)
  })

  it('k=n−1 有效', () => {
    expect(isValidPrivateKeyBytes(hexToBytes(N_MINUS_ONE_HEX))).toBe(true)
  })

  it('全零无效', () => {
    expect(isValidPrivateKeyBytes(new Uint8Array(32))).toBe(false)
  })

  it('k=n 无效', () => {
    expect(isValidPrivateKeyBytes(hexToBytes(SECP256K1_N.toString(16).padStart(64, '0')))).toBe(
      false,
    )
  })

  it('k=n+1 无效', () => {
    expect(
      isValidPrivateKeyBytes(hexToBytes((SECP256K1_N + 1n).toString(16).padStart(64, '0'))),
    ).toBe(false)
  })

  it('长度非 32 无效', () => {
    expect(isValidPrivateKeyBytes(new Uint8Array(31))).toBe(false)
    expect(isValidPrivateKeyBytes(new Uint8Array(33))).toBe(false)
  })
})

describe('generatePrivateKey（随机源注入）', () => {
  it('固定源产出确定结果', () => {
    const key = generatePrivateKey(() => ONE.slice())
    expect(bytesToHex(key)).toBe(ONE_HEX)
  })

  it('跳过无效值后取有效值', () => {
    let calls = 0
    const key = generatePrivateKey(() => {
      calls += 1
      return calls <= 2 ? new Uint8Array(32) : ONE.slice()
    })
    expect(calls).toBe(3)
    expect(bytesToHex(key)).toBe(ONE_HEX)
  })

  it('随机源持续无效时抛错', () => {
    expect(() => generatePrivateKey(() => new Uint8Array(32))).toThrow('持续产出无效值')
  })

  it('默认随机源生成有效私钥', () => {
    const key = generatePrivateKey()
    expect(key).toHaveLength(32)
    expect(isValidPrivateKeyBytes(key)).toBe(true)
  })
})

describe('formatPrivateKey / generatePrivateKeys', () => {
  it('带 / 不带 0x 前缀', () => {
    expect(formatPrivateKey(ONE, true)).toBe(`0x${ONE_HEX}`)
    expect(formatPrivateKey(ONE, false)).toBe(ONE_HEX)
  })

  it('批量生成数量与格式', () => {
    const keys = generatePrivateKeys(3, true, () => ONE.slice())
    expect(keys).toHaveLength(3)
    expect(keys[0]).toBe(`0x${ONE_HEX}`)
  })

  it('数量非法抛错', () => {
    expect(() => generatePrivateKeys(0, true)).toThrow('1–100')
    expect(() => generatePrivateKeys(101, true)).toThrow('1–100')
    expect(() => generatePrivateKeys(1.5, true)).toThrow('1–100')
  })
})

describe('parsePrivateKey', () => {
  it('带 0x 前缀解析', () => {
    expect(bytesToHex(parsePrivateKey(`0x${ONE_HEX}`))).toBe(ONE_HEX)
  })

  it('大写 hex 解析', () => {
    expect(bytesToHex(parsePrivateKey(ONE_HEX.toUpperCase()))).toBe(ONE_HEX)
  })

  it('空输入抛错', () => {
    expect(() => parsePrivateKey('  ')).toThrow('不能为空')
  })

  it('长度错误抛错', () => {
    expect(() => parsePrivateKey('0x1234')).toThrow('64 位十六进制')
  })

  it('非 hex 字符抛错', () => {
    expect(() => parsePrivateKey(`0x${'zz'.padEnd(64, '0')}`)).toThrow('64 位十六进制')
  })

  it('全零私钥抛错', () => {
    expect(() => parsePrivateKey('0'.repeat(64))).toThrow('数值无效')
  })

  it('k=n 抛错', () => {
    expect(() => parsePrivateKey(SECP256K1_N.toString(16).padStart(64, '0'))).toThrow('数值无效')
  })
})
