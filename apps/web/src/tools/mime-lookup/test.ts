import { describe, expect, it } from 'vitest'
import {
  MimeLookupError,
  findByExt,
  findByMime,
  normalizeExt,
  normalizeMime,
  searchMime,
  tableSize,
  transform,
} from './utils'
import type { MimeLookupInput, MimeLookupOptions } from './schema'

const extMode: MimeLookupOptions = { mode: 'ext2mime', strict: false }
const mimeMode: MimeLookupOptions = { mode: 'mime2ext', strict: false }
const searchMode: MimeLookupOptions = { mode: 'search', strict: false }

describe('mime-lookup / transform', () => {
  it('扩展名查 MIME：一次查多个，带点与大写都能识别', () => {
    const input: MimeLookupInput = { text: 'png\n.svg\nJPG' }
    const out = transform(input, extMode)
    expect(out).toContain('png → image/png')
    expect(out).toContain('svg → image/svg+xml')
    expect(out).toContain('jpg → image/jpeg')
  })

  it('未收录的扩展名给出未收录提示，而不是抛错（边界）', () => {
    const out = transform({ text: 'unknownext' }, extMode)
    expect(out).toContain('未收录')
    expect(out).toContain('application/octet-stream')
  })

  it('严格模式下未命中直接抛 MimeLookupError（异常）', () => {
    expect(() => transform({ text: 'unknownext' }, { ...extMode, strict: true })).toThrow(
      MimeLookupError,
    )
  })

  it('MIME 反查扩展名：同类型多个别名一次列出', () => {
    const out = transform({ text: 'image/jpeg' }, mimeMode)
    expect(out).toContain('image/jpeg → .jpg .jpeg .jpe')
    expect(out).toContain('JPEG 图片')
  })

  it('MIME 带 charset 参数时先剥参数再查', () => {
    expect(normalizeMime('Text/HTML; charset=utf-8')).toBe('text/html')
    expect(transform({ text: 'Text/HTML; charset=utf-8' }, mimeMode)).toContain('.html .htm')
  })

  it('模糊搜索按「完全相等 → 前缀 → 包含」排序', () => {
    const hits = searchMime('js', 10).map((entry) => entry.ext)
    expect(hits[0]).toBe('js')
    expect(hits).toContain('json')
    expect(searchMime('图片', 10).length).toBeGreaterThan(0)
  })

  it('模糊搜索无命中且严格模式时抛错（异常）', () => {
    expect(() => transform({ text: 'zzzzzz' }, { ...searchMode, strict: true })).toThrow(
      MimeLookupError,
    )
  })

  it('空输入返回空字符串（边界）', () => {
    expect(transform({ text: '' }, extMode)).toBe('')
    expect(transform({ text: '  \n \n ' }, searchMode)).toBe('')
  })

  it('超长输入抛出中文上限提示（边界）', () => {
    expect(() => transform({ text: 'a'.repeat(10_001) }, extMode)).toThrow(MimeLookupError)
  })

  it('索引双向自洽：每条记录都能按扩展名与 MIME 互查回来', () => {
    expect(tableSize()).toBeGreaterThan(100)
    expect(findByExt('png')?.mime).toBe('image/png')
    expect(findByMime('image/png').map((entry) => entry.ext)).toContain('png')
    expect(normalizeExt('*.TxT')).toBe('txt')
  })
})
