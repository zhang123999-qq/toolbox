import { describe, expect, it } from 'vitest'
import { blockOf, charsetsOf, describeChar, transform } from './utils'

describe('charset-lookup / blockOf', () => {
  it('汉字落在 CJK 统一汉字区', () => {
    expect(blockOf(0x4e2d)).toBe('CJK Unified Ideographs（中日韩统一汉字）')
  })

  it('ASCII 落在基本拉丁区', () => {
    expect(blockOf(0x41)).toBe('Basic Latin（基本拉丁）')
  })

  it('未收录区块报码点', () => {
    expect(blockOf(0xe0001)).toContain('未收录')
  })
})

describe('charset-lookup / charsetsOf', () => {
  it('ASCII 字符同时属于 ASCII 与 Latin-1', () => {
    expect(charsetsOf(0x41)).toContain('ASCII')
    expect(charsetsOf(0x41)).toContain('ISO-8859-1（Latin-1）')
  })

  it('汉字属于 GB 系列与 Big5', () => {
    expect(charsetsOf(0x4e2d)).toContain('GB2312 / GBK / GB18030')
    expect(charsetsOf(0x4e2d)).toContain('Big5')
  })

  it('汉字不会被误判成日文或韩文编码', () => {
    expect(charsetsOf(0x4e2d)).not.toContain('Shift_JIS')
    expect(charsetsOf(0x4e2d)).not.toContain('EUC-KR')
  })

  it('假名属于 Shift_JIS', () => {
    expect(charsetsOf(0x3042)).toContain('Shift_JIS')
    expect(charsetsOf(0x3042)).not.toContain('EUC-KR')
  })

  it('谚文属于 EUC-KR', () => {
    expect(charsetsOf(0xac00)).toContain('EUC-KR')
    expect(charsetsOf(0xac00)).not.toContain('Shift_JIS')
  })

  it('西里尔与希腊各自命中', () => {
    expect(charsetsOf(0x0410)).toContain('Windows-1251 / KOI8-R')
    expect(charsetsOf(0x03b1)).toContain('ISO-8859-7')
  })
})

describe('charset-lookup / describeChar', () => {
  it('给出码点与 UTF-8 字节', () => {
    const out = describeChar('中')
    expect(out).toContain('U+4E2D')
    expect(out).toContain('UTF-8 字节：3')
  })

  it('BMP 外字符标出代理对', () => {
    expect(describeChar('\u{1f600}')).toContain('需要代理对')
  })
})

describe('charset-lookup / transform', () => {
  it('逐字符输出，空一行分隔', () => {
    const out = transform({ text: '中A' })
    expect(out).toContain('U+4E2D')
    expect(out).toContain('U+0041')
    expect(out).toContain('\n\n')
  })

  it('跳过空格与换行', () => {
    expect(transform({ text: ' \n ' })).toBe('')
  })
})
