import { describe, expect, it } from 'vitest'
import {
  buildBlobPath,
  buildBlobSvg,
  hashSeed,
  mulberry32,
  parseComplexity,
  parseSmoothness,
  randomHex,
  transform,
} from './utils'
import type { BlobGenOptions } from './schema'

const opts = (o: Partial<Record<string, string>> = {}): BlobGenOptions => ({
  complexity: '5',
  smoothness: '0.5',
  fillColor: '',
  strokeColor: '#333333',
  strokeWidth: '0',
  ...o,
})

describe('blob-gen / parse*', () => {
  it('默认值与合法值', () => {
    expect(parseComplexity('')).toBe(5)
    expect(parseComplexity('8')).toBe(8)
    expect(parseSmoothness('')).toBe(0.5)
    expect(parseSmoothness('0.9')).toBe(0.9)
  })
  it('越界抛错', () => {
    expect(() => parseComplexity('2')).toThrow(/复杂度须在 3–12/)
    expect(() => parseComplexity('13')).toThrow(/复杂度须在 3–12/)
    expect(() => parseSmoothness('2')).toThrow(/平滑度须在 0–1/)
  })
})

describe('blob-gen / buildBlobPath', () => {
  it('输出闭合路径 M ... Z', () => {
    const d = buildBlobPath(5, 200, 200, 150, 0.5, mulberry32(1))
    expect(d.startsWith('M ')).toBe(true)
    expect(d.endsWith(' Z')).toBe(true)
    expect(d).toContain(' Q ')
  })
  it('相同种子 → 相同路径（确定性）', () => {
    const a = buildBlobPath(6, 200, 200, 150, 0.5, mulberry32(42))
    const b = buildBlobPath(6, 200, 200, 150, 0.5, mulberry32(42))
    expect(a).toBe(b)
  })
})

describe('blob-gen / buildBlobSvg', () => {
  it('输出完整 SVG 含 path', () => {
    const out = buildBlobSvg(opts({ fillColor: '#ff0000' }), mulberry32(1))
    expect(out).toContain('<svg')
    expect(out).toContain('<path d="M ')
    expect(out).toContain('fill="#ff0000"')
    expect(out.trim().endsWith('</svg>')).toBe(true)
  })
  it('填充色留空 → 随机合法 hex', () => {
    const out = buildBlobSvg(opts({ fillColor: '' }), mulberry32(7))
    expect(out).toMatch(/fill="#[0-9a-f]{6}"/)
  })
  it('描边宽度越界抛错', () => {
    expect(() => buildBlobSvg(opts({ strokeWidth: '99' }), mulberry32(1))).toThrow(
      /描边宽度须在 0–20/,
    )
  })
  it('非法颜色抛错', () => {
    expect(() => buildBlobSvg(opts({ fillColor: 'red' }), mulberry32(1))).toThrow(/填充色格式非法/)
  })
})

describe('blob-gen / transform & 工具函数', () => {
  it('相同种子文本 → 相同 SVG', () => {
    const a = transform({ text: 'hello' }, opts(), 0)
    const b = transform({ text: 'hello' }, opts(), 0)
    expect(a).toBe(b)
  })
  it('不同种子 → 不同路径', () => {
    const a = transform({ text: 'hello' }, opts(), 0)
    const b = transform({ text: 'world' }, opts(), 0)
    expect(a).not.toBe(b)
  })
  it('hashSeed / randomHex 基线', () => {
    expect(hashSeed('')).toBe(2166136261)
    expect(randomHex(mulberry32(1))).toMatch(/^#[0-9a-f]{6}$/)
  })
})
