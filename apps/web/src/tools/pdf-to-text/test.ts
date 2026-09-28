import { describe, expect, it } from 'vitest'
import {
  MAX_FILE_SIZE,
  PAGE_BREAK,
  assertFileSizeOk,
  buildOutputFileName,
  errorMessage,
  extractPageText,
  isPasswordPdfError,
  isPdfFile,
  joinPageTexts,
} from './utils'
import type { PdfTextContentItem, PdfTextItem } from './utils'

/** 构造文本项：transform 为 [a,b,c,d,x,y]，默认 x=0、y=100、宽 10 */
function item(
  str: string,
  opts: { x?: number; y?: number; width?: number; hasEOL?: boolean; transform?: unknown } = {},
): PdfTextItem {
  const { x = 0, y = 100, width = 10, hasEOL = false, transform } = opts
  return {
    str,
    hasEOL,
    transform: transform === undefined ? [1, 0, 0, 1, x, y] : transform,
    width,
  }
}

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
    expect(errorMessage(undefined)).toBe('undefined')
  })
})

describe('isPdfFile', () => {
  const head = [0x25, 0x50, 0x44, 0x46, 0x2d]

  it('合法魔数返回 true', () => {
    expect(isPdfFile(new Uint8Array([...head, 0x31]))).toBe(true)
  })

  it('长度不足 5 返回 false', () => {
    expect(isPdfFile(new Uint8Array([0x25, 0x50]))).toBe(false)
    expect(isPdfFile(new Uint8Array(0))).toBe(false)
  })

  it('逐字节不匹配返回 false', () => {
    for (let i = 0; i < 5; i++) {
      const bytes = new Uint8Array(head)
      bytes[i] = 0x00
      expect(isPdfFile(bytes)).toBe(false)
    }
  })
})

describe('assertFileSizeOk', () => {
  it('未超限不抛错', () => {
    expect(() => assertFileSizeOk(MAX_FILE_SIZE)).not.toThrow()
    expect(() => assertFileSizeOk(0)).not.toThrow()
  })

  it('超限抛错', () => {
    expect(() => assertFileSizeOk(MAX_FILE_SIZE + 1)).toThrow(/文件过大/)
  })
})

describe('isPasswordPdfError', () => {
  it('name 为 PasswordException 的 Error 返回 true', () => {
    const err = new Error('No password given')
    err.name = 'PasswordException'
    expect(isPasswordPdfError(err)).toBe(true)
  })

  it('普通 Error 返回 false', () => {
    expect(isPasswordPdfError(new Error('boom'))).toBe(false)
  })

  it('非 Error 返回 false', () => {
    expect(isPasswordPdfError('PasswordException')).toBe(false)
    expect(isPasswordPdfError(null)).toBe(false)
  })
})

describe('extractPageText', () => {
  it('空数组返回空串', () => {
    expect(extractPageText([])).toBe('')
  })

  it('跳过 TextMarkedContent 标记项', () => {
    const items: PdfTextContentItem[] = [{ type: 'begin' }, item('hi'), { type: 'end' }]
    expect(extractPageText(items)).toBe('hi')
  })

  it('仅标记项时返回空串', () => {
    expect(extractPageText([{ type: 'begin' }])).toBe('')
  })

  it('同行项按 x 间隙补空格', () => {
    // "Hello" 宽 30 止于 x=30，"World" 起于 x=40，间隙 10 > 1 补空格
    const items = [item('Hello', { x: 0, width: 30 }), item('World', { x: 40, width: 30 })]
    expect(extractPageText(items)).toBe('Hello World')
  })

  it('紧排字形片段不补空格', () => {
    // "hel" 宽 15 止于 x=15，"lo" 起于 x=15，间隙 0 不补
    const items = [item('hel', { x: 0, width: 15 }), item('lo', { x: 15, width: 10 })]
    expect(extractPageText(items)).toBe('hello')
  })

  it('已有空白字符时不重复补空格', () => {
    expect(extractPageText([item('a ', { width: 10 }), item('b', { x: 50 })])).toBe('a b')
    expect(extractPageText([item('a', { width: 10 }), item(' b', { x: 50 })])).toBe('a b')
  })

  it('hasEOL 强制换行', () => {
    const items = [item('line1', { hasEOL: true }), item('line2')]
    expect(extractPageText(items)).toBe('line1\nline2')
  })

  it('y 坐标变化超过容差换行', () => {
    const items = [item('上', { y: 100 }), item('下', { y: 80 })]
    expect(extractPageText(items)).toBe('上\n下')
  })

  it('y 坐标在容差内视为同行', () => {
    const items = [item('a', { y: 100, width: 10 }), item('b', { y: 100.5, x: 11, width: 10 })]
    expect(extractPageText(items)).toBe('ab')
  })

  it('空串项跳过但保留其 hasEOL 换行语义', () => {
    const items = [item('a', { hasEOL: true }), item('', { hasEOL: false }), item('b')]
    expect(extractPageText(items)).toBe('a\nb')
  })

  it('行尾空白被裁掉', () => {
    expect(extractPageText([item('solo  ')])).toBe('solo')
    expect(extractPageText([item('a', { hasEOL: true }), item('b  ')])).toBe('a\nb')
  })

  it('transform 缺失/异常时兜底为 0 不崩溃', () => {
    const noTransform: PdfTextItem = { str: 'x', hasEOL: false }
    const badTransform = item('y', { transform: 'oops' })
    const badY = item('z', { transform: [1, 0, 0, 1, 0, 'nan'] })
    const badWidth = item('w', { transform: [1, 0, 0, 1, 0, 100], width: NaN })
    const infWidth = item('v', { transform: [1, 0, 0, 1, 0, 100], width: Infinity })
    expect(extractPageText([noTransform])).toBe('x')
    // transform 异常 → x/y 均为 0，同行拼接（间隙 0 不补空格）
    expect(extractPageText([badTransform, badY])).toBe('yz')
    expect(extractPageText([badWidth, infWidth])).toBe('wv')
  })

  it('多行混合：EOL 与 y 分行同时生效', () => {
    const items = [
      item('第一行', { y: 200, hasEOL: true }),
      item('第二行a', { y: 180, width: 30 }),
      item('第二行b', { y: 180, x: 31, width: 30 }),
      item('第三行', { y: 160 }),
    ]
    expect(extractPageText(items)).toBe('第一行\n第二行a第二行b\n第三行')
  })
})

describe('joinPageTexts', () => {
  it('PAGE_BREAK 为换页符', () => {
    expect(PAGE_BREAK).toBe('\f')
  })

  it('空数组返回空串', () => {
    expect(joinPageTexts([])).toBe('')
  })

  it('多页以分页符连接', () => {
    expect(joinPageTexts(['a', 'b', 'c'])).toBe('a\fb\fc')
  })

  it('空页保留为空（不崩溃）', () => {
    expect(joinPageTexts(['a', '', 'c'])).toBe('a\f\fc')
  })
})

describe('buildOutputFileName', () => {
  it('替换扩展名并加 -text 后缀', () => {
    expect(buildOutputFileName('report.pdf')).toBe('report-text.txt')
    expect(buildOutputFileName('a.PDF')).toBe('a-text.txt')
  })

  it('无扩展名直接拼接', () => {
    expect(buildOutputFileName('noext')).toBe('noext-text.txt')
  })

  it('空名兜底为 document', () => {
    expect(buildOutputFileName('')).toBe('document-text.txt')
    expect(buildOutputFileName('.pdf')).toBe('document-text.txt')
  })
})
