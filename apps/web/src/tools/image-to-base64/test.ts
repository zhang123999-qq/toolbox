import { describe, expect, it } from 'vitest'
import {
  MAX_FILE_COUNT,
  MAX_FILE_SIZE,
  assertFileCountOk,
  assertFileSizeOk,
  buildCombinedFileName,
  buildCombinedText,
  buildTxtFileName,
  errorMessage,
  selectOutput,
  stripDataUrlPrefix,
  toRawBase64,
} from './utils'

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
    expect(errorMessage(42)).toBe('42')
  })
})

describe('assertFileSizeOk', () => {
  it('未超限不抛错（含边界）', () => {
    expect(() => assertFileSizeOk(0)).not.toThrow()
    expect(() => assertFileSizeOk(MAX_FILE_SIZE)).not.toThrow()
  })

  it('超限抛错', () => {
    expect(() => assertFileSizeOk(MAX_FILE_SIZE + 1)).toThrow(/文件过大/)
  })
})

describe('assertFileCountOk', () => {
  it('未超限不抛错（含边界 20）', () => {
    expect(() => assertFileCountOk(1)).not.toThrow()
    expect(() => assertFileCountOk(MAX_FILE_COUNT)).not.toThrow()
  })

  it('超限抛错', () => {
    expect(() => assertFileCountOk(MAX_FILE_COUNT + 1)).toThrow(/最多选择 20/)
  })
})

describe('stripDataUrlPrefix', () => {
  it('解析 mime 与 base64 负载', () => {
    expect(stripDataUrlPrefix('data:image/png;base64,QUJD')).toEqual({
      mime: 'image/png',
      base64: 'QUJD',
    })
    expect(stripDataUrlPrefix('data:image/svg+xml;base64,PHN2Zz4=')).toEqual({
      mime: 'image/svg+xml',
      base64: 'PHN2Zz4=',
    })
  })

  it('无 base64 标记也能解析', () => {
    expect(stripDataUrlPrefix('data:text/plain,hello')).toEqual({
      mime: 'text/plain',
      base64: 'hello',
    })
  })

  it('负载可含逗号与换行（s 修饰）', () => {
    expect(stripDataUrlPrefix('data:image/png;base64,QUJD\nREVG')).toEqual({
      mime: 'image/png',
      base64: 'QUJD\nREVG',
    })
  })

  it('非 DataURL 抛错', () => {
    expect(() => stripDataUrlPrefix('not-a-data-url')).toThrow(/DataURL 格式无效/)
    expect(() => stripDataUrlPrefix('')).toThrow(/DataURL 格式无效/)
  })
})

describe('toRawBase64', () => {
  it('去掉 data:image/...;base64, 前缀', () => {
    expect(toRawBase64('data:image/jpeg;base64,/9j/4AA=')).toBe('/9j/4AA=')
  })

  it('非法输入透出 stripDataUrlPrefix 的错误', () => {
    expect(() => toRawBase64('xxx')).toThrow(/DataURL 格式无效/)
  })
})

describe('selectOutput', () => {
  const dataUrl = 'data:image/png;base64,QUJD'

  it('dataUrl 原样返回', () => {
    expect(selectOutput(dataUrl, 'dataUrl')).toBe(dataUrl)
  })

  it('raw 去前缀', () => {
    expect(selectOutput(dataUrl, 'raw')).toBe('QUJD')
  })
})

describe('buildTxtFileName', () => {
  it('原名换扩展名为 .txt', () => {
    expect(buildTxtFileName('photo.png')).toBe('photo.txt')
    expect(buildTxtFileName('a.b.jpeg')).toBe('a.b.txt')
  })

  it('无扩展名直接加 .txt', () => {
    expect(buildTxtFileName('noext')).toBe('noext.txt')
  })

  it('空名兜底为 image', () => {
    expect(buildTxtFileName('')).toBe('image.txt')
    expect(buildTxtFileName('.png')).toBe('image.txt')
  })
})

describe('buildCombinedFileName', () => {
  it('按数量命名', () => {
    expect(buildCombinedFileName(1)).toBe('base64-1-images.txt')
    expect(buildCombinedFileName(20)).toBe('base64-20-images.txt')
  })
})

describe('buildCombinedText', () => {
  it('每项以 // 文件名 开头，项之间空一行', () => {
    const text = buildCombinedText([
      { fileName: 'a.png', text: 'QUJD' },
      { fileName: 'b.jpg', text: 'REVG' },
    ])
    expect(text).toBe('// a.png\nQUJD\n\n// b.jpg\nREVG')
  })

  it('空数组返回空串', () => {
    expect(buildCombinedText([])).toBe('')
  })
})
