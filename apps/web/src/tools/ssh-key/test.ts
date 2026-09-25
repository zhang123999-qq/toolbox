import { describe, expect, it } from 'vitest'
import type { SshKeyOptions } from './schema'
import {
  ALGORITHMS,
  RSA_BITS,
  base64FromBytes,
  bytesFromBase64Url,
  encodeMpint,
  encodeSshString,
  formatEd25519PublicKey,
  formatRsaPublicKey,
  generateKeyPair,
  toPem,
  transform,
} from './utils'

const base = { algorithm: 'ed25519', bits: '2048' } as const

/** 标准 Base64 → 字节（测试里用来回读公钥 blob） */
function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0))
}

describe('ssh-key / 线格式编码', () => {
  it('Base64 逐字节编码', () => {
    expect(base64FromBytes(Uint8Array.from([1, 2, 3]))).toBe('AQID')
  })

  it('base64url（JWK 的 n / e）能还原回字节', () => {
    const bytes = Uint8Array.from([0x01, 0x00, 0x01])
    expect(bytesFromBase64Url('AQAB')).toEqual(bytes)
    // 带 - _ 的 base64url 也要能解
    expect(bytesFromBase64Url('-_8')).toEqual(Uint8Array.from([0xfb, 0xff]))
  })

  it('SSH 字符串是 4 字节大端长度 + 内容', () => {
    expect(Array.from(encodeSshString(Uint8Array.from([0x41, 0x42])))).toEqual([
      0, 0, 0, 2, 0x41, 0x42,
    ])
  })

  it('mpint 去掉多余前导零，最高位为 1 时补 0x00', () => {
    // 0x00 0xC0 ... → 去掉 0x00 后最高位仍是 1，要补一个 0x00 保住符号位
    const n = Uint8Array.from([0x00, 0xc0, 0xff])
    expect(Array.from(encodeMpint(n))).toEqual([0, 0, 0, 3, 0x00, 0xc0, 0xff])
    // 0x7f 最高位为 0，不需要补
    expect(Array.from(encodeMpint(Uint8Array.from([0x00, 0x7f])))).toEqual([0, 0, 0, 1, 0x7f])
  })
})

describe('ssh-key / OpenSSH 公钥与 PEM', () => {
  it('ed25519 已知向量（raw = 0x00..0x1f）', () => {
    const raw = Uint8Array.from({ length: 32 }, (_, i) => i)
    expect(formatEd25519PublicKey(raw, 'toolbox')).toBe(
      'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIAABAgMEBQYHCAkKCwwNDg8QERITFBUWFxgZGhscHR4f toolbox',
    )
  })

  it('RSA 已知向量（e = 65537，n 带前导零）', () => {
    const e = Uint8Array.from([0x01, 0x00, 0x01])
    const n = Uint8Array.from([
      0x00, 0xc0, 0xff, 0xee, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99, 0xaa, 0xbb,
      0xcc, 0xdd,
    ])
    expect(formatRsaPublicKey(n, e, 'toolbox')).toBe(
      'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAAAEQDA/+4RIjNEVWZ3iJmqu8zd toolbox',
    )
  })

  it('RSA 短模数向量：mpint 长度按实际字节数写', () => {
    const e = Uint8Array.from([0x01, 0x00, 0x01])
    const n = Uint8Array.from([0x7f, 0x01])
    expect(formatRsaPublicKey(n, e, '')).toBe('ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAAAAn8B')
  })

  it('注释为空时不追加尾随空格', () => {
    const raw = Uint8Array.from({ length: 32 }, () => 0)
    expect(formatEd25519PublicKey(raw, '')).not.toMatch(/ $/)
  })

  it('toPem 按 64 字符折行并带上下边框', () => {
    expect(toPem(Uint8Array.from([1, 2, 3]), 'PRIVATE KEY')).toBe(
      '-----BEGIN PRIVATE KEY-----\nAQID\n-----END PRIVATE KEY-----',
    )
  })
})

describe('ssh-key / transform', () => {
  it('空输入返回空串，且不触碰 WebCrypto（边界）', async () => {
    await expect(transform({ text: '' }, base)).resolves.toBe('')
    await expect(transform({ text: '   ' }, base)).resolves.toBe('')
  })

  it('注释含空白字符时报错', async () => {
    await expect(transform({ text: 'bad comment' }, base)).rejects.toThrow(/空白字符/)
  })

  it('选项值非法时报错', async () => {
    const badAlgorithm = { algorithm: 'dsa', bits: '2048' } as unknown as SshKeyOptions
    const badBits = { algorithm: 'rsa', bits: '1024' } as unknown as SshKeyOptions
    await expect(transform({ text: 'x' }, badAlgorithm)).rejects.toThrow(/不支持的算法/)
    await expect(transform({ text: 'x' }, badBits)).rejects.toThrow(/不支持的 RSA 位数/)
  })

  it('常量表与文档一致', () => {
    expect([...ALGORITHMS]).toEqual(['ed25519', 'rsa'])
    expect([...RSA_BITS]).toEqual(['2048', '3072', '4096'])
  })

  it('真实生成 ed25519：公钥是 51 字节的 SSH blob，私钥是 PKCS#8 PEM', async () => {
    const output = await transform({ text: 'toolbox' }, base)
    const line = output.split('\n').find((row) => row.startsWith('ssh-ed25519 '))
    expect(line).toBeDefined()
    const [algorithm, blob64, comment] = (line as string).split(' ')
    expect(algorithm).toBe('ssh-ed25519')
    expect(comment).toBe('toolbox')
    const blob = fromBase64(blob64)
    expect(blob).toHaveLength(51) // 4 + 11（算法名）+ 4 + 32（公钥）
    expect(new TextDecoder().decode(blob.subarray(4, 15))).toBe('ssh-ed25519')
    expect(new DataView(blob.buffer, blob.byteOffset + 15, 4).getUint32(0, false)).toBe(32)
    expect(output).toContain('-----BEGIN PRIVATE KEY-----')
    expect(output).toContain('-----END PRIVATE KEY-----')
  })

  it('真实生成 RSA 2048：公钥前缀固定，私钥是 PKCS#8 PEM', async () => {
    const output = await transform({ text: 'toolbox' }, { algorithm: 'rsa', bits: '2048' })
    expect(output).toMatch(/\nssh-rsa AAAAB3NzaC1yc2EAAAADAQAB/)
    expect(output).toContain('ssh-rsa')
    expect(output).toContain('-----BEGIN PRIVATE KEY-----')
  }, 30000)

  it('两次调用的公钥不同（随机源来自 WebCrypto）', async () => {
    const first = await generateKeyPair('toolbox', base)
    const second = await generateKeyPair('toolbox', base)
    expect(first).not.toBe(second)
  }, 30000)
})
