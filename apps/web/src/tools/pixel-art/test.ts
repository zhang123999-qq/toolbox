/**
 * pixel-art（#789）utils 单测：像素画。
 */
import { describe, expect, it } from 'vitest'
import {
  PALETTE,
  applyStroke,
  canvasToAscii,
  createCanvas,
  exportPngData,
  fill,
  getPixel,
  mirrorH,
  mirrorV,
  setPixel,
  usedColors,
  validateCanvas,
} from './utils'
import type { CanvasFactory } from './utils'

function mockFactory(): CanvasFactory & {
  calls: Array<{ x: number; y: number; w: number; h: number; color: string }>
} {
  const calls: Array<{ x: number; y: number; w: number; h: number; color: string }> = []
  let color = ''
  return {
    calls,
    create: () => ({
      ctx: {
        set fillStyle(v: string) {
          color = v
        },
        get fillStyle(): string {
          return color
        },
        fillRect(x: number, y: number, w: number, h: number) {
          calls.push({ x, y, w, h, color })
        },
      },
      toDataURL: () => 'data:image/png;base64,MOCK',
    }),
  }
}

describe('createCanvas / validateCanvas', () => {
  it('创建纯色画布', () => {
    const c = createCanvas(4, '#000000')
    expect(c.size).toBe(4)
    expect(c.pixels).toHaveLength(16)
    expect(c.pixels.every((p) => p === '#000000')).toBe(true)
  })
  it('默认白色背景', () => {
    expect(createCanvas(2).pixels[0]).toBe('#ffffff')
  })
  it('非法尺寸报错', () => {
    expect(() => createCanvas(0)).toThrow('正整数')
    expect(() => createCanvas(300)).toThrow('上限 256')
  })
  it('非法背景色报错', () => {
    expect(() => createCanvas(4, 'red')).toThrow('#rrggbb')
  })
  it('画布尺寸非法报错', () => {
    expect(() => validateCanvas({ size: 0, pixels: [] })).toThrow('size')
  })
  it('像素数组长度不符报错', () => {
    expect(() => validateCanvas({ size: 2, pixels: ['#ffffff'] })).toThrow('长度应为 4')
  })
  it('非法颜色值报错', () => {
    expect(() => validateCanvas({ size: 1, pixels: ['red'] })).toThrow('非法颜色值')
  })
  it('非对象报错', () => {
    expect(() => validateCanvas('x' as never)).toThrow('必须是对象')
    expect(() => validateCanvas(null as never)).toThrow('必须是对象')
  })
  it('PALETTE 预设均为合法颜色', () => {
    expect(PALETTE.length).toBeGreaterThan(0)
    for (const c of PALETTE) expect(c).toMatch(/^#[0-9a-fA-F]{6}$/)
  })
})

describe('getPixel / setPixel', () => {
  it('读写像素', () => {
    const c = setPixel(createCanvas(4), 1, 2, '#ff0000')
    expect(getPixel(c, 1, 2)).toBe('#ff0000')
    expect(getPixel(c, 0, 0)).toBe('#ffffff')
  })
  it('setPixel 不可变', () => {
    const c = createCanvas(2)
    setPixel(c, 0, 0, '#ff0000')
    expect(c.pixels[0]).toBe('#ffffff')
  })
  it('越界报错', () => {
    const c = createCanvas(2)
    expect(() => getPixel(c, 2, 0)).toThrow('越界')
    expect(() => setPixel(c, -1, 0, '#ff0000')).toThrow('越界')
  })
  it('非法颜色报错', () => {
    expect(() => setPixel(createCanvas(2), 0, 0, 'red')).toThrow('#rrggbb')
  })
})

describe('applyStroke', () => {
  it('水平直线', () => {
    const c = applyStroke(createCanvas(5), 0, 2, 4, 2, '#000000')
    for (let x = 0; x < 5; x += 1) expect(getPixel(c, x, 2)).toBe('#000000')
    expect(getPixel(c, 0, 0)).toBe('#ffffff')
  })
  it('对角线', () => {
    const c = applyStroke(createCanvas(4), 0, 0, 3, 3, '#000000')
    expect(getPixel(c, 0, 0)).toBe('#000000')
    expect(getPixel(c, 3, 3)).toBe('#000000')
  })
  it('单点', () => {
    const c = applyStroke(createCanvas(3), 1, 1, 1, 1, '#0000ff')
    expect(getPixel(c, 1, 1)).toBe('#0000ff')
  })
  it('越界起点自动裁剪', () => {
    const c = applyStroke(createCanvas(3), -5, 1, 2, 1, '#000000')
    expect(getPixel(c, 0, 1)).toBe('#000000')
    expect(getPixel(c, 2, 1)).toBe('#000000')
  })
  it('非法颜色报错', () => {
    expect(() => applyStroke(createCanvas(2), 0, 0, 1, 1, 'x')).toThrow('#rrggbb')
  })
})

describe('fill', () => {
  it('洪水填充连通区域', () => {
    let c = createCanvas(4)
    c = applyStroke(c, 0, 0, 3, 0, '#000000')
    c = applyStroke(c, 0, 0, 0, 3, '#000000')
    c = applyStroke(c, 3, 0, 3, 3, '#000000')
    c = applyStroke(c, 0, 3, 3, 3, '#000000')
    c = fill(c, 1, 1, '#ff0000')
    expect(getPixel(c, 2, 2)).toBe('#ff0000')
    expect(getPixel(c, 0, 0)).toBe('#000000')
  })
  it('同色填充返回原画布', () => {
    const c = createCanvas(2)
    expect(fill(c, 0, 0, '#ffffff')).toBe(c)
  })
  it('边缘填充覆盖整块画布', () => {
    const c = fill(createCanvas(2), 0, 0, '#ff0000')
    expect(c.pixels.every((p) => p === '#ff0000')).toBe(true)
  })
  it('非法颜色报错', () => {
    expect(() => fill(createCanvas(2), 0, 0, 'red')).toThrow('#rrggbb')
  })
  it('越界报错', () => {
    expect(() => fill(createCanvas(2), 5, 0, '#ff0000')).toThrow('越界')
  })
})

describe('mirrorH / mirrorV', () => {
  it('水平镜像', () => {
    let c = createCanvas(3)
    c = setPixel(c, 0, 1, '#ff0000')
    const m = mirrorH(c)
    expect(getPixel(m, 2, 1)).toBe('#ff0000')
    expect(getPixel(m, 0, 1)).toBe('#ffffff')
  })
  it('垂直镜像', () => {
    let c = createCanvas(3)
    c = setPixel(c, 1, 0, '#00ff00')
    const m = mirrorV(c)
    expect(getPixel(m, 1, 2)).toBe('#00ff00')
  })
})

describe('usedColors', () => {
  it('统计颜色种类', () => {
    let c = createCanvas(2)
    c = setPixel(c, 0, 0, '#ff0000')
    c = setPixel(c, 1, 1, '#ff0000')
    expect(usedColors(c).sort()).toEqual(['#ff0000', '#ffffff'])
  })
})

describe('exportPngData', () => {
  it('调用序列正确并返回 dataURL', () => {
    const f = mockFactory()
    const c = setPixel(createCanvas(2), 0, 0, '#ff0000')
    const url = exportPngData(c, f, 2)
    expect(url).toBe('data:image/png;base64,MOCK')
    expect(f.calls).toHaveLength(4)
    expect(f.calls[0]).toEqual({ x: 0, y: 0, w: 2, h: 2, color: '#ff0000' })
    expect(f.calls[3]).toEqual({ x: 2, y: 2, w: 2, h: 2, color: '#ffffff' })
  })
  it('非法缩放报错', () => {
    expect(() => exportPngData(createCanvas(2), mockFactory(), 0)).toThrow('scale')
  })
})

describe('canvasToAscii', () => {
  it('ASCII 渲染', () => {
    const c = setPixel(createCanvas(2), 0, 0, '#000000')
    expect(canvasToAscii(c)).toBe('█·\n··')
  })
})
