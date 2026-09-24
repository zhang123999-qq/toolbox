import { describe, expect, it } from 'vitest'
import { isAscii, toBytes, transform } from './utils'

/** 把 UTF-8 字节按 Latin-1 读出来的乱码，用于模拟真实场景 */
function mojibake(text: string): string {
  return Array.from(new TextEncoder().encode(text))
    .map((byte) => String.fromCharCode(byte))
    .join('')
}

function gbkMojibake(): string {
  // 「中华人民共和国中华人民共和国」的 GBK 字节
  const bytes = [0xd6, 0xd0, 0xbb, 0xaa, 0xc8, 0xcb, 0xc3, 0xf1, 0xb9, 0xb2, 0xba, 0xcd, 0xb9, 0xfa]
  return String.fromCharCode(...Array.from({ length: 3 }, () => bytes).flat())
}

describe('charset-detect / toBytes', () => {
  it('Latin-1 范围内的字符可还原成字节', () => {
    expect(toBytes('abc')).toEqual(Uint8Array.from([97, 98, 99]))
  })

  it('出现更大码位时返回 null', () => {
    expect(toBytes('中文')).toBeNull()
  })
})

describe('charset-detect / isAscii', () => {
  it('纯 7 位为 ASCII', () => {
    expect(isAscii(Uint8Array.from([65, 66]))).toBe(true)
    expect(isAscii(Uint8Array.from([65, 0xe4]))).toBe(false)
  })
})

describe('charset-detect / transform', () => {
  const base = { topN: '5', preview: true } as const

  it('UTF-8 乱码能测出 UTF-8 并解出原文', () => {
    const out = transform({ text: mojibake('中华人民共和国中华人民共和国') }, base)
    expect(out).toContain('检测结果：UTF-8')
    expect(out).toContain('中华人民共和国中华人民共和国')
  })

  it('GBK 乱码能测出 GB18030', () => {
    const out = transform({ text: gbkMojibake() }, base)
    expect(out).toContain('GB18030')
  })

  it('纯 ASCII 直接判 ASCII', () => {
    expect(transform({ text: 'hello world' }, base)).toContain('ASCII')
  })

  it('候选数量受 topN 限制', () => {
    const out = transform({ text: mojibake('中华人民共和国') }, { topN: '3', preview: false })
    const lines = out.split('\n').filter((line) => /^\s+\d+\. /.test(line))
    expect(lines).toHaveLength(3)
  })

  it('关闭预览时不再输出解码结果', () => {
    const out = transform({ text: mojibake('中华人民共和国') }, { topN: '5', preview: false })
    expect(out).not.toContain('解码：')
  })

  it('含大码位字符时提示无法还原', () => {
    expect(transform({ text: '中文' }, base)).toContain('无法还原原始字节')
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })
})
