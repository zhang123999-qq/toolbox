import { describe, expect, it, vi } from 'vitest'
import {
  LANG_CHI_SIM,
  LANG_ENG,
  MAX_CANVAS_PIXELS,
  MAX_FILE_SIZE,
  assertFileSizeOk,
  buildOutputFileName,
  computeRenderDimensions,
  errorMessage,
  formatFailedBlock,
  formatPageBlock,
  isPasswordPdfError,
  isPdfFile,
  mergePageTexts,
  pageHeaderText,
  parseLangs,
  progressRatio,
  terminateWorker,
} from './utils'

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
  })
})

describe('isPdfFile', () => {
  const pdfHead = [0x25, 0x50, 0x44, 0x46, 0x2d]
  it('%PDF- 魔数通过', () => {
    expect(isPdfFile(new Uint8Array([...pdfHead, 0x31]))).toBe(true)
  })
  it('空数组不通过', () => {
    expect(isPdfFile(new Uint8Array([]))).toBe(false)
  })
  it('不足 5 字节不通过', () => {
    expect(isPdfFile(new Uint8Array([0x25, 0x50, 0x44, 0x46]))).toBe(false)
  })
  it('首字节错误不通过', () => {
    expect(isPdfFile(new Uint8Array([0x00, 0x50, 0x44, 0x46, 0x2d]))).toBe(false)
  })
  it('第二字节错误不通过', () => {
    expect(isPdfFile(new Uint8Array([0x25, 0x00, 0x44, 0x46, 0x2d]))).toBe(false)
  })
  it('第三字节错误不通过', () => {
    expect(isPdfFile(new Uint8Array([0x25, 0x50, 0x00, 0x46, 0x2d]))).toBe(false)
  })
  it('第四字节错误不通过', () => {
    expect(isPdfFile(new Uint8Array([0x25, 0x50, 0x44, 0x00, 0x2d]))).toBe(false)
  })
  it('第五字节错误不通过', () => {
    expect(isPdfFile(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x00]))).toBe(false)
  })
})

describe('assertFileSizeOk', () => {
  it('未超限不抛错', () => {
    expect(() => assertFileSizeOk(MAX_FILE_SIZE)).not.toThrow()
  })
  it('超限抛错', () => {
    expect(() => assertFileSizeOk(MAX_FILE_SIZE + 1)).toThrow(/文件过大/)
  })
})

describe('isPasswordPdfError', () => {
  it('name 为 PasswordException 判为加密 PDF', () => {
    const err = new Error('needs password')
    err.name = 'PasswordException'
    expect(isPasswordPdfError(err)).toBe(true)
  })
  it('普通 Error 不判为加密', () => {
    expect(isPasswordPdfError(new Error('boom'))).toBe(false)
  })
  it('非 Error 不判为加密', () => {
    expect(isPasswordPdfError('PasswordException')).toBe(false)
    expect(isPasswordPdfError(null)).toBe(false)
  })
})

describe('parseLangs', () => {
  it('只选中英文', () => {
    expect(parseLangs('', '1')).toEqual([LANG_ENG])
  })
  it('只选中中文', () => {
    expect(parseLangs('1', '')).toEqual([LANG_CHI_SIM])
  })
  it('中英文都选', () => {
    expect(parseLangs('1', '1')).toEqual([LANG_CHI_SIM, LANG_ENG])
  })
  it('都不选抛错', () => {
    expect(() => parseLangs('', '')).toThrow(/至少选择一种识别语言/)
  })
})

describe('computeRenderDimensions', () => {
  it('正常尺寸取整返回', () => {
    expect(computeRenderDimensions(100, 200)).toEqual({ width: 100, height: 200 })
    expect(computeRenderDimensions(100.4, 200.6)).toEqual({ width: 100, height: 201 })
  })
  it('非法尺寸抛错', () => {
    expect(() => computeRenderDimensions(0, 100)).toThrow(/页面尺寸无效/)
    expect(() => computeRenderDimensions(100, 0)).toThrow(/页面尺寸无效/)
    expect(() => computeRenderDimensions(-5, 100)).toThrow(/页面尺寸无效/)
    expect(() => computeRenderDimensions(NaN, 100)).toThrow(/页面尺寸无效/)
    expect(() => computeRenderDimensions(100, NaN)).toThrow(/页面尺寸无效/)
    expect(() => computeRenderDimensions(Infinity, 100)).toThrow(/页面尺寸无效/)
  })
  it('总像素超限抛错', () => {
    // 20000×20000 = 4e8 > 16384²
    expect(() => computeRenderDimensions(20000, 20000)).toThrow(/渲染尺寸过大/)
  })
  it('边界像素数不抛错', () => {
    // 16384×16384 恰为上限
    expect(computeRenderDimensions(16384, 16384)).toEqual({ width: 16384, height: 16384 })
    expect(MAX_CANVAS_PIXELS).toBe(16384 * 16384)
  })
})

describe('页码标注与合并', () => {
  it('pageHeaderText 格式', () => {
    expect(pageHeaderText(3)).toBe('—— 第 3 页 ——')
  })
  it('formatPageBlock 正常文本 trim 后拼接', () => {
    expect(formatPageBlock(1, '  你好\n世界  ')).toBe('—— 第 1 页 ——\n你好\n世界')
  })
  it('formatPageBlock 空文本填占位行', () => {
    expect(formatPageBlock(2, '')).toBe('—— 第 2 页 ——\n（本页未识别出文字）')
    expect(formatPageBlock(2, '   \n  ')).toBe('—— 第 2 页 ——\n（本页未识别出文字）')
  })
  it('formatFailedBlock 含页码与原因', () => {
    expect(formatFailedBlock(2, 'boom')).toBe('—— 第 2 页（识别失败：boom） ——')
  })
  it('mergePageTexts 空一行分隔', () => {
    expect(mergePageTexts(['a', 'b'])).toBe('a\n\nb')
    expect(mergePageTexts([])).toBe('')
    expect(mergePageTexts(['only'])).toBe('only')
  })
})

describe('buildOutputFileName', () => {
  it('原名去扩展名加 -ocr.txt', () => {
    expect(buildOutputFileName('report.pdf')).toBe('report-ocr.txt')
  })
  it('无扩展名直接加后缀', () => {
    expect(buildOutputFileName('noext')).toBe('noext-ocr.txt')
  })
  it('空名兜底 document', () => {
    expect(buildOutputFileName('')).toBe('document-ocr.txt')
    expect(buildOutputFileName('.pdf')).toBe('document-ocr.txt')
  })
})

describe('progressRatio', () => {
  it('正常换算', () => {
    // 已完成 2 页 + 第 3 页一半 / 共 4 页
    expect(progressRatio(2, 0.5, 4)).toBe(0.625)
  })
  it('total 非正返回 0', () => {
    expect(progressRatio(0, 0, 0)).toBe(0)
    expect(progressRatio(0, 0, -1)).toBe(0)
  })
  it('钳制在 [0, 1]', () => {
    expect(progressRatio(-2, 0, 4)).toBe(0)
    expect(progressRatio(4, 0.5, 4)).toBe(1)
    expect(progressRatio(4, 0, 4)).toBe(1)
  })
})

describe('terminateWorker', () => {
  it('null / undefined 直接跳过', async () => {
    await expect(terminateWorker(null)).resolves.toBeUndefined()
    await expect(terminateWorker(undefined)).resolves.toBeUndefined()
  })
  it('正常终止调用 terminate', async () => {
    const terminate = vi.fn(async () => ({}))
    await terminateWorker({ recognize: vi.fn(), terminate })
    expect(terminate).toHaveBeenCalledTimes(1)
  })
  it('terminate 抛错被吞掉', async () => {
    const terminate = vi.fn(async () => {
      throw new Error('already dead')
    })
    await expect(terminateWorker({ recognize: vi.fn(), terminate })).resolves.toBeUndefined()
  })
})
