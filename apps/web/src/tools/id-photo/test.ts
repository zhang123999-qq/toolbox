import { describe, expect, it } from 'vitest'
import type { BgColorMode, LayoutKey, SpecKey } from './schema'
import {
  DEFAULT_DPI,
  DEFAULT_SCALE,
  LAYOUT_GAP_MM,
  MAX_CUSTOM_MM,
  MAX_FILE_SIZE,
  SPEC_PRESETS,
  assertFileSizeOk,
  buildOutputFileName,
  computeCropRect,
  computeLayout,
  errorMessage,
  mmToPx,
  paperMmForLayout,
  parseCustomMm,
  parseDpi,
  parseScale,
  resolveBgColor,
  resolveSpec,
} from './utils'

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
  })

  it('空消息兜底为「处理失败」', () => {
    expect(errorMessage(new Error())).toBe('处理失败')
    expect(errorMessage('')).toBe('处理失败')
  })
})

describe('mmToPx', () => {
  it('25.4mm @ 300dpi = 300px', () => {
    expect(mmToPx(25.4, 300)).toBe(300)
  })

  it('四舍五入', () => {
    // 25mm @ 300dpi = 295.275… → 295
    expect(mmToPx(25, 300)).toBe(295)
    // 35mm @ 150dpi = 206.69… → 207
    expect(mmToPx(35, 150)).toBe(207)
  })

  it('非法输入抛错', () => {
    expect(() => mmToPx(0, 300)).toThrow(/无效/)
    expect(() => mmToPx(-5, 300)).toThrow(/无效/)
    expect(() => mmToPx(25, 0)).toThrow(/无效/)
    expect(() => mmToPx(NaN, 300)).toThrow(/无效/)
    expect(() => mmToPx(25, Infinity)).toThrow(/无效/)
  })
})

describe('parseDpi', () => {
  it('空串用默认 300', () => {
    expect(parseDpi('')).toBe(DEFAULT_DPI)
    expect(parseDpi('   ')).toBe(DEFAULT_DPI)
  })

  it('接受 150 / 300 / 600', () => {
    expect(parseDpi('150')).toBe(150)
    expect(parseDpi('300')).toBe(300)
    expect(parseDpi('600')).toBe(600)
  })

  it('非法抛错', () => {
    expect(() => parseDpi('abc')).toThrow(/DPI 无效/)
    expect(() => parseDpi('200')).toThrow(/DPI 无效/)
    expect(() => parseDpi('300.5')).toThrow(/DPI 无效/)
  })
})

describe('parseScale', () => {
  it('空串用默认 100', () => {
    expect(parseScale('')).toBe(DEFAULT_SCALE)
  })

  it('边界 50 / 200', () => {
    expect(parseScale('50')).toBe(50)
    expect(parseScale('200')).toBe(200)
    expect(parseScale(' 120 ')).toBe(120)
  })

  it('非法抛错', () => {
    expect(() => parseScale('abc')).toThrow(/缩放无效/)
    expect(() => parseScale('100.5')).toThrow(/缩放无效/)
    expect(() => parseScale('49')).toThrow(/超出范围/)
    expect(() => parseScale('201')).toThrow(/超出范围/)
  })
})

describe('parseCustomMm', () => {
  it('正常解析（含小数）', () => {
    expect(parseCustomMm('25', '宽')).toBe(25)
    expect(parseCustomMm('33.5', '高')).toBe(33.5)
  })

  it('上限 500mm', () => {
    expect(parseCustomMm(String(MAX_CUSTOM_MM), '宽')).toBe(MAX_CUSTOM_MM)
  })

  it('非法抛错', () => {
    expect(() => parseCustomMm('', '宽')).toThrow(/请填写/)
    expect(() => parseCustomMm('   ', '高')).toThrow(/请填写/)
    expect(() => parseCustomMm('abc', '宽')).toThrow(/无效/)
    expect(() => parseCustomMm('12mm', '宽')).toThrow(/无效/)
    expect(() => parseCustomMm('0', '宽')).toThrow(/超出范围/)
    expect(() => parseCustomMm('-5', '宽')).toThrow(/无效/)
    expect(() => parseCustomMm(String(MAX_CUSTOM_MM + 1), '高')).toThrow(/超出范围/)
  })
})

describe('SPEC_PRESETS / resolveSpec', () => {
  it('预设表为 4 项常用规格', () => {
    expect(SPEC_PRESETS).toEqual([
      { key: '1inch', wMm: 25, hMm: 35 },
      { key: '2inch', wMm: 35, hMm: 49 },
      { key: 'small2inch', wMm: 35, hMm: 45 },
      { key: 'large1inch', wMm: 33, hMm: 48 },
    ])
  })

  it('预设查表', () => {
    expect(resolveSpec('1inch', '', '')).toEqual({ wMm: 25, hMm: 35 })
    expect(resolveSpec('2inch', '', '')).toEqual({ wMm: 35, hMm: 49 })
    expect(resolveSpec('small2inch', '', '')).toEqual({ wMm: 35, hMm: 45 })
    expect(resolveSpec('large1inch', '', '')).toEqual({ wMm: 33, hMm: 48 })
  })

  it('自定义解析用户输入', () => {
    expect(resolveSpec('custom', '40', '60')).toEqual({ wMm: 40, hMm: 60 })
  })

  it('自定义未填抛错', () => {
    expect(() => resolveSpec('custom', '', '60')).toThrow(/请填写/)
    expect(() => resolveSpec('custom', '40', '')).toThrow(/请填写/)
  })

  it('未知规格抛错', () => {
    expect(() => resolveSpec('nope' as never as SpecKey, '', '')).toThrow(/未知规格/)
  })
})

describe('resolveBgColor', () => {
  it('三预设底色', () => {
    expect(resolveBgColor('red', '')).toBe('#ff0000')
    expect(resolveBgColor('blue', '')).toBe('#3584e4')
    expect(resolveBgColor('white', '')).toBe('#ffffff')
  })

  it('自定义颜色校验 #rgb / #rrggbb', () => {
    expect(resolveBgColor('custom', '#123456')).toBe('#123456')
    expect(resolveBgColor('custom', '#abc')).toBe('#abc')
    expect(resolveBgColor('custom', '  #ABCDEF  ')).toBe('#ABCDEF')
  })

  it('非法抛错', () => {
    expect(() => resolveBgColor('custom', '')).toThrow(/自定义底色无效/)
    expect(() => resolveBgColor('custom', 'red')).toThrow(/自定义底色无效/)
    expect(() => resolveBgColor('custom', '#12345')).toThrow(/自定义底色无效/)
    expect(() => resolveBgColor('nope' as never as BgColorMode, '')).toThrow(/未知底色/)
  })
})

describe('paperMmForLayout', () => {
  it('单张返回 null', () => {
    expect(paperMmForLayout('single')).toBeNull()
  })

  it('5寸相纸 127×89mm，A4 210×297mm', () => {
    expect(paperMmForLayout('5inch')).toEqual({ wMm: 127, hMm: 89 })
    expect(paperMmForLayout('a4')).toEqual({ wMm: 210, hMm: 297 })
  })

  it('拼版间距为 2mm', () => {
    expect(LAYOUT_GAP_MM).toBe(2)
  })
})

describe('computeCropRect', () => {
  it('同宽高比 scale=100 取整图', () => {
    expect(computeCropRect(800, 600, 4 / 3, 100)).toEqual({ x: 0, y: 0, w: 800, h: 600 })
  })

  it('宽原图裁正方形：居中', () => {
    // 1200×600 裁 1:1 → 600×600，x=300
    expect(computeCropRect(1200, 600, 1, 100)).toEqual({ x: 300, y: 0, w: 600, h: 600 })
  })

  it('高原图裁宽图：居中', () => {
    // 600×1200 裁 2:1 → 600×300，y=450
    expect(computeCropRect(600, 1200, 2, 100)).toEqual({ x: 0, y: 450, w: 600, h: 300 })
  })

  it('scale=200 裁剪框缩小一半（人像放大）', () => {
    expect(computeCropRect(1200, 600, 1, 200)).toEqual({ x: 450, y: 150, w: 300, h: 300 })
  })

  it('scale=50 裁剪框放大但 clamp 到原图', () => {
    // 1200×600 裁 1:1，factor=2 → 1200×1200 超高，clamp 回 600×600
    expect(computeCropRect(1200, 600, 1, 50)).toEqual({ x: 300, y: 0, w: 600, h: 600 })
    // 宽 clamp 但高不超：1200×600 裁 2:1 factor=2 → w clamp 到 1200，h=600 未超
    expect(computeCropRect(1200, 600, 2, 50)).toEqual({ x: 0, y: 0, w: 1200, h: 600 })
  })

  it('非法输入抛错', () => {
    expect(() => computeCropRect(0, 600, 1, 100)).toThrow(/图片尺寸无效/)
    expect(() => computeCropRect(800, -1, 1, 100)).toThrow(/图片尺寸无效/)
    expect(() => computeCropRect(NaN, 600, 1, 100)).toThrow(/图片尺寸无效/)
    expect(() => computeCropRect(800, 600, 0, 100)).toThrow(/宽高比无效/)
    expect(() => computeCropRect(800, 600, -2, 100)).toThrow(/宽高比无效/)
    expect(() => computeCropRect(800, 600, NaN, 100)).toThrow(/宽高比无效/)
    expect(() => computeCropRect(800, 600, 1, 49)).toThrow(/缩放无效/)
    expect(() => computeCropRect(800, 600, 1, 201)).toThrow(/缩放无效/)
    expect(() => computeCropRect(800, 600, 1, 100.5)).toThrow(/缩放无效/)
  })
})

describe('computeLayout', () => {
  it('正常拼版：列/行数与坐标', () => {
    // 纸 1500×1043，照片 295×413，间距 24 → 4列×2行
    const r = computeLayout(1500, 1043, 295, 413, 24)
    expect(r.cols).toBe(4)
    expect(r.rows).toBe(2)
    expect(r.positions).toHaveLength(8)
    expect(r.positions[0]).toEqual({ x: 0, y: 0 })
    expect(r.positions[1]).toEqual({ x: 319, y: 0 })
    expect(r.positions[4]).toEqual({ x: 0, y: 437 })
    expect(r.positions[7]).toEqual({ x: 957, y: 437 })
  })

  it('间距为 0 时紧贴排列', () => {
    const r = computeLayout(1000, 500, 250, 250, 0)
    expect(r.cols).toBe(4)
    expect(r.rows).toBe(2)
    expect(r.positions[1]).toEqual({ x: 250, y: 0 })
  })

  it('照片宽于纸张 → 0 列（调用方报错）', () => {
    const r = computeLayout(1500, 1043, 4724, 118, 24)
    expect(r.cols).toBe(0)
    expect(r.rows).toBeGreaterThan(0)
    expect(r.positions).toEqual([])
  })

  it('照片高于纸张 → 0 行', () => {
    const r = computeLayout(1500, 1043, 118, 4724, 24)
    expect(r.cols).toBeGreaterThan(0)
    expect(r.rows).toBe(0)
    expect(r.positions).toEqual([])
  })

  it('非法尺寸返回 0 列 0 行', () => {
    expect(computeLayout(0, 100, 50, 50, 0)).toEqual({ cols: 0, rows: 0, positions: [] })
    expect(computeLayout(100, 100, 0, 50, 0)).toEqual({ cols: 0, rows: 0, positions: [] })
    expect(computeLayout(NaN, 100, 50, 50, 0).cols).toBe(0)
    // 合法小尺寸正常排版
    expect(computeLayout(100, 100, 50, 50, 0).positions).toHaveLength(4)
  })

  it('负间距按 0 处理', () => {
    const neg = computeLayout(1000, 500, 250, 250, -10)
    const zero = computeLayout(1000, 500, 250, 250, 0)
    expect(neg).toEqual(zero)
    // NaN 间距同样按 0 处理
    expect(computeLayout(1000, 500, 250, 250, NaN)).toEqual(zero)
  })
})

describe('buildOutputFileName', () => {
  it('单张：原名-id-photo-规格.jpg', () => {
    expect(buildOutputFileName('photo.png', '1inch', 'single')).toBe('photo-id-photo-1inch.jpg')
    expect(buildOutputFileName('a.webp', '2inch', 'single')).toBe('a-id-photo-2inch.jpg')
  })

  it('拼版加 -layout 后缀', () => {
    expect(buildOutputFileName('photo.png', '1inch', '5inch')).toBe(
      'photo-id-photo-1inch-layout.jpg',
    )
    expect(buildOutputFileName('x.jpg', 'custom', 'a4' as LayoutKey)).toBe(
      'x-id-photo-custom-layout.jpg',
    )
  })

  it('无扩展名与空名兜底', () => {
    expect(buildOutputFileName('noext', 'small2inch', 'single')).toBe(
      'noext-id-photo-small2inch.jpg',
    )
    expect(buildOutputFileName('', 'large1inch', 'single')).toBe('photo-id-photo-large1inch.jpg')
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
