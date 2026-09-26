import { describe, expect, it } from 'vitest'
import type { FileHashOptions } from './schema'
import {
  ALGORITHMS,
  FORMATS,
  MAX_FILE_BYTES,
  encode,
  formatReport,
  hashBytes,
  hashFile,
  hashText,
  md5Digest,
  pickAlgorithms,
  toBase64,
  toHex,
  transform,
} from './utils'

const all: FileHashOptions = { algorithm: 'all', format: 'hex' }
const only256: FileHashOptions = { algorithm: 'sha256', format: 'hex' }
const b64: FileHashOptions = { algorithm: 'md5', format: 'base64' }

/** RFC 1321 / FIPS 180-4 的公开测试向量（输入 "abc"） */
const VECTOR_ABC: Record<string, string> = {
  md5: '900150983cd24fb0d6963f7d28e17f72',
  sha1: 'a9993e364706816aba3e25717850c26c9cd0d89d',
  sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  sha512:
    'ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f',
}

describe('file-hash / 编码工具', () => {
  it('字节转十六进制与 base64', () => {
    const bytes = new Uint8Array([0x00, 0xff, 0x10])
    expect(toHex(bytes)).toBe('00ff10')
    expect(toBase64(bytes)).toBe(btoa('\x00\xff\x10'))
  })

  it('取值白名单与 schema 一致', () => {
    expect(ALGORITHMS).toEqual(['md5', 'sha1', 'sha256', 'sha384', 'sha512'])
    expect(FORMATS).toEqual(['hex', 'base64'])
  })

  it('all 表示全部算法，单项只算一个', () => {
    expect(pickAlgorithms(all)).toEqual(ALGORITHMS)
    expect(pickAlgorithms(only256)).toEqual(['sha256'])
  })

  it('MD5 走 spark-md5，与公开向量一致', () => {
    const bytes = new TextEncoder().encode('abc')
    expect(toHex(md5Digest(bytes))).toBe(VECTOR_ABC.md5)
  })
})

describe('file-hash / 摘要计算', () => {
  it('文本摘要对齐公开向量（UTF-8 编码）', async () => {
    const rows = await hashBytes(new TextEncoder().encode('abc'), all)
    const map = new Map(rows.map((r) => [r.algorithm, r.value]))
    expect(map.get('md5')).toBe(VECTOR_ABC.md5)
    expect(map.get('sha1')).toBe(VECTOR_ABC.sha1)
    expect(map.get('sha256')).toBe(VECTOR_ABC.sha256)
  })

  it('中文按 UTF-8 计算，与 sha256sum 一致', async () => {
    const rows = await hashBytes(new TextEncoder().encode('中文'), only256)
    // echo -n 中文 | sha256sum
    expect(rows[0]?.value).toBe('72726d8818f693066ceb69afa364218b692e62ea92b385782363780f47529c21')
  })

  it('base64 输出是摘要字节的 base64', async () => {
    const rows = await hashBytes(new TextEncoder().encode('abc'), b64)
    expect(rows[0]?.value).toBe('kAFQmDzST7DWlj99KOF/cg==')
  })

  it('encode 按 format 选择编码', () => {
    const bytes = new Uint8Array([1, 2, 3])
    expect(encode(bytes, { algorithm: 'md5', format: 'hex' })).toBe('010203')
    expect(encode(bytes, b64)).toBe(toBase64(bytes))
  })
})

describe('file-hash / 报告拼装', () => {
  it('报告首行是来源与体积，其后每行一个算法', async () => {
    const report = await hashText('hello world', all)
    const lines = report.split('\n')
    expect(lines[0]).toBe('输入：11 字符 / 11 字节')
    expect(lines[1]).toBe('')
    expect(lines[2]).toMatch(/^MD5\s+[0-9a-f]{32}$/)
    expect(lines[6]).toMatch(/^SHA-512\s+[0-9a-f]{128}$/)
  })

  it('formatReport 对齐标签', () => {
    expect(formatReport('H', [{ algorithm: 'md5', value: 'x' }])).toBe('H\n\nMD5     x')
  })
})

describe('file-hash / 文件入口', () => {
  it('文件按字节计算，报告带文件名与体积', async () => {
    const file = new File([new TextEncoder().encode('abc')], 'demo.bin', {
      type: 'application/octet-stream',
    })
    const report = await hashFile(file, only256)
    expect(report.split('\n')[0]).toBe('文件：demo.bin')
    expect(report.split('\n')[1]).toBe('大小：3 字节')
    expect(report).toContain(VECTOR_ABC.sha256)
  })

  it('超过 200 MiB 直接报错而不是硬算', async () => {
    const big = { name: 'big.bin', size: MAX_FILE_BYTES + 1 } as File
    await expect(hashFile(big, all)).rejects.toThrow(/超过/)
  })
})

describe('file-hash / transform', () => {
  it('空输入返回空串（不做任何摘要计算）', async () => {
    await expect(transform({ text: '' }, all)).resolves.toBe('')
  })

  it('超长输入报错', async () => {
    await expect(transform({ text: 'x'.repeat(200001) }, all)).rejects.toThrow(/200,000 字符上限/)
  })

  it('正常输入输出完整报告', async () => {
    const report = await transform({ text: 'abc' }, all)
    expect(report).toContain(VECTOR_ABC.md5)
    expect(report).toContain(VECTOR_ABC.sha512 ?? '')
  })
})
