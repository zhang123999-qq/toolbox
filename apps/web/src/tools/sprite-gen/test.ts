import { describe, expect, it } from 'vitest'
import {
  DEFAULT_COLUMNS,
  DEFAULT_QUALITY,
  MAX_COLUMNS,
  MAX_FILE_SIZE,
  MAX_GAP,
  assertFileSizeOk,
  assertSupportedImage,
  buildOutputFileName,
  buildSpriteCSS,
  buildSpriteJSON,
  computeSpriteLayout,
  cssClassName,
  errorMessage,
  formatToMime,
  parseColumns,
  parseGap,
  parseQuality,
} from './utils'

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
  })
})

describe('parseColumns', () => {
  it('空串用默认 4', () => {
    expect(parseColumns('')).toBe(DEFAULT_COLUMNS)
    expect(parseColumns('   ')).toBe(DEFAULT_COLUMNS)
  })

  it('正常解析 1–10', () => {
    expect(parseColumns('1')).toBe(1)
    expect(parseColumns('10')).toBe(10)
    expect(parseColumns(' 6 ')).toBe(6)
  })

  it('非法抛错', () => {
    expect(() => parseColumns('abc')).toThrow(/列数无效/)
    expect(() => parseColumns('4.5')).toThrow(/列数无效/)
    expect(() => parseColumns('0')).toThrow(/超出范围/)
    expect(() => parseColumns(String(MAX_COLUMNS + 1))).toThrow(/超出范围/)
  })
})

describe('parseGap', () => {
  it('空串用默认 0', () => {
    expect(parseGap('')).toBe(0)
  })

  it('正常解析 0–100', () => {
    expect(parseGap('0')).toBe(0)
    expect(parseGap('100')).toBe(100)
    expect(parseGap(' 20 ')).toBe(20)
  })

  it('非法抛错', () => {
    expect(() => parseGap('abc')).toThrow(/间距无效/)
    expect(() => parseGap('-1')).toThrow(/间距无效/)
    expect(() => parseGap(String(MAX_GAP + 1))).toThrow(/超出范围/)
  })
})

describe('parseQuality', () => {
  it('空串用默认 90', () => {
    expect(parseQuality('')).toBe(DEFAULT_QUALITY)
    expect(parseQuality('   ')).toBe(DEFAULT_QUALITY)
  })

  it('正常解析', () => {
    expect(parseQuality('1')).toBe(1)
    expect(parseQuality('100')).toBe(100)
    expect(parseQuality(' 90 ')).toBe(90)
  })

  it('非法抛错', () => {
    expect(() => parseQuality('abc')).toThrow(/质量无效/)
    expect(() => parseQuality('85.5')).toThrow(/质量无效/)
    expect(() => parseQuality('0')).toThrow(/超出范围/)
    expect(() => parseQuality('101')).toThrow(/超出范围/)
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

describe('assertSupportedImage', () => {
  it('支持的类型不抛错', () => {
    expect(() => assertSupportedImage('a.png', true)).not.toThrow()
  })

  it('不支持的类型抛错并带文件名', () => {
    expect(() => assertSupportedImage('a.txt', false)).toThrow(/不支持的图片格式：a\.txt/)
  })
})

describe('formatToMime', () => {
  it('png / jpeg 转 MIME', () => {
    expect(formatToMime('png')).toBe('image/png')
    expect(formatToMime('jpeg')).toBe('image/jpeg')
  })
})

describe('computeSpriteLayout', () => {
  it('横向：总宽=宽之和+间距，总高=最高，y=0', () => {
    const layout = computeSpriteLayout(
      [
        { w: 60, h: 80 },
        { w: 100, h: 50 },
      ],
      { direction: 'horizontal', columns: 4, gap: 0 },
    )
    expect(layout.width).toBe(160)
    expect(layout.height).toBe(80)
    expect(layout.placements).toEqual([
      { x: 0, y: 0, w: 60, h: 80 },
      { x: 60, y: 0, w: 100, h: 50 },
    ])
  })

  it('横向间距累加到总宽', () => {
    const layout = computeSpriteLayout(
      [
        { w: 60, h: 80 },
        { w: 100, h: 50 },
      ],
      { direction: 'horizontal', columns: 4, gap: 10 },
    )
    expect(layout.width).toBe(170)
    expect(layout.height).toBe(80)
    expect(layout.placements[1]).toEqual({ x: 70, y: 0, w: 100, h: 50 })
  })

  it('纵向：总高=高之和+间距，总宽=最宽，x=0', () => {
    const layout = computeSpriteLayout(
      [
        { w: 100, h: 50 },
        { w: 60, h: 80 },
      ],
      { direction: 'vertical', columns: 4, gap: 5 },
    )
    expect(layout.width).toBe(100)
    expect(layout.height).toBe(135)
    expect(layout.placements).toEqual([
      { x: 0, y: 0, w: 100, h: 50 },
      { x: 0, y: 55, w: 60, h: 80 },
    ])
  })

  it('网格：列宽=该列最大 w，行高=该行最大 h', () => {
    const layout = computeSpriteLayout(
      [
        { w: 100, h: 50 },
        { w: 60, h: 80 },
        { w: 40, h: 40 },
        { w: 70, h: 30 },
      ],
      { direction: 'grid', columns: 2, gap: 4 },
    )
    // 列宽 [100, 70]，行高 [80, 40]
    expect(layout.width).toBe(174)
    expect(layout.height).toBe(124)
    expect(layout.placements).toEqual([
      { x: 0, y: 0, w: 100, h: 50 },
      { x: 104, y: 0, w: 60, h: 80 },
      { x: 0, y: 84, w: 40, h: 40 },
      { x: 104, y: 84, w: 70, h: 30 },
    ])
  })

  it('网格余数行：最后一行不满也正确排布', () => {
    const layout = computeSpriteLayout(
      [
        { w: 100, h: 50 },
        { w: 60, h: 80 },
        { w: 40, h: 40 },
        { w: 70, h: 30 },
        { w: 90, h: 60 },
      ],
      { direction: 'grid', columns: 2, gap: 4 },
    )
    // 列宽 [100, 70]，行高 [80, 40, 60]
    expect(layout.width).toBe(174)
    expect(layout.height).toBe(188)
    expect(layout.placements).toHaveLength(5)
    expect(layout.placements[4]).toEqual({ x: 0, y: 128, w: 90, h: 60 })
  })

  it('网格列数超过图片数时不计空列间距', () => {
    const layout = computeSpriteLayout(
      [
        { w: 100, h: 50 },
        { w: 60, h: 80 },
      ],
      { direction: 'grid', columns: 4, gap: 10 },
    )
    expect(layout.width).toBe(170)
    expect(layout.height).toBe(80)
    expect(layout.placements).toEqual([
      { x: 0, y: 0, w: 100, h: 50 },
      { x: 110, y: 0, w: 60, h: 80 },
    ])
  })

  it('单张图片也可拼合', () => {
    const layout = computeSpriteLayout([{ w: 30, h: 20 }], {
      direction: 'horizontal',
      columns: 4,
      gap: 8,
    })
    expect(layout).toEqual({
      width: 30,
      height: 20,
      placements: [{ x: 0, y: 0, w: 30, h: 20 }],
    })
  })

  it('空数组抛错', () => {
    expect(() => computeSpriteLayout([], { direction: 'horizontal', columns: 4, gap: 0 })).toThrow(
      /至少需要 1 张/,
    )
  })

  it('非法尺寸抛错', () => {
    const opts = { direction: 'horizontal' as const, columns: 4, gap: 0 }
    expect(() => computeSpriteLayout([{ w: 0, h: 10 }], opts)).toThrow(/图片尺寸无效/)
    expect(() => computeSpriteLayout([{ w: 10, h: 0 }], opts)).toThrow(/图片尺寸无效/)
    expect(() => computeSpriteLayout([{ w: -5, h: 10 }], opts)).toThrow(/图片尺寸无效/)
    expect(() => computeSpriteLayout([{ w: NaN, h: 10 }], opts)).toThrow(/图片尺寸无效/)
    expect(() => computeSpriteLayout([{ w: 10, h: Infinity }], opts)).toThrow(/图片尺寸无效/)
  })
})

describe('cssClassName', () => {
  it('去扩展名并小写', () => {
    expect(cssClassName('Logo.png')).toBe('logo')
    expect(cssClassName('ICON.JPEG')).toBe('icon')
  })

  it('特殊字符转连字符并合并', () => {
    expect(cssClassName('my icon@2x.png')).toBe('my-icon-2x')
    expect(cssClassName('-_abc.gif')).toBe('abc')
  })

  it('中文名兜底为 sprite', () => {
    expect(cssClassName('中文.png')).toBe('sprite')
  })

  it('数字开头加 s- 前缀', () => {
    expect(cssClassName('123.png')).toBe('s-123')
    expect(cssClassName('2x-icon.png')).toBe('s-2x-icon')
  })

  it('空名兜底为 sprite', () => {
    expect(cssClassName('')).toBe('sprite')
    expect(cssClassName('.png')).toBe('sprite')
  })
})

describe('buildSpriteJSON', () => {
  it('输出 2 空格缩进的 JSON 数组', () => {
    const items = [
      { name: 'a.png', x: 0, y: 0, w: 100, h: 50 },
      { name: 'b.png', x: 100, y: 0, w: 60, h: 80 },
    ]
    const text = buildSpriteJSON(items)
    expect(text).toBe(JSON.stringify(items, null, 2))
    expect(JSON.parse(text)).toEqual(items)
    expect(text).toContain('\n  {\n    "name": "a.png"')
  })
})

describe('buildSpriteCSS', () => {
  it('每张一行 background 定位规则', () => {
    const css = buildSpriteCSS(
      [
        { name: 'Logo.png', x: 0, y: 0, w: 100, h: 50 },
        { name: 'b.png', x: 100, y: 0, w: 60, h: 80 },
      ],
      'sprite.png',
    )
    expect(css).toBe(
      '.logo { width: 100px; height: 50px; background: url(sprite.png) -0px -0px; }\n' +
        '.b { width: 60px; height: 80px; background: url(sprite.png) -100px -0px; }',
    )
  })
})

describe('buildOutputFileName', () => {
  it('png / jpeg 输出文件名', () => {
    expect(buildOutputFileName('png')).toBe('sprite.png')
    expect(buildOutputFileName('jpeg')).toBe('sprite.jpg')
  })
})
