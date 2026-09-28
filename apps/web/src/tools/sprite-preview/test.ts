/**
 * sprite-preview（#799）utils 单测：精灵图预览。
 */
import { describe, expect, it } from 'vitest'
import { buildPreviewPlayer, colorForSprite, validateFrames } from './utils'

describe('validateFrames', () => {
  it('合法帧列表通过', () => {
    expect(() => validateFrames(['a', 'b'])).not.toThrow()
  })
  it('空数组报错', () => {
    expect(() => validateFrames([])).toThrow('没有帧可预览')
  })
  it('非数组报错', () => {
    expect(() => validateFrames('a' as never)).toThrow('没有帧可预览')
  })
  it('空 spriteId 报错', () => {
    expect(() => validateFrames(['a', '  '])).toThrow('spriteId 不能为空')
    expect(() => validateFrames([1 as never])).toThrow('spriteId 不能为空')
  })
})

describe('buildPreviewPlayer', () => {
  it('基本属性计算', () => {
    const p = buildPreviewPlayer({ frames: ['a', 'b', 'c', 'd'], fps: 10, loop: true })
    expect(p.frameDurationMs).toBe(100)
    expect(p.totalMs).toBe(400)
    expect(p.isPlaying()).toBe(false)
  })
  it('spriteId 去除空格', () => {
    const p = buildPreviewPlayer({ frames: ['  a '], fps: 10, loop: false })
    expect(p.frames).toEqual(['a'])
  })
  it('frameAt 循环取模', () => {
    const p = buildPreviewPlayer({ frames: ['a', 'b'], fps: 10, loop: true })
    expect(p.frameAt(0)).toBe(0)
    expect(p.frameAt(99)).toBe(0)
    expect(p.frameAt(100)).toBe(1)
    expect(p.frameAt(200)).toBe(0)
    expect(p.frameAt(-10)).toBe(0)
  })
  it('frameAt 非循环钳制末帧', () => {
    const p = buildPreviewPlayer({ frames: ['a', 'b'], fps: 10, loop: false })
    expect(p.frameAt(10000)).toBe(1)
    expect(p.frameAt(199)).toBe(1)
  })
  it('播放状态机', () => {
    const p = buildPreviewPlayer({ frames: ['a', 'b'], fps: 10, loop: true })
    p.play()
    expect(p.isPlaying()).toBe(true)
    p.toggle()
    expect(p.isPlaying()).toBe(false)
    p.toggle()
    expect(p.isPlaying()).toBe(true)
    p.pause()
    expect(p.isPlaying()).toBe(false)
  })
  it('advance 仅播放中推进', () => {
    const p = buildPreviewPlayer({ frames: ['a', 'b', 'c'], fps: 10, loop: true })
    expect(p.advance(150)).toBe(0)
    expect(p.cursorMs()).toBe(0)
    p.play()
    expect(p.advance(150)).toBe(1)
    expect(p.cursorMs()).toBe(150)
    expect(p.advance(-50)).toBe(1)
    p.reset()
    expect(p.cursorMs()).toBe(0)
    expect(p.advance(0)).toBe(0)
  })
  it('非法 fps 报错', () => {
    expect(() => buildPreviewPlayer({ frames: ['a'], fps: 0, loop: true })).toThrow('fps')
    expect(() => buildPreviewPlayer({ frames: ['a'], fps: 121, loop: true })).toThrow('fps')
    expect(() => buildPreviewPlayer({ frames: ['a'], fps: 2.5, loop: true })).toThrow('fps')
  })
  it('空帧报错', () => {
    expect(() => buildPreviewPlayer({ frames: [], fps: 10, loop: true })).toThrow('没有帧可预览')
  })
})

describe('colorForSprite', () => {
  it('稳定且格式正确', () => {
    const c1 = colorForSprite('run1')
    const c2 = colorForSprite('run1')
    expect(c1).toBe(c2)
    expect(c1).toMatch(/^hsl\(\d+, 65%, 55%\)$/)
  })
  it('不同 id 大概率不同颜色', () => {
    const colors = new Set(['a', 'b', 'c', 'd', 'e'].map(colorForSprite))
    expect(colors.size).toBeGreaterThan(1)
  })
  it('空字符串可用', () => {
    expect(colorForSprite('')).toMatch(/^hsl\(0, 65%, 55%\)$/)
  })
})
