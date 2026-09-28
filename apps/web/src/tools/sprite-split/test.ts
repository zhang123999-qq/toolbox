/**
 * sprite-split（#786）utils 单测：精灵图切割计算。
 */
import { describe, expect, it, vi } from 'vitest'
import {
  computeFrames,
  drawFrame,
  parseSpriteParams,
  renderFrames,
  validateSpriteParams,
} from './utils'

describe('validateSpriteParams', () => {
  it('合法参数通过', () => {
    expect(() => validateSpriteParams({ imgW: 256, imgH: 128, cols: 4, rows: 2 })).not.toThrow()
    expect(() =>
      validateSpriteParams({ imgW: 256, imgH: 128, cols: 4, rows: 2, margin: 8, spacing: 4 }),
    ).not.toThrow()
  })
  it('尺寸与行列必须为正整数', () => {
    expect(() => validateSpriteParams({ imgW: 0, imgH: 128, cols: 4, rows: 2 })).toThrow('imgW')
    expect(() => validateSpriteParams({ imgW: 256, imgH: -1, cols: 4, rows: 2 })).toThrow('imgH')
    expect(() => validateSpriteParams({ imgW: 256, imgH: 128, cols: 1.5, rows: 2 })).toThrow('cols')
    expect(() => validateSpriteParams({ imgW: 256, imgH: 128, cols: 4, rows: '2' as never })).toThrow('rows')
  })
  it('边距与间距必须为非负整数', () => {
    expect(() =>
      validateSpriteParams({ imgW: 256, imgH: 128, cols: 4, rows: 2, margin: -1 }),
    ).toThrow('margin')
    expect(() =>
      validateSpriteParams({ imgW: 256, imgH: 128, cols: 4, rows: 2, spacing: 1.5 }),
    ).toThrow('spacing')
  })
  it('外边距过大报错', () => {
    expect(() =>
      validateSpriteParams({ imgW: 100, imgH: 100, cols: 2, rows: 2, margin: 50 }),
    ).toThrow('宽度')
    expect(() =>
      validateSpriteParams({ imgW: 200, imgH: 100, cols: 2, rows: 2, margin: 50 }),
    ).toThrow('高度')
  })
  it('帧尺寸为零或负数报错', () => {
    expect(() =>
      validateSpriteParams({ imgW: 100, imgH: 100, cols: 4, rows: 2, spacing: 40 }),
    ).toThrow('为 0 或负数')
  })
  it('无法整除报错', () => {
    expect(() => validateSpriteParams({ imgW: 100, imgH: 100, cols: 3, rows: 2 })).toThrow('无法被行列整除')
  })
})

describe('computeFrames', () => {
  it('无边距间距时帧坐标正确', () => {
    const frames = computeFrames({ imgW: 256, imgH: 128, cols: 4, rows: 2 })
    expect(frames).toHaveLength(8)
    expect(frames[0]).toEqual({ index: 0, x: 0, y: 0, w: 64, h: 64 })
    expect(frames[5]).toEqual({ index: 5, x: 64, y: 64, w: 64, h: 64 })
    expect(frames[7]).toEqual({ index: 7, x: 192, y: 64, w: 64, h: 64 })
  })
  it('含边距与间距时帧坐标正确', () => {
    const frames = computeFrames({ imgW: 276, imgH: 148, cols: 4, rows: 2, margin: 10, spacing: 4 })
    expect(frames).toHaveLength(8)
    expect(frames[0]).toEqual({ index: 0, x: 10, y: 10, w: 61, h: 62 })
    expect(frames[1]).toEqual({ index: 1, x: 75, y: 10, w: 61, h: 62 })
    expect(frames[4]).toEqual({ index: 4, x: 10, y: 76, w: 61, h: 62 })
  })
  it('非法参数直接抛出', () => {
    expect(() => computeFrames({ imgW: 100, imgH: 100, cols: 3, rows: 2 })).toThrow('无法被行列整除')
  })
})

describe('drawFrame', () => {
  it('按帧区域调用 drawImage', () => {
    const ctx = { drawImage: vi.fn() }
    drawFrame(ctx, { fake: true }, { index: 2, x: 64, y: 0, w: 64, h: 64 }, 10, 20, 2)
    expect(ctx.drawImage).toHaveBeenCalledWith({ fake: true }, 64, 0, 64, 64, 10, 20, 128, 128)
  })
  it('默认缩放为 1', () => {
    const ctx = { drawImage: vi.fn() }
    drawFrame(ctx, null, { index: 0, x: 0, y: 0, w: 32, h: 32 }, 0, 0)
    expect(ctx.drawImage).toHaveBeenCalledWith(null, 0, 0, 32, 32, 0, 0, 32, 32)
  })
  it('非正缩放报错', () => {
    const ctx = { drawImage: vi.fn() }
    expect(() =>
      drawFrame(ctx, null, { index: 0, x: 0, y: 0, w: 32, h: 32 }, 0, 0, 0),
    ).toThrow('scale')
  })
})

describe('parseSpriteParams', () => {
  it('解析合法输入', () => {
    expect(parseSpriteParams('{"imgW":256,"imgH":128,"cols":4,"rows":2}')).toEqual({
      imgW: 256,
      imgH: 128,
      cols: 4,
      rows: 2,
      margin: undefined,
      spacing: undefined,
    })
  })
  it('非法 JSON / 非对象报错', () => {
    expect(() => parseSpriteParams('{bad')).toThrow('不是合法 JSON')
    expect(() => parseSpriteParams('[]')).toThrow('必须是 JSON 对象')
  })
  it('缺失字段时由校验报错', () => {
    expect(() => parseSpriteParams('{}')).toThrow('imgW')
  })
})

describe('renderFrames', () => {
  it('渲染帧列表文本', () => {
    const out = renderFrames(computeFrames({ imgW: 64, imgH: 32, cols: 2, rows: 1 }))
    expect(out).toContain('共 2 帧')
    expect(out).toContain('#0: x=0, y=0, w=32, h=32')
    expect(out).toContain('#1: x=32, y=0, w=32, h=32')
  })
})
