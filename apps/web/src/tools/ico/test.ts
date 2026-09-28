import { describe, expect, it } from 'vitest'
import {
  ERR_NO_SIZE_SELECTED,
  MAX_FILE_SIZE,
  assertFileSizeOk,
  buildIco,
  buildOutputFileName,
  errorMessage,
  parseSelectedSizes,
} from './utils'

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
  })
})

describe('parseSelectedSizes', () => {
  it('去重并升序', () => {
    expect(parseSelectedSizes(['48', '16', '32', '16'])).toEqual([16, 32, 48])
    expect(parseSelectedSizes(['256', '16'])).toEqual([16, 256])
  })

  it('全选七档', () => {
    expect(parseSelectedSizes(['16', '24', '32', '48', '64', '128', '256'])).toEqual([
      16, 24, 32, 48, 64, 128, 256,
    ])
  })

  it('非法值抛错', () => {
    expect(() => parseSelectedSizes(['100'])).toThrow(/尺寸无效/) // 非允许值
    expect(() => parseSelectedSizes(['abc'])).toThrow(/尺寸无效/) // 非整数
    expect(() => parseSelectedSizes(['16.5'])).toThrow(/尺寸无效/) // 小数
    expect(() => parseSelectedSizes([''])).toThrow(/尺寸无效/) // 空串
  })

  it('空选抛错', () => {
    expect(() => parseSelectedSizes([])).toThrow(ERR_NO_SIZE_SELECTED)
  })
})

describe('buildIco', () => {
  // 假 PNG 数据（内容不重要，断言拼接位置用）
  const pngA = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
  const pngB = new Uint8Array([1, 2, 3, 4, 5])

  it('组装标准 ICO 二进制：头 6 字节 + entry 16 字节 + payload', () => {
    const out = buildIco([
      { size: 16, data: pngA },
      { size: 256, data: pngB },
    ])
    const view = new DataView(out.buffer)
    const headerSize = 6 + 16 * 2

    // ICONDIR：reserved=0，type=1（LE u16），count=2（LE u16）
    expect(view.getUint16(0, true)).toBe(0)
    expect(view.getUint16(2, true)).toBe(1)
    expect(view.getUint16(4, true)).toBe(2)

    // entry 0（16px）：逐字段断言
    expect(view.getUint8(6)).toBe(16) // width
    expect(view.getUint8(7)).toBe(16) // height
    expect(view.getUint8(8)).toBe(0) // colorCount
    expect(view.getUint8(9)).toBe(0) // reserved
    expect(view.getUint16(10, true)).toBe(1) // planes
    expect(view.getUint16(12, true)).toBe(32) // bitCount
    expect(view.getUint32(14, true)).toBe(pngA.length) // bytesInRes
    expect(view.getUint32(18, true)).toBe(headerSize) // imageOffset

    // entry 1（256px → 0 字节表示），offset 累计
    const b1 = 6 + 16
    expect(view.getUint8(b1)).toBe(0)
    expect(view.getUint8(b1 + 1)).toBe(0)
    expect(view.getUint8(b1 + 2)).toBe(0)
    expect(view.getUint8(b1 + 3)).toBe(0)
    expect(view.getUint16(b1 + 4, true)).toBe(1)
    expect(view.getUint16(b1 + 6, true)).toBe(32)
    expect(view.getUint32(b1 + 8, true)).toBe(pngB.length)
    expect(view.getUint32(b1 + 12, true)).toBe(headerSize + pngA.length)

    // PNG payload 按序拼接在头部之后
    expect(out.slice(headerSize, headerSize + pngA.length)).toEqual(pngA)
    expect(out.slice(headerSize + pngA.length)).toEqual(pngB)
    expect(out.length).toBe(headerSize + pngA.length + pngB.length)
  })

  it('单条目 offset = 6 + 16', () => {
    const out = buildIco([{ size: 32, data: pngA }])
    const view = new DataView(out.buffer)
    expect(view.getUint16(4, true)).toBe(1)
    expect(view.getUint8(6)).toBe(32)
    expect(view.getUint32(18, true)).toBe(22)
    expect(out.length).toBe(22 + pngA.length)
  })

  it('空条目抛错', () => {
    expect(() => buildIco([])).toThrow(/至少需要包含一个尺寸/)
  })

  it('条目过多抛错', () => {
    const many = Array.from({ length: 256 }, () => ({ size: 16, data: pngA }))
    expect(() => buildIco(many)).toThrow(/过多/)
  })

  it('非法尺寸抛错', () => {
    expect(() => buildIco([{ size: 0, data: pngA }])).toThrow(/尺寸无效/)
    expect(() => buildIco([{ size: 1.5, data: pngA }])).toThrow(/尺寸无效/)
    expect(() => buildIco([{ size: 300, data: pngA }])).toThrow(/尺寸无效/)
  })

  it('空 PNG 数据抛错', () => {
    expect(() => buildIco([{ size: 16, data: new Uint8Array(0) }])).toThrow(/数据为空/)
  })
})

describe('buildOutputFileName', () => {
  it('原名去扩展名 + .ico', () => {
    expect(buildOutputFileName('photo.png')).toBe('photo.ico')
    expect(buildOutputFileName('a.b.jpeg')).toBe('a.b.ico')
    expect(buildOutputFileName('noext')).toBe('noext.ico')
  })

  it('空名兜底为 image', () => {
    expect(buildOutputFileName('')).toBe('image.ico')
    expect(buildOutputFileName('.png')).toBe('image.ico')
  })
})

describe('assertFileSizeOk', () => {
  it('未超限不抛错', () => {
    expect(() => assertFileSizeOk(MAX_FILE_SIZE)).not.toThrow()
  })

  it('超限抛错', () => {
    expect(() => assertFileSizeOk(MAX_FILE_SIZE + 1)).toThrow(/文件过大/)
  })
})
