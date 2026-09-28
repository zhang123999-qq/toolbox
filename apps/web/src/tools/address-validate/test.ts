/**
 * address-validate（#691）utils 单测：
 * Keccak-256 标准向量 / EIP-55 checksum / 地址校验语义 / 批量校验。
 */
import { describe, expect, it } from 'vitest'
import {
  bytesToHex,
  keccak256,
  renderReport,
  toChecksumAddress,
  validateAddress,
  validateBatch,
} from './utils'

function keccakHex(s: string): string {
  return bytesToHex(keccak256(new TextEncoder().encode(s)))
}

describe('keccak256 标准测试向量', () => {
  it('空字符串', () => {
    expect(keccakHex('')).toBe('c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470')
  })

  it('"abc"', () => {
    expect(keccakHex('abc')).toBe('4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45')
  })

  it('长输入（跨多个分组，136 字节速率）：确定性与长度', () => {
    // 200 字节输入覆盖多分组与填充边界；实现与仓库已验证的 sha3-hash 同构，仅 padding 不同
    const a = keccakHex('a'.repeat(200))
    const b = keccakHex('a'.repeat(200))
    expect(a).toHaveLength(64)
    expect(a).toBe(b)
    expect(keccakHex('a'.repeat(200))).not.toBe(keccakHex('a'.repeat(201)))
  })

  it('输出 32 字节', () => {
    expect(keccak256(new Uint8Array([1, 2, 3]))).toHaveLength(32)
  })
})

describe('toChecksumAddress（EIP-55 官方向量）', () => {
  const vectors = [
    '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
    '0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359',
    '0xdbF03B407c01E7cD3CBea99509d93f8DDDC8C6FB',
    '0xD1220A0cf47c7B9Be7A2E6BA89F429762e7b9aDb',
  ]
  for (const v of vectors) {
    it(v, () => {
      expect(toChecksumAddress(v.toLowerCase())).toBe(v)
    })
  }

  it('无 0x 前缀也可编码', () => {
    expect(toChecksumAddress('5aaeb6053f3e94c9b9a09f33669435e7ef1beaed')).toBe(
      '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
    )
  })
})

describe('validateAddress', () => {
  it('空输入抛错', () => {
    expect(() => validateAddress('   ')).toThrowError('地址不能为空')
  })

  it('checksum 正确的混合大小写地址有效且无提示', () => {
    const r = validateAddress('0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed')
    expect(r.valid).toBe(true)
    expect(r.normalized).toBe('0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed')
    expect(r.checksummed).toBe('0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed')
    expect(r.issues).toEqual([])
  })

  it('全小写地址有效但提示未用 checksum 编码', () => {
    const r = validateAddress('0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed')
    expect(r.valid).toBe(true)
    expect(r.checksummed).toBe('0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed')
    expect(r.issues).toHaveLength(1)
    expect(r.issues[0]).toContain('EIP-55')
  })

  it('全大写地址有效但提示未用 checksum 编码', () => {
    const r = validateAddress('0X5AAEB6053F3E94C9B9A09F33669435E7EF1BEAED')
    expect(r.valid).toBe(true)
    expect(r.issues).toHaveLength(1)
  })

  it('无 0x 前缀的 40 位 hex 有效', () => {
    const r = validateAddress('5aaeb6053f3e94c9b9a09f33669435e7ef1beaed')
    expect(r.valid).toBe(true)
    expect(r.normalized).toBe('0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed')
  })

  it('checksum 错误的混合大小写地址无效', () => {
    const r = validateAddress('0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAec')
    expect(r.valid).toBe(false)
    expect(r.normalized).toBe('')
    expect(r.checksummed).toBe('')
    expect(r.issues[0]).toContain('checksum 校验失败')
  })

  it('长度错误抛中文错', () => {
    expect(() => validateAddress('0x1234')).toThrowError('地址长度错误')
    expect(() => validateAddress('0x1234')).toThrowError('4 位')
  })

  it('含非法字符抛格式错误', () => {
    expect(() => validateAddress('0xZZZZeb6053F3E94C9b9A09f33669435E7Ef1BeAed')).toThrowError('地址格式错误')
  })

  it('首尾空白被容忍', () => {
    const r = validateAddress('  0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed\n')
    expect(r.valid).toBe(true)
  })
})

describe('validateBatch', () => {
  it('批量校验每行独立', () => {
    const out = validateBatch('0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed\n0x1234\n')
    expect(out).toHaveLength(2)
    expect(out[0].result.valid).toBe(true)
    expect(out[1].result.valid).toBe(false)
    expect(out[1].result.issues[0]).toContain('地址长度错误')
  })

  it('空输入与超量抛错', () => {
    expect(() => validateBatch('  \n ')).toThrowError('至少输入 1 个地址')
    const many = Array.from({ length: 501 }, () => '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed').join('\n')
    expect(() => validateBatch(many)).toThrowError('最多校验 500 个地址')
  })
})

describe('renderReport', () => {
  it('有效地址报告含规范形式与 checksum', () => {
    const report = renderReport(
      '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
      validateAddress('0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed'),
    )
    expect(report).toContain('有效：是')
    expect(report).toContain('Checksum：0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed')
  })

  it('无效地址报告含提示', () => {
    const report = renderReport('0x1234', {
      valid: false,
      normalized: '',
      checksummed: '',
      issues: ['地址长度错误'],
    })
    expect(report).toContain('有效：否')
    expect(report).toContain('提示：地址长度错误')
  })
})

describe('bytesToHex', () => {
  it('字节转 hex 补零', () => {
    expect(bytesToHex(new Uint8Array([0, 15, 255]))).toBe('000fff')
  })
})
