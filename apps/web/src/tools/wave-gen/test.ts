import { describe, expect, it } from 'vitest'
import {
  buildWavePath,
  buildWaveSvg,
  hashSeed,
  hexToRgb,
  lerpColor,
  mulberry32,
  parseAmplitude,
  parseFrequency,
  parseHex,
  parseLayers,
  transform,
} from './utils'
import type { WaveGenOptions } from './schema'

const opts = (o: Partial<WaveGenOptions> = {}): WaveGenOptions => ({
  amplitude: '50',
  frequency: '2',
  layers: '3',
  color1: '#3b82f6',
  color2: '#8b5cf6',
  ...o,
})

describe('wave-gen / parse*', () => {
  it('默认值与合法值', () => {
    expect(parseAmplitude('')).toBe(50)
    expect(parseAmplitude('80')).toBe(80)
    expect(parseFrequency('')).toBe(2)
    expect(parseFrequency('5')).toBe(5)
    expect(parseLayers('')).toBe(3)
    expect(parseLayers('4')).toBe(4)
  })
  it('越界抛中文错', () => {
    expect(() => parseAmplitude('5')).toThrow(/振幅须在 10–150/)
    expect(() => parseAmplitude('200')).toThrow(/振幅须在 10–150/)
    expect(() => parseFrequency('0')).toThrow(/频率须在 1–10/)
    expect(() => parseFrequency('11')).toThrow(/频率须在 1–10/)
    expect(() => parseLayers('0')).toThrow(/层数须在 1–6/)
    expect(() => parseLayers('7')).toThrow(/层数须在 1–6/)
  })
  it('非数字抛错', () => {
    expect(() => parseAmplitude('abc')).toThrow(/振幅格式非法/)
    expect(() => parseLayers('3.5')).toThrow(/层数格式非法/)
  })
})

describe('wave-gen / parseHex & 颜色插值', () => {
  it('合法 hex 归一化小写', () => {
    expect(parseHex('#FF0000', '色')).toBe('#ff0000')
    expect(parseHex('#f80', '色')).toBe('#ff8800')
  })
  it('非法 hex 抛错', () => {
    expect(() => parseHex('red', '色')).toThrow(/色格式非法/)
    expect(() => parseHex('', '色')).toThrow(/色不能为空/)
  })
  it('lerpColor 端点与中点', () => {
    expect(lerpColor('#000000', '#ffffff', 0)).toBe('#000000')
    expect(lerpColor('#000000', '#ffffff', 1)).toBe('#ffffff')
    expect(hexToRgb(lerpColor('#000000', '#ffffff', 0.5))[0]).toBe(128)
  })
})

describe('wave-gen / buildWavePath', () => {
  it('输出路径从 M 开始并闭合到 Z', () => {
    const d = buildWavePath(800, 400, 50, 2, 0, 200)
    expect(d.startsWith('M 0 ')).toBe(true)
    expect(d.endsWith('Z')).toBe(true)
    expect(d).toContain(' L ')
  })
})

describe('wave-gen / buildWaveSvg', () => {
  it('输出完整 SVG 含指定层数 path', () => {
    const out = buildWaveSvg(opts({ layers: '4' }), mulberry32(1))
    expect(out).toContain('<svg')
    expect(out).toContain('fill-opacity="0.45"')
    expect((out.match(/<path/g) ?? []).length).toBe(4)
    expect(out.trim().endsWith('</svg>')).toBe(true)
  })
  it('非法颜色抛错', () => {
    expect(() => buildWaveSvg(opts({ color1: 'red' }), mulberry32(1))).toThrow(/起始色格式非法/)
  })
  it('振幅越界抛错', () => {
    expect(() => buildWaveSvg(opts({ amplitude: '999' }), mulberry32(1))).toThrow(/振幅须在 10–150/)
  })
})

describe('wave-gen / transform', () => {
  it('相同种子 → 相同 SVG（确定性）', () => {
    const a = transform({ text: 'hello' }, opts())
    const b = transform({ text: 'hello' }, opts())
    expect(a).toBe(b)
  })
  it('不同种子 → 不同 path 坐标', () => {
    const a = transform({ text: 'hello' }, opts())
    const b = transform({ text: 'world' }, opts())
    expect(a).not.toBe(b)
  })
  it('hashSeed 基线', () => {
    expect(hashSeed('')).toBe(2166136261)
  })
})
