import { describe, expect, it } from 'vitest'
import { digest, fromHex, md5, toBase64, toHex, transform } from './utils'

const base = { uppercase: false, format: 'hex' } as const

describe('md5-hash / 标准已知向量', () => {
  it('MD5("abc") 与标准向量一致', () => {
    expect(toHex(md5('abc'))).toBe('900150983cd24fb0d6963f7d28e17f72')
  })

  it('空串摘要为标准的 d41d8cd9…', () => {
    expect(toHex(md5(''))).toBe('d41d8cd98f00b204e9800998ecf8427e')
  })

  it('quick brown fox 向量一致（跨实现可比对）', () => {
    expect(toHex(md5('The quick brown fox jumps over the lazy dog'))).toBe(
      '9e107d9d372bb6826bd81d3542a419d6',
    )
  })

  it('中文按 UTF-8 编码后计算（与 md5sum 口径一致）', () => {
    expect(toHex(md5('工具库 Toolbox'))).toBe('fdc47e0dd08e0e3981d782c676512fe9')
  })
})

describe('md5-hash / 输出编码', () => {
  it('默认输出 32 位小写十六进制', () => {
    expect(digest('abc', base)).toBe('900150983cd24fb0d6963f7d28e17f72')
  })

  it('uppercase 打开后输出全大写', () => {
    const out = digest('abc', { uppercase: true, format: 'hex' })
    expect(out).toBe('900150983CD24FB0D6963F7D28E17F72')
    expect(out).toBe(out.toUpperCase())
  })

  it('base64 输出为摘要的 base64（kAFQmDzST7DWlj99KOF/cg==）', () => {
    expect(digest('abc', { uppercase: false, format: 'base64' })).toBe('kAFQmDzST7DWlj99KOF/cg==')
  })

  it('hex 与 base64 表示同一个 16 字节摘要', () => {
    expect(toBase64(fromHex(digest('abc', base)))).toBe(
      digest('abc', { uppercase: false, format: 'base64' }),
    )
  })
})

describe('md5-hash / transform', () => {
  it('示例输入 abc 得到预期摘要', () => {
    expect(transform({ text: 'abc' }, base)).toBe('900150983cd24fb0d6963f7d28e17f72')
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '' }, base)).toBe('')
    expect(transform({ text: '' }, { uppercase: true, format: 'base64' })).toBe('')
  })

  it('不同输入产出不同摘要', () => {
    expect(transform({ text: 'a' }, base)).not.toBe(transform({ text: 'b' }, base))
  })

  it('超过 200,000 字符上限时报错', () => {
    expect(() => transform({ text: 'a'.repeat(200001) }, base)).toThrow(/200,000/)
  })

  it('10 万字符长文本仍能计算（分块不炸栈）', () => {
    expect(transform({ text: 'A'.repeat(100000) }, base)).toHaveLength(32)
  })
})
