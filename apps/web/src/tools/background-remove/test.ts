import { describe, expect, it } from 'vitest'
import {
  DEFAULT_TOLERANCE,
  MAX_COLOR_DISTANCE,
  MAX_FILE_SIZE,
  MAX_TOLERANCE,
  assertFileSizeOk,
  buildOutputFileName,
  chromaKeyRemove,
  colorDistanceSq,
  errorMessage,
  floodFillRemove,
  parseHexColor,
  parseTolerance,
  sampleEdgeColor,
  toleranceToDistSq,
} from './utils'
import type { PixelBuffer, RGB } from './utils'

type RGBA = [number, number, number, number]

/** 构造测试用像素缓冲 */
function makeBuf(width: number, height: number, fill: (x: number, y: number) => RGBA): PixelBuffer {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = fill(x, y)
      const i = (y * width + x) * 4
      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
      data[i + 3] = a
    }
  }
  return { data, width, height }
}

const WHITE: RGBA = [255, 255, 255, 255]
const RED: RGBA = [255, 0, 0, 255]
const GREEN: RGBA = [0, 255, 0, 255]
const TRANSPARENT: RGBA = [0, 0, 0, 0]

function alphaAt(buf: PixelBuffer, x: number, y: number): number {
  return buf.data[(y * buf.width + x) * 4 + 3]
}

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
  })
})

describe('colorDistanceSq', () => {
  it('相同颜色距离为 0', () => {
    expect(colorDistanceSq([10, 20, 30], [10, 20, 30])).toBe(0)
  })

  it('黑白距离为 3×255²（避免开方）', () => {
    expect(colorDistanceSq([0, 0, 0], [255, 255, 255])).toBe(3 * 255 * 255)
    expect(colorDistanceSq([255, 0, 0], [0, 255, 0])).toBe(2 * 255 * 255)
  })
})

describe('sampleEdgeColor', () => {
  it('纯色图采样即该色', () => {
    const buf = makeBuf(4, 4, () => WHITE)
    expect(sampleEdgeColor(buf)).toEqual([255, 255, 255])
  })

  it('四角+边中点 8 采样点均值', () => {
    // 3x3：8 个采样点逐个给定，便于验算均值
    const samples: Record<string, RGB> = {
      '0,0': [10, 20, 30],
      '2,0': [40, 50, 60],
      '0,2': [70, 80, 90],
      '2,2': [100, 110, 120],
      '1,0': [130, 140, 150],
      '1,2': [160, 170, 180],
      '0,1': [190, 200, 210],
      '2,1': [220, 230, 240],
    }
    const buf = makeBuf(3, 3, (x, y) => [...(samples[`${x},${y}`] ?? [0, 0, 0]), 255] as RGBA)
    // r: 920/8=115, g: 1000/8=125, b: 1080/8=135
    expect(sampleEdgeColor(buf)).toEqual([115, 125, 135])
  })

  it('1x1 小图不越界', () => {
    const buf = makeBuf(1, 1, () => [12, 34, 56, 255])
    expect(sampleEdgeColor(buf)).toEqual([12, 34, 56])
  })

  it('非法缓冲抛错', () => {
    const good = makeBuf(2, 2, () => WHITE)
    expect(() => sampleEdgeColor({ ...good, width: 0 })).toThrow(/宽度无效/)
    expect(() => sampleEdgeColor({ ...good, width: 1.5 })).toThrow(/宽度无效/)
    expect(() => sampleEdgeColor({ ...good, height: 0 })).toThrow(/高度无效/)
    expect(() => sampleEdgeColor({ ...good, height: NaN })).toThrow(/高度无效/)
    expect(() => sampleEdgeColor({ ...good, data: new Uint8ClampedArray(4) })).toThrow(
      /长度与尺寸不匹配/,
    )
  })
})

describe('toleranceToDistSq', () => {
  it('0 → 0（仅精确匹配）', () => {
    expect(toleranceToDistSq(0)).toBe(0)
  })

  it('100 → 色域对角线平方（覆盖全色域）', () => {
    expect(toleranceToDistSq(100)).toBeCloseTo(MAX_COLOR_DISTANCE ** 2, 6)
  })

  it('25 → (0.25×441.67)²', () => {
    expect(toleranceToDistSq(25)).toBeCloseTo((0.25 * MAX_COLOR_DISTANCE) ** 2, 6)
  })

  it('非法输入抛错', () => {
    expect(() => toleranceToDistSq(NaN)).toThrow(/容差无效/)
    expect(() => toleranceToDistSq(-1)).toThrow(/容差无效/)
    expect(() => toleranceToDistSq(101)).toThrow(/容差无效/)
  })
})

describe('floodFillRemove', () => {
  it('连通背景被移除，主体保留', () => {
    // 4x4 白底 + 中央 2x2 红色主体
    const buf = makeBuf(4, 4, (x, y) => (x >= 1 && x <= 2 && y >= 1 && y <= 2 ? RED : WHITE))
    const { data, removed } = floodFillRemove(buf, toleranceToDistSq(25))
    expect(removed).toBe(12)
    // 背景透明、主体不透明
    expect(data[3]).toBe(0)
    expect(alphaAt({ data, width: 4, height: 4 }, 1, 1)).toBe(255)
    // 返回的是拷贝：原缓冲不受影响
    expect(alphaAt(buf, 0, 0)).toBe(255)
  })

  it('被主体包围的背景不连通则保留', () => {
    // 5x5：白边框 + 红色环 + 中央白色 1px（不与边缘连通）
    const buf = makeBuf(5, 5, (x, y) => {
      const edge = x === 0 || y === 0 || x === 4 || y === 4
      if (edge) return WHITE
      if (x === 2 && y === 2) return WHITE
      return RED
    })
    const { removed, data } = floodFillRemove(buf, toleranceToDistSq(25))
    expect(removed).toBe(16) // 仅边框
    expect(alphaAt({ data, width: 5, height: 5 }, 2, 2)).toBe(255) // 中央白点保留
  })

  it('与背景色差距大的边缘种子被跳过', () => {
    // 4x1：白、红、白、白；容差 15 时红种子远离背景色被跳过
    const buf = makeBuf(4, 1, (x) => (x === 1 ? RED : WHITE))
    const { removed, data } = floodFillRemove(buf, toleranceToDistSq(15))
    expect(removed).toBe(3)
    expect(alphaAt({ data, width: 4, height: 1 }, 1, 0)).toBe(255)
  })

  it('容差 0 只移除精确匹配的背景', () => {
    const buf = makeBuf(2, 2, () => WHITE)
    const { removed } = floodFillRemove(buf, toleranceToDistSq(0))
    expect(removed).toBe(4)
  })

  it('全透明图 removed=0（合法分支：无可移除背景）', () => {
    const buf = makeBuf(2, 2, () => TRANSPARENT)
    const { data, removed } = floodFillRemove(buf, toleranceToDistSq(25))
    expect(removed).toBe(0)
    expect(data[3]).toBe(0)
  })

  it('1x1 图：重复种子只访问一次', () => {
    const buf = makeBuf(1, 1, () => WHITE)
    const { removed } = floodFillRemove(buf, toleranceToDistSq(25))
    expect(removed).toBe(1)
  })

  it('支持 number[] 输入', () => {
    const raw: number[] = [255, 255, 255, 255]
    const { removed, data } = floodFillRemove({ data: raw, width: 1, height: 1 }, 1)
    expect(removed).toBe(1)
    expect(data).toBeInstanceOf(Uint8ClampedArray)
  })

  it('非法输入抛错', () => {
    const buf = makeBuf(2, 2, () => WHITE)
    expect(() => floodFillRemove(buf, NaN)).toThrow(/距离阈值无效/)
    expect(() => floodFillRemove(buf, -1)).toThrow(/距离阈值无效/)
    expect(() => floodFillRemove({ ...buf, width: 0 }, 1)).toThrow(/宽度无效/)
  })
})

describe('chromaKeyRemove', () => {
  it('全命中：整图置透明', () => {
    const buf = makeBuf(2, 2, () => GREEN)
    const { removed, data } = chromaKeyRemove(buf, [0, 255, 0], toleranceToDistSq(25))
    expect(removed).toBe(4)
    expect(data[3]).toBe(0)
    expect(alphaAt(buf, 0, 0)).toBe(255) // 原缓冲不受影响
  })

  it('零命中：removed=0', () => {
    const buf = makeBuf(2, 2, () => RED)
    const { removed } = chromaKeyRemove(buf, [0, 255, 0], toleranceToDistSq(0))
    expect(removed).toBe(0)
  })

  it('部分命中：近似色按容差移除，已透明像素跳过', () => {
    const buf = makeBuf(2, 2, (x, y) => {
      if (x === 0 && y === 0) return GREEN
      if (x === 1 && y === 0) return [0, 250, 0, 255] // 距目标 25
      if (x === 0 && y === 1) return RED
      return [0, 255, 0, 0] // 已透明：跳过不计
    })
    const { removed, data } = chromaKeyRemove(buf, [0, 255, 0], toleranceToDistSq(5))
    // distSq(5) ≈ 487 ≥ 25（近似绿）且 ≥ 0（纯绿）；红像素距离远
    expect(removed).toBe(2)
    expect(alphaAt({ data, width: 2, height: 2 }, 0, 1)).toBe(255)
  })

  it('非法输入抛错', () => {
    const buf = makeBuf(2, 2, () => GREEN)
    expect(() => chromaKeyRemove(buf, [0, 255, 0], NaN)).toThrow(/距离阈值无效/)
    expect(() => chromaKeyRemove({ ...buf, height: 0 }, [0, 255, 0], 1)).toThrow(/高度无效/)
  })
})

describe('parseTolerance', () => {
  it('空串用默认 25', () => {
    expect(parseTolerance('')).toBe(DEFAULT_TOLERANCE)
    expect(parseTolerance('   ')).toBe(DEFAULT_TOLERANCE)
  })

  it('正常解析（含边界 0/100）', () => {
    expect(parseTolerance('0')).toBe(0)
    expect(parseTolerance('100')).toBe(MAX_TOLERANCE)
    expect(parseTolerance(' 42 ')).toBe(42)
  })

  it('非法抛错', () => {
    expect(() => parseTolerance('abc')).toThrow(/容差无效/)
    expect(() => parseTolerance('12.5')).toThrow(/容差无效/)
    expect(() => parseTolerance('-1')).toThrow(/容差无效/)
    expect(() => parseTolerance('101')).toThrow(/超出范围/)
  })
})

describe('parseHexColor', () => {
  it('正常解析 #rrggbb（大小写均可）', () => {
    expect(parseHexColor('#00ff00')).toEqual([0, 255, 0])
    expect(parseHexColor('#AABBCC')).toEqual([170, 187, 204])
    expect(parseHexColor('  #ff0000  ')).toEqual([255, 0, 0])
  })

  it('非法格式抛错', () => {
    expect(() => parseHexColor('00ff00')).toThrow(/颜色无效/)
    expect(() => parseHexColor('#fff')).toThrow(/颜色无效/)
    expect(() => parseHexColor('#gggggg')).toThrow(/颜色无效/)
    expect(() => parseHexColor('')).toThrow(/颜色无效/)
  })
})

describe('buildOutputFileName', () => {
  it('去扩展名加 -nobg.png', () => {
    expect(buildOutputFileName('photo.jpg')).toBe('photo-nobg.png')
    expect(buildOutputFileName('a.webp')).toBe('a-nobg.png')
    expect(buildOutputFileName('noext')).toBe('noext-nobg.png')
  })

  it('空名兜底为 image', () => {
    expect(buildOutputFileName('')).toBe('image-nobg.png')
    expect(buildOutputFileName('.png')).toBe('image-nobg.png')
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
