import { describe, expect, it } from 'vitest'
import {
  CHAR_RAMPS,
  DEFAULT_CHAR_WIDTH,
  MAX_FILE_SIZE,
  assertFileSizeOk,
  buildHtmlOutput,
  buildOutputFileName,
  buildRamp,
  buildTextOutput,
  computeSampleDimensions,
  errorMessage,
  escapeHtml,
  grayToChar,
  imageDataToAscii,
  luminance,
  parseCharWidth,
} from './utils'
import type { AsciiArt } from './utils'

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
  })
})

describe('parseCharWidth', () => {
  it('空串用默认 80', () => {
    expect(parseCharWidth('')).toBe(DEFAULT_CHAR_WIDTH)
    expect(parseCharWidth('   ')).toBe(DEFAULT_CHAR_WIDTH)
  })

  it('正常解析', () => {
    expect(parseCharWidth('10')).toBe(10)
    expect(parseCharWidth('200')).toBe(200)
    expect(parseCharWidth(' 120 ')).toBe(120)
  })

  it('非法抛错', () => {
    expect(() => parseCharWidth('abc')).toThrow(/宽度无效/)
    expect(() => parseCharWidth('12.5')).toThrow(/宽度无效/)
    expect(() => parseCharWidth('-5')).toThrow(/宽度无效/)
    expect(() => parseCharWidth('9')).toThrow(/超出范围/)
    expect(() => parseCharWidth('0')).toThrow(/超出范围/)
    expect(() => parseCharWidth('201')).toThrow(/超出范围/)
  })
})

describe('buildRamp', () => {
  it('标准字符集暗→亮', () => {
    expect(buildRamp('standard', false)).toBe(CHAR_RAMPS.standard)
    expect(buildRamp('standard', false)[0]).toBe('@')
  })

  it('反色反转渐变', () => {
    expect(buildRamp('standard', true)).toBe(' .:-=+*#%@')
    expect(buildRamp('blocks', true)).toBe(' ░▒▓█')
  })

  it('简单字符集', () => {
    expect(buildRamp('simple', false)).toBe('#*. ')
  })
})

describe('luminance', () => {
  it('黑白两极', () => {
    expect(luminance(0, 0, 0)).toBe(0)
    expect(luminance(255, 255, 255)).toBeCloseTo(255)
  })

  it('按 0.299/0.587/0.114 加权', () => {
    expect(luminance(255, 0, 0)).toBeCloseTo(76.245)
    expect(luminance(0, 255, 0)).toBeCloseTo(149.685)
    expect(luminance(0, 0, 255)).toBeCloseTo(29.07)
  })
})

describe('grayToChar', () => {
  const ramp = '@%#*+=-:. '

  it('两端映射到渐变首尾', () => {
    expect(grayToChar(0, ramp)).toBe('@')
    expect(grayToChar(255, ramp)).toBe(' ')
  })

  it('中间灰度', () => {
    // floor(128/255*10) = 5 → '='
    expect(grayToChar(128, ramp)).toBe('=')
  })

  it('越界灰度钳制到 0–255', () => {
    expect(grayToChar(-5, ramp)).toBe('@')
    expect(grayToChar(999, ramp)).toBe(' ')
  })

  it('空字符集抛错', () => {
    expect(() => grayToChar(128, '')).toThrow(/字符集为空/)
  })
})

describe('computeSampleDimensions', () => {
  it('按字符高宽比 2:1 补偿行数', () => {
    // 800x600，80 列 → 行 = 600/800*80/2 = 30
    expect(computeSampleDimensions(800, 600, 80)).toEqual({ width: 80, height: 30 })
    // 竖图 600x800，80 列 → 行 = 800/600*80/2 ≈ 53
    expect(computeSampleDimensions(600, 800, 80)).toEqual({ width: 80, height: 53 })
  })

  it('行数至少 1', () => {
    expect(computeSampleDimensions(8000, 1, 10)).toEqual({ width: 10, height: 1 })
  })

  it('非法尺寸抛错', () => {
    expect(() => computeSampleDimensions(NaN, 100, 80)).toThrow(/图片尺寸无效/)
    expect(() => computeSampleDimensions(100, NaN, 80)).toThrow(/图片尺寸无效/)
    expect(() => computeSampleDimensions(0, 100, 80)).toThrow(/图片尺寸无效/)
    expect(() => computeSampleDimensions(100, -5, 80)).toThrow(/图片尺寸无效/)
    expect(() => computeSampleDimensions(Infinity, 100, 80)).toThrow(/图片尺寸无效/)
  })
})

describe('imageDataToAscii', () => {
  it('2x1 像素映射为字符并保留颜色', () => {
    // 白像素 → ' '，黑像素 → '@'
    const pixels = new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255])
    const art = imageDataToAscii(pixels, 2, 1, '@ ')
    expect(art.cols).toBe(2)
    expect(art.rows).toBe(1)
    expect(art.cells[0]).toEqual({ char: ' ', r: 255, g: 255, b: 255 })
    expect(art.cells[1]).toEqual({ char: '@', r: 0, g: 0, b: 0 })
  })

  it('行优先遍历', () => {
    const pixels = new Uint8ClampedArray([
      255, 255, 255, 255, 0, 0, 0, 255, 0, 0, 0, 255, 255, 255, 255, 255,
    ])
    const art = imageDataToAscii(pixels, 2, 2, '@ ')
    expect(art.cells.map((c) => c.char).join('')).toBe(' @@ ')
  })

  it('非法输入抛错', () => {
    const ok = new Uint8ClampedArray(8)
    expect(() => imageDataToAscii(ok, 0, 1, '@ ')).toThrow(/采样尺寸无效/)
    expect(() => imageDataToAscii(ok, 2, 0, '@ ')).toThrow(/采样尺寸无效/)
    expect(() => imageDataToAscii(new Uint8ClampedArray(4), 2, 1, '@ ')).toThrow(/像素数据长度不足/)
  })
})

describe('buildTextOutput', () => {
  it('行间换行拼接', () => {
    const art: AsciiArt = {
      cols: 2,
      rows: 2,
      cells: [
        { char: 'a', r: 0, g: 0, b: 0 },
        { char: 'b', r: 0, g: 0, b: 0 },
        { char: 'c', r: 0, g: 0, b: 0 },
        { char: 'd', r: 0, g: 0, b: 0 },
      ],
    }
    expect(buildTextOutput(art)).toBe('ab\ncd')
  })
})

describe('escapeHtml', () => {
  it('转义 <>&（& 最先）', () => {
    expect(escapeHtml('a<b>&"c"')).toBe('a&lt;b&gt;&amp;"c"')
    expect(escapeHtml('&lt;')).toBe('&amp;lt;')
    expect(escapeHtml('纯文本')).toBe('纯文本')
  })
})

describe('buildHtmlOutput', () => {
  it('生成带颜色 span 的完整 HTML 文档', () => {
    const art: AsciiArt = {
      cols: 1,
      rows: 1,
      cells: [{ char: '<', r: 1, g: 2, b: 3 }],
    }
    const html = buildHtmlOutput(art, 'a&b')
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true)
    expect(html).toContain('<title>a&amp;b</title>')
    expect(html).toContain('<span style="color:rgb(1,2,3)">&lt;</span>')
    expect(html).toContain('<meta charset="utf-8">')
    expect(html.endsWith('</html>\n')).toBe(true)
  })

  it('多行用换行分隔', () => {
    const art: AsciiArt = {
      cols: 1,
      rows: 2,
      cells: [
        { char: '@', r: 0, g: 0, b: 0 },
        { char: ' ', r: 255, g: 255, b: 255 },
      ],
    }
    const html = buildHtmlOutput(art, 't')
    expect(html).toContain('</span>\n<span')
  })
})

describe('buildOutputFileName', () => {
  it('替换扩展名并加 -ascii 后缀', () => {
    expect(buildOutputFileName('photo.png', 'txt')).toBe('photo-ascii.txt')
    expect(buildOutputFileName('a.JPEG', 'html')).toBe('a-ascii.html')
    expect(buildOutputFileName('noext', 'html')).toBe('noext-ascii.html')
  })

  it('空名兜底为 image', () => {
    expect(buildOutputFileName('', 'txt')).toBe('image-ascii.txt')
    expect(buildOutputFileName('.png', 'txt')).toBe('image-ascii.txt')
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
