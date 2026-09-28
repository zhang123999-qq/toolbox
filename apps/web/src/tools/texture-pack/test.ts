/**
 * texture-pack（#787）utils 单测：纹理打包 shelf 装箱。
 */
import { describe, expect, it } from 'vitest'
import {
  exportAtlasJson,
  packRects,
  parsePackInput,
  renderPackResult,
  validatePackInput,
} from './utils'

describe('validatePackInput', () => {
  it('合法输入通过', () => {
    expect(() =>
      validatePackInput(
        [
          { id: 'a', w: 32, h: 32 },
          { id: 'b', w: 16, h: 64 },
        ],
        128,
      ),
    ).not.toThrow()
  })
  it('空列表报错', () => {
    expect(() => validatePackInput([], 128)).toThrow('不能为空')
  })
  it('maxWidth 非法报错', () => {
    expect(() => validatePackInput([{ id: 'a', w: 8, h: 8 }], 0)).toThrow('maxWidth')
    expect(() => validatePackInput([{ id: 'a', w: 8, h: 8 }], 1.5)).toThrow('maxWidth')
  })
  it('id 重复报错', () => {
    expect(() =>
      validatePackInput(
        [
          { id: 'a', w: 8, h: 8 },
          { id: 'a', w: 8, h: 8 },
        ],
        64,
      ),
    ).toThrow('重复')
  })
  it('id 为空报错', () => {
    expect(() => validatePackInput([{ id: '  ', w: 8, h: 8 }], 64)).toThrow('id')
  })
  it('尺寸非法报错', () => {
    expect(() => validatePackInput([{ id: 'a', w: 0, h: 8 }], 64)).toThrow('宽度')
    expect(() => validatePackInput([{ id: 'a', w: 8, h: -1 }], 64)).toThrow('高度')
  })
  it('矩形宽于图集报错', () => {
    expect(() => validatePackInput([{ id: 'wide', w: 200, h: 8 }], 128)).toThrow('超过图集最大宽度')
  })
  it('非对象矩形报错', () => {
    expect(() => validatePackInput(['x' as never], 64)).toThrow('必须是对象')
  })
})

describe('packRects', () => {
  it('单行放置坐标正确', () => {
    const r = packRects(
      [
        { id: 'a', w: 32, h: 32 },
        { id: 'b', w: 16, h: 16 },
      ],
      128,
    )
    expect(r.atlasW).toBe(48)
    expect(r.atlasH).toBe(32)
    expect(r.placements.find((p) => p.id === 'a')).toEqual({ id: 'a', w: 32, h: 32, x: 0, y: 0 })
    expect(r.placements.find((p) => p.id === 'b')).toEqual({ id: 'b', w: 16, h: 16, x: 32, y: 0 })
  })
  it('超宽换行', () => {
    const r = packRects(
      [
        { id: 'a', w: 80, h: 40 },
        { id: 'b', w: 80, h: 20 },
      ],
      100,
    )
    expect(r.placements.find((p) => p.id === 'a')?.y).toBe(0)
    expect(r.placements.find((p) => p.id === 'b')?.y).toBe(40)
    expect(r.atlasH).toBe(60)
  })
  it('按高度降序优先排列', () => {
    const r = packRects(
      [
        { id: 'short', w: 10, h: 10 },
        { id: 'tall', w: 10, h: 50 },
      ],
      100,
    )
    expect(r.placements[0].id).toBe('tall')
  })
  it('等高时按宽度降序', () => {
    const r = packRects(
      [
        { id: 'narrow', w: 10, h: 20 },
        { id: 'wide', w: 30, h: 20 },
      ],
      100,
    )
    expect(r.placements[0].id).toBe('wide')
    expect(r.placements[1]).toMatchObject({ id: 'narrow', x: 30, y: 0 })
  })
  it('利用率计算正确', () => {
    const r = packRects([{ id: 'a', w: 50, h: 50 }], 100)
    expect(r.utilization).toBeCloseTo(1)
  })
  it('结果确定性', () => {
    const input = [
      { id: 'a', w: 30, h: 20 },
      { id: 'b', w: 10, h: 60 },
      { id: 'c', w: 40, h: 40 },
    ]
    expect(packRects(input, 64)).toEqual(packRects(input, 64))
  })
  it('非法输入透传校验错误', () => {
    expect(() => packRects([], 64)).toThrow('不能为空')
  })
})

describe('exportAtlasJson', () => {
  it('导出包含 meta 与 frames', () => {
    const r = packRects([{ id: 'hero', w: 32, h: 32 }], 64)
    const json = JSON.parse(exportAtlasJson(r))
    expect(json.meta.size).toEqual({ w: 32, h: 32 })
    expect(json.frames.hero).toEqual({ x: 0, y: 0, w: 32, h: 32 })
  })
})

describe('parsePackInput', () => {
  it('解析合法 JSON', () => {
    const { rects, maxWidth } = parsePackInput('{"rects":[{"id":"a","w":8,"h":8}],"maxWidth":64}')
    expect(rects).toHaveLength(1)
    expect(maxWidth).toBe(64)
  })
  it('非法 JSON 报错', () => {
    expect(() => parsePackInput('not json')).toThrow('合法 JSON')
  })
  it('数组输入报错', () => {
    expect(() => parsePackInput('[1,2]')).toThrow('JSON 对象')
  })
  it('校验失败透传', () => {
    expect(() => parsePackInput('{"rects":[],"maxWidth":64}')).toThrow('不能为空')
  })
})

describe('renderPackResult', () => {
  it('输出摘要文本', () => {
    const r = packRects([{ id: 'a', w: 32, h: 32 }], 64)
    const text = renderPackResult(r)
    expect(text).toContain('图集尺寸：32×32')
    expect(text).toContain('a: x=0, y=0, w=32, h=32')
    expect(text).toContain('利用率 100.0%')
  })
})
