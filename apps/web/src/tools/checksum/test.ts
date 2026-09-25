import { describe, expect, it } from 'vitest'
import {
  ALGORITHMS,
  compute,
  luhnCheckDigit,
  mod256,
  requireAlgorithm,
  sum16,
  sum32,
  sum8,
  transform,
  utf8Bytes,
  xor8,
} from './utils'

const base = { algorithm: 'sum8', uppercase: false } as const
const upper = { ...base, uppercase: true } as const

describe('checksum / 各算法', () => {
  it('sum8：' + '"hello" 的累加和 mod 256 = 0x14', () => {
    expect(utf8Bytes('hello').length).toBe(5)
    expect(sum8(utf8Bytes('hello'))).toBe(20)
    expect(compute('hello', base).value).toBe('14')
  })

  it('sum16：按大端 16 位字累加，末字节补 0', () => {
    // 0x6865 + 0x6C6C + 0x6F00 = 82897 → mod 65536 = 17361 = 0x43D1
    expect(sum16(utf8Bytes('hello'))).toBe(0x43d1)
    expect(compute('hello', { ...base, algorithm: 'sum16' }).value).toBe('43d1')
  })

  it('sum32：按大端 32 位字累加', () => {
    expect(sum32(utf8Bytes('ABCD'))).toBe(0x41424344)
    expect(compute('ABCD', { ...base, algorithm: 'sum32' }).value).toBe('41424344')
  })

  it('xor8：逐字节异或', () => {
    expect(xor8(utf8Bytes('hello'))).toBe(0x62)
    expect(xor8(utf8Bytes(''))).toBe(0)
  })

  it('mod256：256 − 累加和', () => {
    expect(mod256(utf8Bytes('hello'))).toBe(0xec)
    expect(mod256(utf8Bytes('A'))).toBe(0xbf)
  })

  it('luhn：经典向量 7992739871 → 3', () => {
    expect(luhnCheckDigit('7992739871')).toBe(3)
    expect(luhnCheckDigit('7992 7398 71')).toBe(3)
  })

  it('luhn 拒绝非数字', () => {
    expect(() => luhnCheckDigit('')).toThrow(/为空/)
    expect(() => luhnCheckDigit('12a')).toThrow(/只接受数字/)
  })
})

describe('checksum / 参数', () => {
  it('算法白名单', () => {
    expect(ALGORITHMS).toEqual(['sum8', 'sum16', 'sum32', 'xor8', 'mod256', 'luhn'])
    expect(requireAlgorithm('luhn')).toBe('luhn')
    expect(() => requireAlgorithm('crc32')).toThrow(/不支持的算法/)
  })

  it('大写选项只影响十六进制，不影响 Luhn 的十进制位', () => {
    expect(compute('hello', upper).value).toBe('14'.toUpperCase())
    expect(compute('hello', { ...base, algorithm: 'sum16', uppercase: true }).value).toBe('43D1')
    expect(compute('7992739871', { ...upper, algorithm: 'luhn' }).value).toBe('3')
  })
})

describe('checksum / transform', () => {
  it('输出校验值 + 算法说明 + 字节数', () => {
    const output = transform({ text: 'hello' }, base)
    expect(output.split('\n')[0]).toBe('14')
    expect(output).toContain('5 字节（UTF-8）')
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '' }, base)).toBe('')
    expect(transform({ text: '' }, { ...base, algorithm: 'luhn' })).toBe('')
  })
})
