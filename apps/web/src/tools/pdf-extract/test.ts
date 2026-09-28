import { describe, expect, it } from 'vitest'
import {
  MAX_PDF_BYTES,
  MAX_PDF_PAGES,
  checkPdfPageCount,
  combinePages,
  describePdfLoadError,
  extractPageText,
  isPasswordError,
  validatePdfFile,
} from './utils'
import type { PdfFileInfo, PdfTextItem } from './utils'

function fileInfo(partial: Partial<PdfFileInfo>): PdfFileInfo {
  return { name: 'a.pdf', size: 1000, type: 'application/pdf', ...partial }
}

function item(partial: Partial<PdfTextItem>): PdfTextItem {
  return { str: 'x', x: 0, y: 0, hasEOL: false, ...partial }
}

describe('pdf-extract / 文件校验', () => {
  it('合法 PDF 通过', () => {
    expect(() => validatePdfFile(fileInfo({}))).not.toThrow()
    // 仅靠扩展名也认（type 可能为空）
    expect(() => validatePdfFile(fileInfo({ type: '' }))).not.toThrow()
    expect(() => validatePdfFile(fileInfo({ name: 'DOC.PDF', type: '' }))).not.toThrow()
  })

  it('空文件报错', () => {
    expect(() => validatePdfFile(fileInfo({ size: 0 }))).toThrow('文件为空')
  })

  it('超大文件报错并带体积', () => {
    expect(() => validatePdfFile(fileInfo({ size: MAX_PDF_BYTES + 1 }))).toThrow(
      '超过 100 MiB 上限',
    )
  })

  it('非 PDF 报错', () => {
    expect(() => validatePdfFile(fileInfo({ name: 'a.txt', type: 'text/plain' }))).toThrow(
      '请选择 PDF 文件',
    )
  })
})

describe('pdf-extract / 页数校验', () => {
  it('合法页数通过', () => {
    expect(() => checkPdfPageCount(1)).not.toThrow()
    expect(() => checkPdfPageCount(MAX_PDF_PAGES)).not.toThrow()
  })

  it('0 页或非法页数报错', () => {
    expect(() => checkPdfPageCount(0)).toThrow('页数为 0')
    expect(() => checkPdfPageCount(1.5)).toThrow('页数为 0')
  })

  it('超页数报错并带上限', () => {
    expect(() => checkPdfPageCount(MAX_PDF_PAGES + 1)).toThrow('超过 50 页上限')
  })
})

describe('pdf-extract / 错误翻译', () => {
  it('密码错误识别', () => {
    expect(isPasswordError({ name: 'PasswordException' })).toBe(true)
    expect(isPasswordError(new Error('Password required'))).toBe(true)
    expect(isPasswordError(new Error('boom'))).toBe(false)
    expect(isPasswordError(null)).toBe(false)
    expect(isPasswordError('need password')).toBe(true)
  })

  it('密码错误给中文提示', () => {
    expect(describePdfLoadError({ name: 'PasswordException' })).toContain('已加密')
  })

  it('损坏文件给中文提示', () => {
    expect(describePdfLoadError(new Error('Invalid PDF structure'))).toContain('损坏')
    expect(describePdfLoadError(new Error('文件损坏啦'))).toContain('损坏')
  })

  it('其他错误原样透传', () => {
    expect(describePdfLoadError(new Error('boom'))).toBe('PDF 加载失败：boom')
    expect(describePdfLoadError('oops')).toBe('PDF 加载失败：oops')
  })
})

describe('pdf-extract / 单页文本重组', () => {
  it('空项返回空串', () => {
    expect(extractPageText([])).toBe('')
  })

  it('空字符串项被丢弃', () => {
    expect(extractPageText([item({ str: '' }), item({ str: 'hi' })])).toBe('hi')
  })

  it('同一行按 x 排序并用空格连接', () => {
    const text = extractPageText([
      item({ str: 'world', x: 100, y: 700 }),
      item({ str: 'hello', x: 10, y: 700 }),
    ])
    expect(text).toBe('hello world')
  })

  it('y 差超容差换行', () => {
    const text = extractPageText([
      item({ str: 'line1', x: 10, y: 700 }),
      item({ str: 'line2', x: 10, y: 690 }),
    ])
    expect(text).toBe('line1\nline2')
  })

  it('y 差在容差内视为同一行', () => {
    const text = extractPageText([
      item({ str: 'a', x: 10, y: 700 }),
      item({ str: 'b', x: 50, y: 701 }),
    ])
    expect(text).toBe('b a') // 同行按 x 升序
  })

  it('hasEOL 触发换行', () => {
    const text = extractPageText([
      item({ str: 'a', x: 10, y: 700, hasEOL: true }),
      item({ str: 'b', x: 10, y: 700 }),
    ])
    expect(text).toBe('a\nb')
  })

  it('按 y 降序：页上方的行在前', () => {
    const text = extractPageText([
      item({ str: 'bottom', x: 10, y: 100 }),
      item({ str: 'top', x: 10, y: 700 }),
    ])
    expect(text).toBe('top\nbottom')
  })
})

describe('pdf-extract / 多页合并', () => {
  it('0 页返回空串', () => {
    expect(combinePages([])).toBe('')
  })

  it('单页直接返回', () => {
    expect(combinePages(['hello'])).toBe('hello')
  })

  it('多页加分隔', () => {
    expect(combinePages(['a', 'b'])).toBe('--- 第 1 页 ---\na\n\n--- 第 2 页 ---\nb')
  })
})
