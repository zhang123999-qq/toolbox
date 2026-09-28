/**
 * word-to-html 单元测试
 *
 * utils.ts 只放纯函数；mammoth 的动态加载与转换编排在 Tool.tsx，
 * 由 Tool.test.tsx（jsdom，真机转换）覆盖。
 */
import { describe, expect, it } from 'vitest'
import {
  MAX_FILE_BYTES,
  assertDocxFile,
  assertNonEmptyHtml,
  exactBuffer,
  formatSize,
  stripImageTags,
} from './utils'

describe('word-to-html / 基础工具', () => {
  it('formatSize 覆盖 B / KiB / MiB / GiB', () => {
    expect(formatSize(0)).toBe('0 B')
    expect(formatSize(512)).toBe('512 B')
    expect(formatSize(1023)).toBe('1023 B')
    expect(formatSize(1024)).toBe('1.00 KiB')
    expect(formatSize(1536)).toBe('1.50 KiB')
    expect(formatSize(5 * 1024 * 1024)).toBe('5.00 MiB')
    expect(formatSize(3 * 1024 * 1024 * 1024)).toBe('3.00 GiB')
  })

  it('assertDocxFile 放行合法文件（含大写扩展名与上限边界）', () => {
    expect(() => assertDocxFile({ name: 'a.docx', size: 100 })).not.toThrow()
    expect(() => assertDocxFile({ name: 'A.DOCX', size: MAX_FILE_BYTES })).not.toThrow()
  })

  it('assertDocxFile 拒绝非 docx / 空文件 / 超大文件', () => {
    expect(() => assertDocxFile({ name: 'a.pdf', size: 100 })).toThrow(/请选择 \.docx 文件/)
    expect(() => assertDocxFile({ name: '', size: 100 })).toThrow(/未知/)
    expect(() => assertDocxFile({ name: 'a.docx', size: 0 })).toThrow(/文件为空/)
    expect(() => assertDocxFile({ name: 'a.docx', size: MAX_FILE_BYTES + 1 })).toThrow(/文件过大/)
  })

  it('stripImageTags 去掉 img 标签（大小写不敏感）', () => {
    expect(stripImageTags('<p>a</p><img src="x"><p>b</p>')).toBe('<p>a</p><p>b</p>')
    expect(stripImageTags('<IMG SRC="x"/>')).toBe('')
    expect(stripImageTags('<p>无图</p>')).toBe('<p>无图</p>')
  })

  it('exactBuffer 切出与视图等长的精确 ArrayBuffer', () => {
    const big = new Uint8Array([9, 1, 2, 3, 4, 9])
    const view = big.subarray(1, 5)
    const buf = exactBuffer(view)
    expect(buf.byteLength).toBe(4)
    expect(Array.from(new Uint8Array(buf))).toEqual([1, 2, 3, 4])
    // byteOffset 为 0 的视图同样可用
    const plain = new Uint8Array([7, 8])
    expect(new Uint8Array(exactBuffer(plain))).toEqual(plain)
  })

  it('assertNonEmptyHtml 空白即报错', () => {
    expect(() => assertNonEmptyHtml('  \n ')).toThrow(/没有可转换的内容/)
    expect(() => assertNonEmptyHtml('')).toThrow(/没有可转换的内容/)
    expect(() => assertNonEmptyHtml('<p>x</p>')).not.toThrow()
  })
})
