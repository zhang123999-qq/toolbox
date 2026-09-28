import { describe, expect, it } from 'vitest'
import {
  DEFAULT_THRESHOLD,
  DIFF_MARK,
  MAX_CANVAS_PIXELS,
  MAX_FILE_SIZE,
  MAX_THRESHOLD,
  RENDER_SCALE,
  assertFileSizeOk,
  assertRenderSizeOk,
  buildDiffReport,
  buildReportFileName,
  computeAlignedSize,
  computePageDiff,
  diffRatioText,
  errorMessage,
  extraPageNumbers,
  isPasswordPdfError,
  isPdfFile,
  padToCanvas,
  parseThreshold,
} from './utils'
import type { PageStat, PixelData } from './utils'

/** 构造 w×h 的像素数据，fill(i) 返回第 i 个像素的 [r,g,b,a] */
function makePixels(
  w: number,
  h: number,
  fill: (i: number) => [number, number, number, number],
): PixelData {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let i = 0; i < w * h; i++) {
    data.set(fill(i), i * 4)
  }
  return { data, width: w, height: h }
}

const solid =
  (r: number, g: number, b: number, a = 255): ((i: number) => [number, number, number, number]) =>
  () => [r, g, b, a]

const pdfMagic = () => new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34])

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
  })
})

describe('isPdfFile', () => {
  it('%PDF- 魔数通过', () => {
    expect(isPdfFile(pdfMagic())).toBe(true)
  })

  it('不足 5 字节不通过', () => {
    expect(isPdfFile(new Uint8Array([0x25, 0x50]))).toBe(false)
    expect(isPdfFile(new Uint8Array(0))).toBe(false)
  })

  it('魔数不对不通过', () => {
    expect(isPdfFile(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2e]))).toBe(false)
    expect(isPdfFile(new Uint8Array([1, 2, 3, 4, 5, 6]))).toBe(false)
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
  it('name 为 PasswordException 的 Error 判为加密', () => {
    const err = Object.assign(new Error('需要密码'), { name: 'PasswordException' })
    expect(isPasswordPdfError(err)).toBe(true)
  })

  it('普通 Error 与非 Error 不判为加密', () => {
    expect(isPasswordPdfError(new Error('解析失败'))).toBe(false)
    expect(isPasswordPdfError('PasswordException')).toBe(false)
    expect(isPasswordPdfError(null)).toBe(false)
  })
})

describe('parseThreshold', () => {
  it('空串用默认 30', () => {
    expect(parseThreshold('')).toBe(DEFAULT_THRESHOLD)
    expect(parseThreshold('   ')).toBe(DEFAULT_THRESHOLD)
  })

  it('正常解析边界 0/255', () => {
    expect(parseThreshold('0')).toBe(0)
    expect(parseThreshold(String(MAX_THRESHOLD))).toBe(MAX_THRESHOLD)
    expect(parseThreshold(' 30 ')).toBe(30)
  })

  it('非法抛错', () => {
    expect(() => parseThreshold('abc')).toThrow(/阈值无效/)
    expect(() => parseThreshold('12.5')).toThrow(/阈值无效/)
    expect(() => parseThreshold('-1')).toThrow(/阈值无效/)
    expect(() => parseThreshold('256')).toThrow(/超出范围/)
  })
})

describe('assertRenderSizeOk', () => {
  it('合法尺寸不抛错', () => {
    expect(() => assertRenderSizeOk(714, 1010)).not.toThrow()
    expect(() => assertRenderSizeOk(1, 1)).not.toThrow()
  })

  it('非法尺寸抛错', () => {
    expect(() => assertRenderSizeOk(0, 100)).toThrow(/页面尺寸无效/)
    expect(() => assertRenderSizeOk(NaN, 100)).toThrow(/页面尺寸无效/)
    expect(() => assertRenderSizeOk(Infinity, 100)).toThrow(/页面尺寸无效/)
    expect(() => assertRenderSizeOk(100, -1)).toThrow(/页面尺寸无效/)
  })

  it('超 Canvas 上限抛错', () => {
    expect(() => assertRenderSizeOk(20000, 20000)).toThrow(/渲染尺寸过大/)
    expect(MAX_CANVAS_PIXELS).toBeGreaterThan(0)
  })
})

describe('computeAlignedSize', () => {
  it('同尺寸原样返回', () => {
    expect(computeAlignedSize(100, 80, 100, 80)).toEqual({ width: 100, height: 80 })
  })

  it('取外接矩形', () => {
    expect(computeAlignedSize(100, 80, 120, 60)).toEqual({ width: 120, height: 80 })
    expect(computeAlignedSize(120, 60, 100, 80)).toEqual({ width: 120, height: 80 })
  })

  it('非整数向上取整', () => {
    expect(computeAlignedSize(100.2, 80.7, 100, 80)).toEqual({ width: 101, height: 81 })
  })

  it('非法尺寸抛错', () => {
    expect(() => computeAlignedSize(0, 80, 100, 80)).toThrow(/页面尺寸无效/)
    expect(() => computeAlignedSize(100, 80, NaN, 80)).toThrow(/页面尺寸无效/)
    expect(() => computeAlignedSize(100, 80, 100, Infinity)).toThrow(/页面尺寸无效/)
    expect(() => computeAlignedSize(-1, 80, 100, 80)).toThrow(/页面尺寸无效/)
  })
})

describe('padToCanvas', () => {
  it('同尺寸直接拷贝像素', () => {
    const p = makePixels(2, 1, solid(10, 20, 30))
    const out = padToCanvas(p, 2, 1)
    expect(out.width).toBe(2)
    expect(out.height).toBe(1)
    expect(Array.from(out.data.slice(0, 4))).toEqual([10, 20, 30, 255])
  })

  it('较小页居中、白底补齐', () => {
    // 2x1 的红页贴到 4x3 画布：偏移 (1,1)
    const p = makePixels(2, 1, solid(255, 0, 0))
    const out = padToCanvas(p, 4, 3)
    // (0,0) 为白底
    expect(Array.from(out.data.slice(0, 4))).toEqual([255, 255, 255, 255])
    // (1,1) 为原像素
    expect(Array.from(out.data.slice((1 * 4 + 1) * 4, (1 * 4 + 1) * 4 + 4))).toEqual([
      255, 0, 0, 255,
    ])
  })

  it('目标画布更小时抛错', () => {
    const p = makePixels(4, 4, solid(0, 0, 0))
    expect(() => padToCanvas(p, 3, 4)).toThrow(/目标画布小于源页面/)
    expect(() => padToCanvas(p, 4, 3)).toThrow(/目标画布小于源页面/)
  })

  it('像素数据非法时抛错', () => {
    expect(() =>
      padToCanvas({ data: new Uint8ClampedArray(4), width: 0, height: 1 }, 2, 2),
    ).toThrow(/页面尺寸无效/)
    expect(() =>
      padToCanvas({ data: new Uint8ClampedArray(8), width: 2, height: 2 }, 2, 2),
    ).toThrow(/像素数据长度与尺寸不一致/)
  })
})

describe('computePageDiff', () => {
  it('完全相同的页面：0 差异，差异层全透明', () => {
    const a = makePixels(3, 2, solid(200, 200, 200))
    const b = makePixels(3, 2, solid(200, 200, 200))
    const d = computePageDiff(1, a, b, 30)
    expect(d.page).toBe(1)
    expect(d.diffPixels).toBe(0)
    expect(d.totalPixels).toBe(6)
    expect(d.width).toBe(3)
    expect(d.height).toBe(2)
    expect(d.sizeMismatch).toBe(false)
    expect(d.diffData.every((v) => v === 0)).toBe(true)
  })

  it('通道差值超过阈值记为差异，等于阈值不算', () => {
    const a = makePixels(2, 1, solid(100, 100, 100))
    // 像素0：R 差 31（>30）→ 差异；像素1：R 差 30（==30）→ 不算
    const b = makePixels(2, 1, (i) => (i === 0 ? [131, 100, 100, 255] : [130, 100, 100, 255]))
    const d = computePageDiff(2, a, b, 30)
    expect(d.diffPixels).toBe(1)
    expect(d.totalPixels).toBe(2)
    // 差异像素标记为红色半透明
    expect(Array.from(d.diffData.slice(0, 4))).toEqual(Array.from(DIFF_MARK))
    // 非差异像素全透明
    expect(Array.from(d.diffData.slice(4, 8))).toEqual([0, 0, 0, 0])
  })

  it('只差 alpha 通道不算差异', () => {
    const a = makePixels(2, 2, solid(10, 20, 30, 255))
    const b = makePixels(2, 2, solid(10, 20, 30, 0))
    expect(computePageDiff(1, a, b, 0).diffPixels).toBe(0)
  })

  it('尺寸不同：对齐到外接矩形并标记 sizeMismatch', () => {
    const a = makePixels(4, 2, solid(255, 255, 255))
    const b = makePixels(2, 2, solid(255, 255, 255))
    const d = computePageDiff(1, a, b, 30)
    expect(d.sizeMismatch).toBe(true)
    expect(d.width).toBe(4)
    expect(d.height).toBe(2)
    expect(d.totalPixels).toBe(8)
    // B 页居中后左右各 1 列白底补齐，与 A 的白底一致 → 0 差异
    expect(d.diffPixels).toBe(0)
  })

  it('尺寸不同且内容不同：补齐区外像素正常比对', () => {
    const a = makePixels(2, 2, solid(0, 0, 0))
    const b = makePixels(4, 2, solid(0, 0, 0))
    const d = computePageDiff(1, a, b, 30)
    // A 居中到 4x2：左右补白底(255)，B 全黑 → 补齐区 4 个像素为差异
    expect(d.diffPixels).toBe(4)
    expect(d.sizeMismatch).toBe(true)
  })

  it('仅高度不同也标记 sizeMismatch', () => {
    const a = makePixels(2, 2, solid(1, 2, 3))
    const b = makePixels(2, 4, solid(1, 2, 3))
    expect(computePageDiff(1, a, b, 30).sizeMismatch).toBe(true)
  })

  it('像素数据非法抛错并区分 A/B', () => {
    const ok = makePixels(2, 2, solid(0, 0, 0))
    const bad = { data: new Uint8ClampedArray(4), width: 0, height: 2 }
    expect(() => computePageDiff(1, bad, ok, 30)).toThrow(/A 页面尺寸无效/)
    expect(() => computePageDiff(1, ok, bad, 30)).toThrow(/B 页面尺寸无效/)
  })
})

describe('diffRatioText', () => {
  it('正常比例保留 1 位小数', () => {
    expect(diffRatioText(1, 4)).toBe('25.0%')
    expect(diffRatioText(0, 100)).toBe('0.0%')
  })

  it('总数非法时返回占位符', () => {
    expect(diffRatioText(1, 0)).toBe('—')
    expect(diffRatioText(0, -5)).toBe('—')
  })
})

describe('extraPageNumbers', () => {
  it('返回超出范围的页码', () => {
    expect(extraPageNumbers(2, 5)).toEqual([3, 4, 5])
  })

  it('无超出时为空数组', () => {
    expect(extraPageNumbers(3, 3)).toEqual([])
    expect(extraPageNumbers(5, 3)).toEqual([])
  })
})

describe('buildReportFileName', () => {
  it('拼接双方基名', () => {
    expect(buildReportFileName('a.pdf', 'b.pdf')).toBe('a-vs-b-diff.txt')
    expect(buildReportFileName('report.docx', 'v2.PDF')).toBe('report-vs-v2-diff.txt')
  })

  it('空名兜底为 pdf', () => {
    expect(buildReportFileName('', '')).toBe('pdf-vs-pdf-diff.txt')
    expect(buildReportFileName('.pdf', 'x.pdf')).toBe('pdf-vs-x-diff.txt')
  })
})

describe('buildDiffReport', () => {
  const stats: PageStat[] = [
    { page: 1, diffPixels: 0, totalPixels: 100, sizeMismatch: false },
    { page: 2, diffPixels: 25, totalPixels: 100, sizeMismatch: true },
  ]

  it('逐页统计 + 尺寸标记 + 多出页', () => {
    const text = buildDiffReport({
      nameA: 'a.pdf',
      nameB: 'b.pdf',
      pagesA: 4,
      pagesB: 2,
      compared: 2,
      threshold: 30,
      stats,
    })
    expect(text).toContain('PDF 对比报告')
    expect(text).toContain('文件 A：a.pdf（4 页）')
    expect(text).toContain('第 1 页：差异 0 / 100（0.0%）')
    expect(text).toContain('第 2 页：差异 25 / 100（25.0%）（两页尺寸不同）')
    expect(text).toContain('文件 A 多出的页：3、4')
    expect(text).not.toContain('文件 B 多出的页')
    expect(text).not.toContain('完全一致')
  })

  it('B 多出页单独列出', () => {
    const text = buildDiffReport({
      nameA: 'a.pdf',
      nameB: 'b.pdf',
      pagesA: 2,
      pagesB: 3,
      compared: 2,
      threshold: 30,
      stats,
    })
    expect(text).toContain('文件 B 多出的页：3')
    expect(text).not.toContain('文件 A 多出的页')
  })

  it('全一致时给出结论行', () => {
    const text = buildDiffReport({
      nameA: 'a.pdf',
      nameB: 'b.pdf',
      pagesA: 1,
      pagesB: 1,
      compared: 1,
      threshold: 30,
      stats: [{ page: 1, diffPixels: 0, totalPixels: 100, sizeMismatch: false }],
    })
    expect(text).toContain('所对比的页面完全一致，无差异。')
  })

  it('渲染倍数常量在合理区间', () => {
    expect(RENDER_SCALE).toBeGreaterThanOrEqual(1.0)
    expect(RENDER_SCALE).toBeLessThanOrEqual(1.5)
  })
})
