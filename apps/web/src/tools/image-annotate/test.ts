import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FONT_SIZE,
  DEFAULT_LINE_WIDTH,
  HISTORY_LIMIT,
  MAX_FILE_SIZE,
  assertFileSizeOk,
  buildOutputFileName,
  errorMessage,
  getArrowHead,
  historyPop,
  historyPush,
  mouseToCanvas,
  parseColor,
  parseFontSize,
  parseLineWidth,
  pixelateRegion,
} from './utils'

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
  })
})

describe('parseLineWidth', () => {
  it('空串用默认 4', () => {
    expect(parseLineWidth('')).toBe(DEFAULT_LINE_WIDTH)
    expect(parseLineWidth('   ')).toBe(DEFAULT_LINE_WIDTH)
  })

  it('正常解析边界值', () => {
    expect(parseLineWidth('1')).toBe(1)
    expect(parseLineWidth('4')).toBe(4)
    expect(parseLineWidth('50')).toBe(50)
    expect(parseLineWidth(' 12 ')).toBe(12)
  })

  it('非法抛错', () => {
    expect(() => parseLineWidth('abc')).toThrow(/线宽无效/)
    expect(() => parseLineWidth('4.5')).toThrow(/线宽无效/)
    expect(() => parseLineWidth('0')).toThrow(/线宽超出范围/)
    expect(() => parseLineWidth('51')).toThrow(/线宽超出范围/)
  })
})

describe('parseFontSize', () => {
  it('空串用默认 32', () => {
    expect(parseFontSize('')).toBe(DEFAULT_FONT_SIZE)
  })

  it('正常解析边界值', () => {
    expect(parseFontSize('12')).toBe(12)
    expect(parseFontSize('32')).toBe(32)
    expect(parseFontSize('120')).toBe(120)
  })

  it('非法抛错', () => {
    expect(() => parseFontSize('大')).toThrow(/字号无效/)
    expect(() => parseFontSize('11')).toThrow(/字号超出范围/)
    expect(() => parseFontSize('121')).toThrow(/字号超出范围/)
  })
})

describe('parseColor', () => {
  it('#rrggbb 归一化为小写', () => {
    expect(parseColor('#ff0000')).toBe('#ff0000')
    expect(parseColor('#FF0000')).toBe('#ff0000')
    expect(parseColor('  #00aaff  ')).toBe('#00aaff')
  })

  it('#rgb 展开为 #rrggbb', () => {
    expect(parseColor('#f00')).toBe('#ff0000')
    expect(parseColor('#F00')).toBe('#ff0000')
    expect(parseColor('#abc')).toBe('#aabbcc')
  })

  it('非法抛错', () => {
    expect(() => parseColor('red')).toThrow(/颜色无效/)
    expect(() => parseColor('#ff000')).toThrow(/颜色无效/)
    expect(() => parseColor('#ff00000')).toThrow(/颜色无效/)
    expect(() => parseColor('')).toThrow(/颜色无效/)
    expect(() => parseColor('#gggggg')).toThrow(/颜色无效/)
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

describe('getArrowHead', () => {
  it('水平箭头（默认 30° 夹角）', () => {
    // tip(10,0)，tail(0,0)，翼长 8：along=8cos30≈6.928，across=8sin30=4
    const h = getArrowHead(10, 0, 0, 0, 8)
    expect(h.p1x).toBeCloseTo(10 - 6.9282, 3)
    expect(h.p1y).toBeCloseTo(-4, 3)
    expect(h.p2x).toBeCloseTo(10 - 6.9282, 3)
    expect(h.p2y).toBeCloseTo(4, 3)
  })

  it('垂直箭头', () => {
    const h = getArrowHead(0, 10, 0, 0, 8)
    expect(h.p1x).toBeCloseTo(4, 3)
    expect(h.p1y).toBeCloseTo(10 - 6.9282, 3)
    expect(h.p2x).toBeCloseTo(-4, 3)
    expect(h.p2y).toBeCloseTo(10 - 6.9282, 3)
  })

  it('对角箭头显式 45° 夹角', () => {
    // tip(10,10)，tail(0,0)，翼长 10，夹角 45°：两翼恰为 (10,0) 与 (0,10)
    const h = getArrowHead(10, 10, 0, 0, 10, 45)
    expect(h.p1x).toBeCloseTo(10, 9)
    expect(h.p1y).toBeCloseTo(0, 9)
    expect(h.p2x).toBeCloseTo(0, 9)
    expect(h.p2y).toBeCloseTo(10, 9)
  })

  it('反向箭头对称', () => {
    const fwd = getArrowHead(10, 0, 0, 0, 8)
    const back = getArrowHead(0, 0, 10, 0, 8)
    expect(back.p1x).toBeCloseTo(10 - fwd.p1x, 9)
    expect(back.p2x).toBeCloseTo(10 - fwd.p2x, 9)
  })

  it('起点终点重合抛错', () => {
    expect(() => getArrowHead(5, 5, 5, 5, 8)).toThrow(/箭头方向无效/)
  })

  it('翼长非法抛错', () => {
    expect(() => getArrowHead(10, 0, 0, 0, 0)).toThrow(/长度须为正数/)
    expect(() => getArrowHead(10, 0, 0, 0, -2)).toThrow(/长度须为正数/)
    expect(() => getArrowHead(10, 0, 0, 0, NaN)).toThrow(/长度须为正数/)
  })

  it('夹角非法抛错', () => {
    expect(() => getArrowHead(10, 0, 0, 0, 8, 0)).toThrow(/角度/)
    expect(() => getArrowHead(10, 0, 0, 0, 8, 90)).toThrow(/角度/)
    expect(() => getArrowHead(10, 0, 0, 0, 8, -10)).toThrow(/角度/)
    expect(() => getArrowHead(10, 0, 0, 0, 8, 120)).toThrow(/角度/)
  })
})

describe('pixelateRegion', () => {
  /** 构造 4×2 测试图：左半亮度低、右半亮度高，便于断言块填充 */
  function makeImage(): Uint8ClampedArray {
    const px: Uint8ClampedArray = new Uint8ClampedArray(4 * 2 * 4)
    const rows = [
      [10, 11, 40, 41],
      [12, 13, 42, 43],
    ]
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 4; x++) {
        const v = rows[y][x]
        const i = (y * 4 + x) * 4
        px[i] = v
        px[i + 1] = v + 10
        px[i + 2] = v + 20
        px[i + 3] = 255
      }
    }
    return px
  }

  it('blockSize=1 等价于复制（新数组）', () => {
    const src = makeImage()
    const out = pixelateRegion(src, 4, 2, 1)
    expect(out).not.toBe(src)
    expect(out).toEqual(src)
  })

  it('blockSize=2 按块取左上角填充', () => {
    const out = pixelateRegion(makeImage(), 4, 2, 2)
    // 左块 (0..1, 0..1) 全填 (10,20,30,255)
    for (const [x, y] of [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ]) {
      const i = (y * 4 + x) * 4
      expect([out[i], out[i + 1], out[i + 2], out[i + 3]]).toEqual([10, 20, 30, 255])
    }
    // 右块 (2..3, 0..1) 全填 (40,50,60,255)
    for (const [x, y] of [
      [2, 0],
      [3, 1],
    ]) {
      const i = (y * 4 + x) * 4
      expect([out[i], out[i + 1], out[i + 2], out[i + 3]]).toEqual([40, 50, 60, 255])
    }
  })

  it('块大于整图时整块填充', () => {
    const out = pixelateRegion(makeImage(), 4, 2, 10)
    for (let i = 0; i < out.length; i += 4) {
      expect([out[i], out[i + 1], out[i + 2], out[i + 3]]).toEqual([10, 20, 30, 255])
    }
  })

  it('非整除尺寸的边缘块正确裁剪', () => {
    // 3×3，块 2：右下角 (2,2) 自成 1×1 块，保持原值
    const src: Uint8ClampedArray = new Uint8ClampedArray(3 * 3 * 4)
    for (let i = 0; i < 3 * 3; i++) {
      src[i * 4] = i
      src[i * 4 + 1] = i + 1
      src[i * 4 + 2] = i + 2
      src[i * 4 + 3] = 255
    }
    const out = pixelateRegion(src, 3, 3, 2)
    // 左上 2×2 块全填像素 0 的值
    expect([out[0], out[1], out[2], out[3]]).toEqual([0, 1, 2, 255])
    expect([out[4], out[5], out[6], out[7]]).toEqual([0, 1, 2, 255])
    // 右下角 (2,2) 即像素 8，保持原值
    const c = 8 * 4
    expect([out[c], out[c + 1], out[c + 2], out[c + 3]]).toEqual([8, 9, 10, 255])
  })

  it('不修改入参数组', () => {
    const src = makeImage()
    const before = src.slice()
    pixelateRegion(src, 4, 2, 2)
    expect(src).toEqual(before)
  })

  it('非法参数抛错', () => {
    const src = makeImage()
    expect(() => pixelateRegion(src, 0, 2, 2)).toThrow(/宽度无效/)
    expect(() => pixelateRegion(src, 1.5, 2, 2)).toThrow(/宽度无效/)
    expect(() => pixelateRegion(src, 4, -1, 2)).toThrow(/高度无效/)
    expect(() => pixelateRegion(src, 4, 2, 0)).toThrow(/块大小无效/)
    expect(() => pixelateRegion(src, 4, 2, 2.5)).toThrow(/块大小无效/)
    expect(() => pixelateRegion(src.slice(0, 8), 4, 2, 2)).toThrow(/长度与宽高不匹配/)
  })
})

describe('historyPush / historyPop', () => {
  it('入栈返回新数组，不修改原栈', () => {
    const stack = ['a']
    const next = historyPush(stack, 'b', HISTORY_LIMIT)
    expect(next).toEqual(['a', 'b'])
    expect(next).not.toBe(stack)
    expect(stack).toEqual(['a'])
  })

  it('超限丢弃最旧快照', () => {
    expect(historyPush(['a', 'b'], 'c', 2)).toEqual(['b', 'c'])
    expect(historyPush(['a', 'b', 'c'], 'd', 2)).toEqual(['c', 'd'])
  })

  it('出栈返回新栈与栈顶', () => {
    const { stack, top } = historyPop(['a', 'b'])
    expect(stack).toEqual(['a'])
    expect(top).toBe('b')
  })

  it('空栈出栈 top 为 undefined', () => {
    const { stack, top } = historyPop([])
    expect(stack).toEqual([])
    expect(top).toBeUndefined()
  })
})

describe('buildOutputFileName', () => {
  it('去扩展名加 -annotated.png', () => {
    expect(buildOutputFileName('photo.jpg')).toBe('photo-annotated.png')
    expect(buildOutputFileName('a.b.c.png')).toBe('a.b.c-annotated.png')
    expect(buildOutputFileName('noext')).toBe('noext-annotated.png')
  })

  it('空名兜底为 image', () => {
    expect(buildOutputFileName('')).toBe('image-annotated.png')
  })
})

describe('mouseToCanvas', () => {
  it('默认 scale=1 时平移坐标', () => {
    expect(mouseToCanvas(110, 65, 10, 5)).toEqual({ x: 100, y: 60 })
  })

  it('显式 scale 缩放', () => {
    expect(mouseToCanvas(110, 65, 10, 5, 2, 0.5)).toEqual({ x: 200, y: 30 })
  })
})
