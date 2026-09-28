import { describe, expect, it } from 'vitest'
import {
  DEFAULT_COLORS,
  DEFAULT_MAX_EDGE,
  DEFAULT_MIN_AREA,
  MAX_COLORS,
  MAX_FILE_SIZE,
  MAX_MAX_EDGE,
  MAX_MIN_AREA,
  MIN_COLORS,
  MIN_MAX_EDGE,
  assertFileSizeOk,
  buildOutputFileName,
  buildSvg,
  errorMessage,
  filterSmallPolygons,
  parseColors,
  parseMaxEdge,
  parseMinArea,
  polygonArea,
  polygonsToPath,
  posterize,
  scaledSize,
  traceLayer,
  vectorizeImage,
} from './utils'
import type { RgbPixel } from './utils'

/** 构造 w×h 的纯色 RGBA 数据 */
function solidRgba(w: number, h: number, r: number, g: number, b: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let i = 0; i < w * h; i++) {
    data[i * 4] = r
    data[i * 4 + 1] = g
    data[i * 4 + 2] = b
    data[i * 4 + 3] = 255
  }
  return data
}

/** 构造 w×h 的纯色 {r,g,b} 数组 */
function solidRgb(w: number, h: number, r: number, g: number, b: number): RgbPixel[] {
  return Array.from({ length: w * h }, () => ({ r, g, b }))
}

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
    expect(errorMessage(undefined)).toBe('undefined')
  })
})

describe('parseColors', () => {
  it('空串用默认 4', () => {
    expect(parseColors('')).toBe(DEFAULT_COLORS)
    expect(parseColors('   ')).toBe(DEFAULT_COLORS)
  })

  it('正常解析边界值', () => {
    expect(parseColors(String(MIN_COLORS))).toBe(2)
    expect(parseColors(String(MAX_COLORS))).toBe(8)
    expect(parseColors(' 5 ')).toBe(5)
  })

  it('非法抛错', () => {
    expect(() => parseColors('abc')).toThrow(/颜色数无效/)
    expect(() => parseColors('4.5')).toThrow(/颜色数无效/)
    expect(() => parseColors('1')).toThrow(/颜色数超出范围/)
    expect(() => parseColors('9')).toThrow(/颜色数超出范围/)
  })
})

describe('parseMaxEdge', () => {
  it('空串用默认 256', () => {
    expect(parseMaxEdge('')).toBe(DEFAULT_MAX_EDGE)
  })

  it('正常解析边界值', () => {
    expect(parseMaxEdge(String(MIN_MAX_EDGE))).toBe(64)
    expect(parseMaxEdge(String(MAX_MAX_EDGE))).toBe(1024)
    expect(parseMaxEdge(' 512 ')).toBe(512)
  })

  it('非法抛错', () => {
    expect(() => parseMaxEdge('abc')).toThrow(/最大边无效/)
    expect(() => parseMaxEdge('-5')).toThrow(/最大边无效/)
    expect(() => parseMaxEdge('63')).toThrow(/最大边超出范围/)
    expect(() => parseMaxEdge('1025')).toThrow(/最大边超出范围/)
  })
})

describe('parseMinArea', () => {
  it('空串用默认 4', () => {
    expect(parseMinArea('')).toBe(DEFAULT_MIN_AREA)
  })

  it('正常解析', () => {
    expect(parseMinArea('0')).toBe(0)
    expect(parseMinArea('100')).toBe(100)
  })

  it('非法抛错', () => {
    expect(() => parseMinArea('abc')).toThrow(/最小色块无效/)
    expect(() => parseMinArea('-1')).toThrow(/最小色块无效/)
    expect(() => parseMinArea(String(MAX_MIN_AREA + 1))).toThrow(/最小色块过大/)
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

describe('scaledSize', () => {
  it('不过限原样返回', () => {
    expect(scaledSize(800, 600, 1024)).toEqual({ width: 800, height: 600 })
    expect(scaledSize(256, 256, 256)).toEqual({ width: 256, height: 256 })
  })

  it('超限等比缩放', () => {
    // 4000x3000，最大边 1000 → 1000x750
    expect(scaledSize(4000, 3000, 1000)).toEqual({ width: 1000, height: 750 })
    // 竖图：3000x4000 → 750x1000
    expect(scaledSize(3000, 4000, 1000)).toEqual({ width: 750, height: 1000 })
  })

  it('极小缩放保底 1px', () => {
    expect(scaledSize(10000, 1, 1)).toEqual({ width: 1, height: 1 })
  })

  it('非法尺寸抛错', () => {
    expect(() => scaledSize(0, 100, 256)).toThrow(/图片尺寸无效/)
    expect(() => scaledSize(NaN, 100, 256)).toThrow(/图片尺寸无效/)
    expect(() => scaledSize(100, -1, 256)).toThrow(/图片尺寸无效/)
    expect(() => scaledSize(100, Infinity, 256)).toThrow(/图片尺寸无效/)
  })
})

describe('buildOutputFileName', () => {
  it('替换扩展名并加 -vector 后缀', () => {
    expect(buildOutputFileName('photo.png')).toBe('photo-vector.svg')
    expect(buildOutputFileName('a.jpeg')).toBe('a-vector.svg')
    expect(buildOutputFileName('noext')).toBe('noext-vector.svg')
  })

  it('空名兜底为 image', () => {
    expect(buildOutputFileName('')).toBe('image-vector.svg')
    expect(buildOutputFileName('.png')).toBe('image-vector.svg')
  })
})

describe('posterize', () => {
  it('非法尺寸抛错', () => {
    const px = solidRgba(2, 2, 255, 0, 0)
    expect(() => posterize(px, 0, 2, 2)).toThrow(/图片尺寸无效/)
    expect(() => posterize(px, 1.5, 2, 2)).toThrow(/图片尺寸无效/)
    expect(() => posterize(px, 2, -2, 2)).toThrow(/图片尺寸无效/)
  })

  it('非法颜色数抛错', () => {
    const px = solidRgba(2, 2, 255, 0, 0)
    expect(() => posterize(px, 2, 2, 1)).toThrow(/颜色数无效/)
    expect(() => posterize(px, 2, 2, 9)).toThrow(/颜色数无效/)
    expect(() => posterize(px, 2, 2, 2.5)).toThrow(/颜色数无效/)
  })

  it('像素长度与尺寸不匹配抛错', () => {
    expect(() => posterize(new Uint8ClampedArray(10), 2, 2, 2)).toThrow(/长度与尺寸不匹配/)
    expect(() => posterize(solidRgb(2, 2, 0, 0, 0).slice(0, 3), 2, 2, 2)).toThrow(
      /长度与尺寸不匹配/,
    )
  })

  it('Uint8ClampedArray 输入：纯色只产出一层', () => {
    const layers = posterize(solidRgba(2, 2, 255, 0, 0), 2, 2, 2)
    expect(layers).toHaveLength(1)
    expect(layers[0].color).toBe('#ff0000')
    expect([...layers[0].mask]).toEqual([1, 1, 1, 1])
  })

  it('{r,g,b}[] 输入：与 Uint8ClampedArray 结果一致', () => {
    const layers = posterize(solidRgb(2, 2, 255, 0, 0), 2, 2, 2)
    expect(layers).toHaveLength(1)
    expect(layers[0].color).toBe('#ff0000')
    expect([...layers[0].mask]).toEqual([1, 1, 1, 1])
  })

  it('双色按 key 升序分层，掩膜互斥', () => {
    // 红 (255,0,0)→q(1,0,0) key=4；白 (255,255,255)→q(1,1,1) key=7
    const px = new Uint8ClampedArray([255, 0, 0, 255, 255, 255, 255, 255])
    const layers = posterize(px, 2, 1, 2)
    expect(layers.map((l) => l.color)).toEqual(['#ff0000', '#ffffff'])
    expect([...layers[0].mask]).toEqual([1, 0])
    expect([...layers[1].mask]).toEqual([0, 1])
  })

  it('同色像素合并到同一桶（掩膜累加）', () => {
    const layers = posterize(solidRgba(3, 1, 0, 255, 0), 3, 1, 4)
    expect(layers).toHaveLength(1)
    expect(layers[0].color).toBe('#00ff00')
    expect([...layers[0].mask]).toEqual([1, 1, 1])
  })

  it('越界通道值被钳位（负数/NaN→0，超限→255）', () => {
    // r=-10→0, g=NaN→0, b=300→255；colors=2 时 q=(0,0,1) → #0000ff
    const layers = posterize([{ r: -10, g: NaN, b: 300 }], 1, 1, 2)
    expect(layers[0].color).toBe('#0000ff')
  })

  it('中间值通道正常通过钳位', () => {
    // (128,128,128) colors=4：q=round(128/255*3)=round(1.51)=2 → 反量化 170 → #aaaaaa
    const layers = posterize([{ r: 128, g: 128, b: 128 }], 1, 1, 4)
    expect(layers[0].color).toBe('#aaaaaa')
  })
})

describe('traceLayer', () => {
  it('非法尺寸抛错', () => {
    expect(() => traceLayer(new Uint8Array(4), 1.5, 2)).toThrow(/掩膜尺寸无效/)
    expect(() => traceLayer(new Uint8Array(0), -1, 2)).toThrow(/掩膜尺寸无效/)
    expect(() => traceLayer(new Uint8Array(0), 2, -1)).toThrow(/掩膜尺寸无效/)
  })

  it('掩膜长度与尺寸不匹配抛错', () => {
    expect(() => traceLayer(new Uint8Array(3), 2, 2)).toThrow(/掩膜长度与尺寸不匹配/)
  })

  it('空掩膜 → []', () => {
    expect(traceLayer(new Uint8Array(4), 2, 2)).toEqual([])
    expect(traceLayer(new Uint8Array(0), 0, 0)).toEqual([])
  })

  it('单像素 → 1 个单位矩形', () => {
    const mask = new Uint8Array(9)
    mask[4] = 1 // 3x3 中心
    expect(traceLayer(mask, 3, 3)).toEqual([
      [
        [1, 1],
        [2, 1],
        [2, 2],
        [1, 2],
      ],
    ])
  })

  it('全图填满 → 每行 1 个矩形', () => {
    expect(traceLayer(new Uint8Array([1, 1, 1, 1]), 2, 2)).toEqual([
      [
        [0, 0],
        [2, 0],
        [2, 1],
        [0, 1],
      ],
      [
        [0, 1],
        [2, 1],
        [2, 2],
        [0, 2],
      ],
    ])
  })

  it('掩膜碰画布边缘（左列）正常输出', () => {
    expect(traceLayer(new Uint8Array([1, 0, 1, 0]), 2, 2)).toEqual([
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ],
      [
        [0, 1],
        [1, 1],
        [1, 2],
        [0, 2],
      ],
    ])
  })

  it('行内断开 → 同行输出多个矩形（含行尾收尾）', () => {
    // 4x1：[1,1,0,1] → [0,2] 与 [3,4] 两个矩形
    expect(traceLayer(new Uint8Array([1, 1, 0, 1]), 4, 1)).toEqual([
      [
        [0, 0],
        [2, 0],
        [2, 1],
        [0, 1],
      ],
      [
        [3, 0],
        [4, 0],
        [4, 1],
        [3, 1],
      ],
    ])
  })
})

describe('polygonArea', () => {
  it('矩形面积', () => {
    expect(
      polygonArea([
        [0, 0],
        [4, 0],
        [4, 3],
        [0, 3],
      ]),
    ).toBe(12)
  })

  it('顶点顺序反转面积仍为正', () => {
    expect(
      polygonArea([
        [0, 0],
        [0, 3],
        [4, 3],
        [4, 0],
      ]),
    ).toBe(12)
  })

  it('退化多边形面积为 0', () => {
    expect(polygonArea([])).toBe(0)
    expect(
      polygonArea([
        [0, 0],
        [5, 5],
      ]),
    ).toBe(0)
  })
})

describe('filterSmallPolygons', () => {
  const big = [
    [0, 0],
    [4, 0],
    [4, 3],
    [0, 3],
  ] // 面积 12
  const tiny = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ] // 面积 1

  it('过滤掉小面积多边形', () => {
    expect(filterSmallPolygons([big, tiny], 4)).toEqual([big])
  })

  it('minArea=0 全保留', () => {
    expect(filterSmallPolygons([big, tiny], 0)).toEqual([big, tiny])
  })

  it('阈值过大全部过滤', () => {
    expect(filterSmallPolygons([big, tiny], 100)).toEqual([])
  })
})

describe('polygonsToPath', () => {
  it('空数组 → 空串', () => {
    expect(polygonsToPath([])).toBe('')
  })

  it('空多边形被跳过', () => {
    expect(polygonsToPath([[]])).toBe('')
  })

  it('矩形转 M/L/Z，坐标取整', () => {
    expect(
      polygonsToPath([
        [
          [0, 0],
          [2, 0],
          [2, 1],
          [0, 1],
        ],
      ]),
    ).toBe('M0,0L2,0L2,1L0,1Z')
  })

  it('小数坐标四舍五入', () => {
    expect(
      polygonsToPath([
        [
          [0.4, 0.6],
          [2.5, 0],
          [2, 1],
        ],
      ]),
    ).toBe('M0,1L3,0L2,1Z')
  })

  it('多个多边形空格拼接', () => {
    expect(
      polygonsToPath([
        [
          [0, 0],
          [1, 0],
        ],
        [
          [5, 5],
          [6, 6],
        ],
      ]),
    ).toBe('M0,0L1,0Z M5,5L6,6Z')
  })
})

describe('buildSvg', () => {
  it('非法尺寸抛错', () => {
    expect(() => buildSvg([], 0, 100)).toThrow(/SVG 尺寸无效/)
    expect(() => buildSvg([], 100, -5)).toThrow(/SVG 尺寸无效/)
    expect(() => buildSvg([], NaN, 100)).toThrow(/SVG 尺寸无效/)
  })

  it('组装 viewBox 与每层 path', () => {
    expect(buildSvg([{ color: '#ff0000', d: 'M0,0L1,0L1,1L0,1Z' }], 4, 4)).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 4" width="4" height="4">' +
        '<path fill="#ff0000" d="M0,0L1,0L1,1L0,1Z"/></svg>',
    )
  })

  it('d 为空的层被跳过', () => {
    const svg = buildSvg(
      [
        { color: '#ff0000', d: '' },
        { color: '#00ff00', d: 'M0,0L1,0Z' },
      ],
      2,
      2,
    )
    expect(svg).not.toContain('#ff0000')
    expect(svg).toContain('<path fill="#00ff00" d="M0,0L1,0Z"/>')
  })

  it('无有效层时输出空 svg 骨架', () => {
    expect(buildSvg([], 8, 6)).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 6" width="8" height="6"></svg>',
    )
  })
})

describe('vectorizeImage', () => {
  it('keepBackground=true 保留所有层', () => {
    const px = new Uint8ClampedArray([255, 0, 0, 255, 255, 255, 255, 255])
    const { svg, layerCount, layers } = vectorizeImage(px, 2, 1, {
      colors: 2,
      minArea: 0,
      keepBackground: true,
    })
    expect(layerCount).toBe(2)
    expect(layers.map((l) => l.color)).toEqual(['#ff0000', '#ffffff'])
    expect(svg).toContain('<path fill="#ff0000"')
    expect(svg).toContain('<path fill="#ffffff"')
  })

  it('keepBackground=false 丢弃最浅色层（背景透明）', () => {
    const px = new Uint8ClampedArray([255, 0, 0, 255, 255, 255, 255, 255])
    const { svg, layerCount, layers } = vectorizeImage(px, 2, 1, {
      colors: 2,
      minArea: 0,
      keepBackground: false,
    })
    expect(layerCount).toBe(1)
    expect(layers.map((l) => l.color)).toEqual(['#ff0000'])
    expect(svg).not.toContain('#ffffff')
  })

  it('最浅色判定：亮度并列取首层、非单调序列', () => {
    // 蓝 key=1 亮度 29.07；绿 key=2 亮度 149.69；红 key=4 亮度 76.24 → 丢弃绿色层
    const px = new Uint8ClampedArray([0, 0, 255, 255, 0, 255, 0, 255, 255, 0, 0, 255])
    const { layers, layerCount } = vectorizeImage(px, 3, 1, {
      colors: 2,
      minArea: 0,
      keepBackground: false,
    })
    expect(layers.map((l) => l.color)).toEqual(['#0000ff', '#ff0000'])
    expect(layerCount).toBe(2)
  })

  it('单层且丢弃背景 → 空 svg，layerCount=0', () => {
    const { svg, layerCount, layers } = vectorizeImage(solidRgba(1, 1, 255, 0, 0), 1, 1, {
      colors: 2,
      minArea: 0,
      keepBackground: false,
    })
    expect(layers).toEqual([])
    expect(layerCount).toBe(0)
    expect(svg).not.toContain('<path')
    expect(svg).toContain('viewBox="0 0 1 1"')
  })

  it('minArea 过滤小色块后 layerCount 只计有路径的层', () => {
    // 2x1：红像素面积 1 < 4 被过滤 → d 为空
    const px = new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 0, 255])
    const { layerCount, layers } = vectorizeImage(px, 2, 1, {
      colors: 2,
      minArea: 4,
      keepBackground: true,
    })
    expect(layers).toHaveLength(2)
    expect(layers.every((l) => l.d === '')).toBe(true)
    expect(layerCount).toBe(0)
  })

  it('对象数组输入同样可走完整流程', () => {
    const { layerCount } = vectorizeImage(solidRgb(2, 2, 0, 0, 255), 2, 2, {
      colors: 2,
      minArea: 0,
      keepBackground: true,
    })
    expect(layerCount).toBe(1)
  })
})
