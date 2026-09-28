import { describe, expect, it } from 'vitest'
import {
  MAX_PDF_BYTES,
  MAX_PDF_PAGES,
  assertPagesHaveText,
  checkPdfPageCount,
  describePdfLoadError,
  detectColumnEdges,
  escapeCsvCell,
  isPasswordError,
  itemsToRows,
  pdfToCsv,
  resolveDelimiter,
  rowsToCsv,
  validatePdfFile,
} from './utils'
import type { PdfCellItem, PdfFileInfo } from './utils'

const pdfFile = (over: Partial<PdfFileInfo> = {}): PdfFileInfo => ({
  name: 'doc.pdf',
  size: 1024,
  type: 'application/pdf',
  ...over,
})

const cell = (str: string, x: number, y: number): PdfCellItem => ({ str, x, y })

describe('pdf-to-csv / 文件与页数校验', () => {
  it('空文件 / 超大 / 非 PDF 报错', () => {
    expect(() => validatePdfFile(pdfFile({ size: 0 }))).toThrow('文件为空')
    expect(() => validatePdfFile(pdfFile({ size: MAX_PDF_BYTES + 1 }))).toThrow('100 MiB')
    expect(() => validatePdfFile(pdfFile({ name: 'a.txt', type: 'text/plain' }))).toThrow(
      '请选择 PDF 文件',
    )
  })

  it('页数 0/负/小数/NaN 视为损坏，51 页拒绝', () => {
    for (const n of [0, -1, 1.5, Number.NaN]) {
      expect(() => checkPdfPageCount(n)).toThrow('可能已损坏')
    }
    expect(() => checkPdfPageCount(1)).not.toThrow()
    expect(() => checkPdfPageCount(MAX_PDF_PAGES)).not.toThrow()
    expect(() => checkPdfPageCount(51)).toThrow('50 页上限')
  })

  it('加密 / 损坏 / 其他错误的中文文案', () => {
    expect(isPasswordError({ name: 'PasswordException' })).toBe(true)
    expect(isPasswordError(new Error('need password'))).toBe(true)
    expect(isPasswordError(new Error('x'))).toBe(false)
    // 非对象错误：跳过 name 判定走消息匹配
    expect(isPasswordError('need password')).toBe(true)
    expect(isPasswordError(42)).toBe(false)
    expect(isPasswordError(null)).toBe(false)
    expect(describePdfLoadError({ name: 'PasswordException' })).toContain('已加密')
    expect(describePdfLoadError(new Error('Invalid PDF'))).toContain('损坏')
    expect(describePdfLoadError(new Error('boom'))).toBe('PDF 加载失败：boom')
    expect(describePdfLoadError('oops')).toBe('PDF 加载失败：oops')
  })
})

describe('pdf-to-csv / 分隔符', () => {
  it('tab 映射为制表符，其余原样', () => {
    expect(resolveDelimiter('tab')).toBe('\t')
    expect(resolveDelimiter(',')).toBe(',')
    expect(resolveDelimiter(';')).toBe(';')
  })
})

describe('pdf-to-csv / 列检测', () => {
  it('x 相近聚为一列，差超容差开新列', () => {
    expect(detectColumnEdges([cell('a', 10, 1), cell('b', 12, 1), cell('c', 100, 1)])).toEqual([
      10, 100,
    ])
  })

  it('边界：差恰为容差不分列', () => {
    expect(detectColumnEdges([cell('a', 10, 1), cell('b', 15, 1)])).toEqual([10])
    expect(detectColumnEdges([cell('a', 10, 1), cell('b', 15.1, 1)])).toEqual([10, 15.1])
  })

  it('空输入返回空列集', () => {
    expect(detectColumnEdges([])).toEqual([])
  })
})

describe('pdf-to-csv / 行组装', () => {
  const edges = [10, 100]

  it('两列表格按行列归位', () => {
    const rows = itemsToRows(
      [cell('姓名', 10, 700), cell('年龄', 100, 700), cell('张三', 11, 680), cell('25', 101, 680)],
      edges,
    )
    expect(rows).toEqual([
      ['姓名', '年龄'],
      ['张三', '25'],
    ])
  })

  it('y 差超容差分行；行内按 x 排序', () => {
    const rows = itemsToRows([cell('b', 100, 700), cell('a', 10, 700), cell('c', 10, 690)], edges)
    expect(rows).toEqual([['a', 'b'], ['c']])
  })

  it('同格多项用空格连接；行尾空格截掉', () => {
    const rows = itemsToRows([cell('张', 10, 700), cell('三', 30, 700)], edges)
    expect(rows).toEqual([['张 三']])
  })

  it('列归属：偏左归第 0 列，偏右归最右列', () => {
    const rows = itemsToRows([cell('左', 0, 700), cell('右', 500, 700)], edges)
    expect(rows).toEqual([['左', '右']])
  })

  it('空输入 / 空列集返回空行集', () => {
    expect(itemsToRows([], edges)).toEqual([])
    expect(itemsToRows([cell('a', 10, 700)], [])).toEqual([])
  })

  it('空串项被过滤', () => {
    expect(itemsToRows([cell('', 10, 700)], edges)).toEqual([])
  })
})

describe('pdf-to-csv / 单元格转义（RFC 4180）', () => {
  it('含分隔符 / 引号 / 换行则加引号，内部引号翻倍', () => {
    expect(escapeCsvCell('a,b', ',')).toBe('"a,b"')
    expect(escapeCsvCell('say "hi"', ',')).toBe('"say ""hi"""')
    expect(escapeCsvCell('l1\nl2', ',')).toBe('"l1\nl2"')
    expect(escapeCsvCell('l1\rl2', ',')).toBe('"l1\rl2"')
  })

  it('分隔符不同则转义规则跟随', () => {
    expect(escapeCsvCell('a;b', ';')).toBe('"a;b"')
    expect(escapeCsvCell('a;b', ',')).toBe('a;b')
    expect(escapeCsvCell('a\tb', '\t')).toBe('"a\tb"')
  })

  it('普通单元格原样', () => {
    expect(escapeCsvCell('plain', ',')).toBe('plain')
    expect(escapeCsvCell('', ',')).toBe('')
  })

  it('公式注入防护：= + - @ 开头加单引号前缀', () => {
    expect(escapeCsvCell('=SUM(A1)', ',')).toBe("'=SUM(A1)")
    expect(escapeCsvCell('+123', ',')).toBe("'+123")
    expect(escapeCsvCell('-5', ',')).toBe("'-5")
    expect(escapeCsvCell('@user', ',')).toBe("'@user")
  })

  it('公式前缀与引号转义可叠加', () => {
    expect(escapeCsvCell('=a,b', ',')).toBe('"\'=a,b"')
  })
})

describe('pdf-to-csv / 整篇', () => {
  it('rowsToCsv 行间用 CRLF', () => {
    expect(
      rowsToCsv(
        [
          ['a', 'b'],
          ['c', 'd'],
        ],
        ',',
      ),
    ).toBe('a,b\r\nc,d')
  })

  it('多页行拼接，空页跳过', () => {
    const csv = pdfToCsv([[cell('a', 10, 700)], [], [cell('b', 10, 700)]], ',')
    expect(csv).toBe('a\r\nb')
  })

  it('全空抛错并建议 #500', () => {
    expect(() => assertPagesHaveText([[], []])).toThrow('#500')
    expect(() => assertPagesHaveText([[cell('  ', 1, 1)]])).toThrow('#500')
    expect(() => assertPagesHaveText([[cell('x', 1, 1)]])).not.toThrow()
    expect(() => pdfToCsv([[], []], ',')).toThrow('#500')
  })

  it('tab 分隔符端到端', () => {
    const csv = pdfToCsv([[cell('a', 10, 700), cell('b', 100, 700)]], 'tab')
    expect(csv).toBe('a\tb')
  })
})
