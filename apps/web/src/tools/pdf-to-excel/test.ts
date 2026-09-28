import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { PasswordException } from 'pdfjs-dist'
import type { CellItem, TextContentItem } from './utils'

/** 文本片段变体（排除 marked content，便于测试里改写 transform） */
type TextFragment = Extract<TextContentItem, { str: string }>
import {
  COLUMN_GAP_THRESHOLD,
  MAX_COLUMN_WIDTH,
  MAX_FILE_SIZE,
  MIN_COLUMN_WIDTH,
  ROW_Y_TOLERANCE,
  WORD_JOIN_GAP,
  XLSX_MIME,
  assertFileSizeOk,
  buildOutputFileName,
  buildXlsxBlob,
  computeColumnWidths,
  errorMessage,
  extractCellItems,
  groupItemsToRows,
  isEncryptedPdfError,
  isPdfFile,
} from './utils'

function textItem(str: string, x: number, y: number, width = 10, height = 12): TextFragment {
  return {
    str,
    transform: [1, 0, 0, 1, x, y],
    width,
    height,
  }
}

function markedContent(): TextContentItem {
  return { type: 'beginMarkedContent', id: 'mc0' }
}

function pdfBytes(): Uint8Array {
  return new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34])
}

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
  })
})

describe('isPdfFile', () => {
  it('%PDF- 魔数通过', () => {
    expect(isPdfFile(pdfBytes())).toBe(true)
  })

  it('不足 5 字节不通过', () => {
    expect(isPdfFile(new Uint8Array([0x25, 0x50, 0x44, 0x46]))).toBe(false)
    expect(isPdfFile(new Uint8Array(0))).toBe(false)
  })

  it('每个魔数字节逐个校验', () => {
    const positions = [0x25, 0x50, 0x44, 0x46, 0x2d]
    for (let i = 0; i < positions.length; i++) {
      const bytes = pdfBytes()
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

describe('isEncryptedPdfError', () => {
  it('PasswordException 实例识别为加密错误', () => {
    expect(isEncryptedPdfError(new PasswordException('need password', 1))).toBe(true)
  })

  it('name 兜底：跨 realm 场景下按名称识别', () => {
    const err = new Error('x')
    err.name = 'PasswordException'
    expect(isEncryptedPdfError(err)).toBe(true)
  })

  it('普通错误与非错误值返回 false', () => {
    expect(isEncryptedPdfError(new Error('Invalid PDF structure'))).toBe(false)
    expect(isEncryptedPdfError('nope')).toBe(false)
    expect(isEncryptedPdfError(null)).toBe(false)
  })
})

describe('extractCellItems', () => {
  it('提取坐标与尺寸', () => {
    const items = extractCellItems([textItem('你好', 100, 700, 24, 12)])
    expect(items).toEqual([{ str: '你好', x: 100, y: 700, width: 24, height: 12 }])
  })

  it('跳过 marked content 与空字符串片段', () => {
    const items = extractCellItems([markedContent(), textItem('', 0, 0), textItem('a', 10, 20)])
    expect(items).toHaveLength(1)
    expect(items[0].str).toBe('a')
  })

  it('transform 不足 6 个元素时 x/y 兜底为 0', () => {
    const item = textItem('a', 0, 0)
    item.transform = [1, 0, 0, 1]
    const items = extractCellItems([item])
    expect(items[0].x).toBe(0)
    expect(items[0].y).toBe(0)
  })

  it('width/height 非法时按字数估算兜底', () => {
    const zero = textItem('ab', 0, 0, 0, 0)
    const nan = textItem('abc', 0, 0, NaN, NaN)
    const items = extractCellItems([zero, nan])
    expect(items[0].width).toBe(10) // 2 字 × 5
    expect(items[0].height).toBe(10)
    expect(items[1].width).toBe(15) // 3 字 × 5
    expect(items[1].height).toBe(10)
  })
})

describe('groupItemsToRows', () => {
  // 文本片段先经 extractCellItems 提取坐标，再分行分列（与组件内调用链一致）
  const toRows = (items: TextContentItem[]) => groupItemsToRows(extractCellItems(items))

  it('空输入返回空表', () => {
    expect(groupItemsToRows([])).toEqual([])
  })

  it('大间隙切分为列', () => {
    const rows = toRows([textItem('姓名', 50, 700, 20), textItem('张三', 200, 700, 20)])
    expect(rows).toEqual([['姓名', '张三']])
  })

  it('间隙恰为阈值时不切分（> 才切分）', () => {
    // 第一片段 x=50 宽=20 → 结束于 70；第二片段 x=80 → 间隙 10 = 阈值
    const rows = toRows([textItem('A', 50, 700, 20), textItem('B', 80, 700, 20)])
    expect(rows).toEqual([['A B']])
    expect(COLUMN_GAP_THRESHOLD).toBe(10)
  })

  it('词间距加空格拼接，词内拆分直接拼接', () => {
    const rows = toRows([
      textItem('Hel', 50, 700, 15), // 结束于 65
      textItem('lo', 65.5, 700, 10), // 间隙 0.5 ≤ 1.5：直接拼接
      textItem('World', 80, 700, 25), // 间隙 4.5：词间距，加空格
    ])
    expect(rows).toEqual([['Hello World']])
    expect(WORD_JOIN_GAP).toBe(1.5)
  })

  it('不同纵坐标分行，输出按阅读顺序从上到下', () => {
    const rows = toRows([textItem('第二行', 50, 680, 30), textItem('第一行', 50, 700, 30)])
    expect(rows).toEqual([['第一行'], ['第二行']])
  })

  it('纵坐标差在容差内视为同一行', () => {
    const rows = toRows([textItem('A', 50, 700, 10), textItem('B', 200, 700 + ROW_Y_TOLERANCE, 10)])
    expect(rows).toEqual([['A', 'B']])
  })

  it('纵坐标差超出容差则分行', () => {
    const rows = toRows([
      textItem('A', 50, 700, 10),
      textItem('B', 50, 700 - ROW_Y_TOLERANCE - 0.1, 10),
    ])
    expect(rows).toEqual([['A'], ['B']])
  })

  it('整行空白被丢弃', () => {
    const rows = toRows([textItem('   ', 50, 700, 10), textItem('有效', 50, 680, 20)])
    expect(rows).toEqual([['有效']])
  })

  it('多行多列混合排版', () => {
    const items: CellItem[] = [
      { str: '表头1', x: 50, y: 700, width: 30, height: 12 },
      { str: '表头2', x: 200, y: 700, width: 30, height: 12 },
      { str: 'a', x: 50, y: 680, width: 10, height: 12 },
      { str: 'b', x: 200, y: 680, width: 10, height: 12 },
    ]
    expect(groupItemsToRows(items)).toEqual([
      ['表头1', '表头2'],
      ['a', 'b'],
    ])
  })
})

describe('computeColumnWidths', () => {
  it('空表返回空数组', () => {
    expect(computeColumnWidths([])).toEqual([])
  })

  it('每列取最大字符数并钳制', () => {
    // 'ab'=2 → 下限 8；'x'.repeat(100) → 上限 50；中文按 code point 计
    const widths = computeColumnWidths([
      ['ab', 'x'.repeat(100)],
      ['中文测试', 'ok'],
    ])
    expect(widths).toEqual([MIN_COLUMN_WIDTH, MAX_COLUMN_WIDTH])
    expect(MIN_COLUMN_WIDTH).toBe(8)
    expect(MAX_COLUMN_WIDTH).toBe(50)
  })

  it('中间值不钳制', () => {
    expect(computeColumnWidths([['a'.repeat(20)]])).toEqual([20])
  })
})

describe('buildOutputFileName', () => {
  it('替换扩展名并加后缀', () => {
    expect(buildOutputFileName('report.pdf')).toBe('report-converted.xlsx')
    expect(buildOutputFileName('a.PDF')).toBe('a-converted.xlsx')
    expect(buildOutputFileName('noext')).toBe('noext-converted.xlsx')
  })

  it('空名兜底为 document', () => {
    expect(buildOutputFileName('')).toBe('document-converted.xlsx')
    expect(buildOutputFileName('.pdf')).toBe('document-converted.xlsx')
  })
})

describe('buildXlsxBlob（真实 xlsx round-trip）', () => {
  async function readBack(blob: Blob): Promise<{ names: string[]; sheets: string[][][] }> {
    const buf = await blob.arrayBuffer()
    const wb = XLSX.read(buf, { type: 'array' })
    const sheets = wb.SheetNames.map((name) => {
      const ws = wb.Sheets[name]
      return XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 })
    })
    return { names: wb.SheetNames, sheets }
  }

  it('merged：单表 Sheet1，页间空行分隔', async () => {
    const blob = buildXlsxBlob(
      [
        [
          ['姓名', '年龄'],
          ['张三', '30'],
        ],
        [['李四', '25']],
        [], // 空页：不产生分隔空行
      ],
      'merged',
    )
    expect(blob.type).toBe(XLSX_MIME)
    const bytes = new Uint8Array(await blob.arrayBuffer())
    expect(String.fromCharCode(bytes[0], bytes[1])).toBe('PK')
    const { names, sheets } = await readBack(blob)
    expect(names).toEqual(['Sheet1'])
    expect(sheets[0]).toEqual([['姓名', '年龄'], ['张三', '30'], [], ['李四', '25']])
  })

  it('merged：首个空页不产生前导空行', async () => {
    const blob = buildXlsxBlob([[], [['a']]], 'merged')
    const { sheets } = await readBack(blob)
    expect(sheets[0]).toEqual([['a']])
  })

  it('perPage：每页一张工作表并命名', async () => {
    const blob = buildXlsxBlob([[['a', 'b']], [['c']]], 'perPage')
    const { names, sheets } = await readBack(blob)
    expect(names).toEqual(['第1页', '第2页'])
    expect(sheets[0]).toEqual([['a', 'b']])
    expect(sheets[1]).toEqual([['c']])
  })
})
