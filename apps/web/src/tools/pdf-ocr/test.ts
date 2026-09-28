import { describe, expect, it } from 'vitest'
import {
  MAX_OCR_BYTES,
  MAX_OCR_PAGES,
  OCR_LANGUAGES,
  OCR_LANGUAGE_LABELS,
  checkOcrPageCount,
  cleanOcrText,
  describeOcrEngineError,
  describePdfError,
  formatOcrPage,
  isPasswordError,
  mergeOcrPages,
  ocrOverallProgress,
  ocrStageText,
  validateOcrFile,
} from './utils'
import type { PdfFileInfo } from './utils'

const pdfFile = (over: Partial<PdfFileInfo> = {}): PdfFileInfo => ({
  name: 'doc.pdf',
  size: 1024,
  type: 'application/pdf',
  ...over,
})

describe('pdf-ocr / 文件校验', () => {
  it('空文件报错', () => {
    expect(() => validateOcrFile(pdfFile({ size: 0 }))).toThrow('文件为空')
  })

  it('超过 100 MiB 报错', () => {
    expect(() => validateOcrFile(pdfFile({ size: MAX_OCR_BYTES + 1 }))).toThrow('100 MiB')
  })

  it('非 PDF（类型与后缀都不对）报错', () => {
    expect(() => validateOcrFile(pdfFile({ name: 'doc.txt', type: 'text/plain' }))).toThrow(
      '请选择 PDF 文件',
    )
  })

  it('type 为 application/pdf 即通过', () => {
    expect(() => validateOcrFile(pdfFile())).not.toThrow()
  })

  it('后缀 .pdf 即通过（type 不准时也认）', () => {
    expect(() =>
      validateOcrFile(pdfFile({ name: '扫描件.PDF', type: 'application/octet-stream' })),
    ).not.toThrow()
  })
})

describe('pdf-ocr / 页数校验', () => {
  it('0 页 / 负数 / 非整数 / NaN 视为损坏', () => {
    for (const n of [0, -3, 2.5, Number.NaN]) {
      expect(() => checkOcrPageCount(n)).toThrow('可能已损坏')
    }
  })

  it('1～50 页通过', () => {
    expect(() => checkOcrPageCount(1)).not.toThrow()
    expect(() => checkOcrPageCount(MAX_OCR_PAGES)).not.toThrow()
  })

  it('51 页报错并提示拆分', () => {
    expect(() => checkOcrPageCount(51)).toThrow('超过 50 页上限')
  })
})

describe('pdf-ocr / 文本清洗', () => {
  it('统一换行符并去掉行尾空白', () => {
    expect(cleanOcrText('a  \r\nb\t\r第1行  ')).toBe('a\nb\n第1行')
  })

  it('换页符转为空行', () => {
    expect(cleanOcrText('a\fb')).toBe('a\nb')
  })

  it('3 个以上连续空行压成 1 个', () => {
    expect(cleanOcrText('a\n\n\n\n\nb')).toBe('a\n\nb')
  })

  it('首尾空白整体去掉', () => {
    expect(cleanOcrText('\n\n  hello  \n\n')).toBe('hello')
  })

  it('空串与纯空白返回空串', () => {
    expect(cleanOcrText('')).toBe('')
    expect(cleanOcrText('   \n  ')).toBe('')
  })
})

describe('pdf-ocr / 结果合并与格式化', () => {
  it('单页块带「第 x/y 页」页眉', () => {
    expect(formatOcrPage({ page: 2, text: '你好' }, 3)).toBe('第 2/3 页\n你好')
  })

  it('空白页用占位行不断行', () => {
    expect(formatOcrPage({ page: 1, text: '' }, 2)).toBe('第 1/2 页\n（本页未识别出文字）')
  })

  it('无页面时合并为空串', () => {
    expect(mergeOcrPages([])).toBe('')
  })

  it('多页用空行分隔', () => {
    const merged = mergeOcrPages([
      { page: 1, text: '一' },
      { page: 2, text: '' },
    ])
    expect(merged).toBe('第 1/2 页\n一\n\n第 2/2 页\n（本页未识别出文字）')
  })
})

describe('pdf-ocr / 错误识别与文案', () => {
  it('PasswordException 判定为加密', () => {
    expect(isPasswordError({ name: 'PasswordException', message: 'x' })).toBe(true)
    expect(isPasswordError(new Error('Incorrect password'))).toBe(true)
    expect(isPasswordError(new Error('boom'))).toBe(false)
    expect(isPasswordError('password required')).toBe(true)
    expect(isPasswordError(null)).toBe(false)
  })

  it('加密 PDF 给出中文解密提示', () => {
    expect(describePdfError({ name: 'PasswordException' })).toContain('已加密')
  })

  it('损坏文件给出中文提示', () => {
    expect(describePdfError(new Error('Invalid PDF structure'))).toContain('损坏')
    expect(describePdfError(new Error('文件损坏'))).toContain('损坏')
  })

  it('其他加载错误原样带出', () => {
    expect(describePdfError(new Error('boom'))).toBe('PDF 加载失败：boom')
    expect(describePdfError('oops')).toBe('PDF 加载失败：oops')
  })

  it('引擎加载失败提示离线/CDN 并说明已完成页保留', () => {
    const msg = describeOcrEngineError(new Error('fetch failed'))
    expect(msg).toContain('OCR 引擎加载失败')
    expect(msg).toContain('离线')
    expect(msg).toContain('已完成页面的结果已保留')
    expect(describeOcrEngineError('nope')).toContain('nope')
  })
})

describe('pdf-ocr / 进度', () => {
  it('三阶段文案', () => {
    expect(ocrStageText('loading-pdf', 0, 3)).toBe('正在加载 PDF…')
    expect(ocrStageText('loading-engine', 0, 3)).toContain('OCR 引擎')
    expect(ocrStageText('recognizing', 1, 3)).toBe('正在识别第 2/3 页…')
  })

  it('total<=0 时防除零返回 0', () => {
    expect(ocrOverallProgress(0, 0, 0.5)).toBe(0)
    expect(ocrOverallProgress(0, -2, 0.5)).toBe(0)
  })

  it('页内进度钳制在 [0,1]', () => {
    expect(ocrOverallProgress(1, 4, 2)).toBe(50)
    expect(ocrOverallProgress(1, 4, -1)).toBe(25)
  })

  it('正常进度四舍五入', () => {
    expect(ocrOverallProgress(0, 3, 0.5)).toBe(17)
    expect(ocrOverallProgress(2, 3, 1)).toBe(100)
    expect(ocrOverallProgress(5, 3, 1)).toBe(100)
  })
})

describe('pdf-ocr / 语言常量', () => {
  it('语言取值与展示名成对', () => {
    expect(OCR_LANGUAGES).toEqual(['chi_sim+eng', 'eng', 'chi_sim'])
    expect(OCR_LANGUAGE_LABELS['chi_sim+eng']).toBe('中文+英文')
    expect(MAX_OCR_PAGES).toBe(50)
    expect(MAX_OCR_BYTES).toBe(100 * 1024 * 1024)
  })
})
