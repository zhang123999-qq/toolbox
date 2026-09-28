import { describe, expect, it } from 'vitest'
import {
  ALT_MAX_LENGTH,
  AltCheckError,
  analyzeHtml,
  checkAlts,
  extractImages,
  findStuffedWord,
  isFilenameLike,
  renderReport,
} from './utils'
import type { PageImage } from './utils'

const img = (index: number, src: string, alt: string | null): PageImage => ({ index, src, alt })

describe('alt-check / extractImages', () => {
  it('提取 src 与 alt（双引号/单引号/无引号）', () => {
    const imgs = extractImages(
      `<img src="a.jpg" alt="A"><img src='b.png' alt='B'><img src=c.gif alt=C><img src="d.jpg">`,
    )
    expect(imgs).toEqual([
      { index: 1, src: 'a.jpg', alt: 'A' },
      { index: 2, src: 'b.png', alt: 'B' },
      { index: 3, src: 'c.gif', alt: 'C' },
      { index: 4, src: 'd.jpg', alt: null },
    ])
  })
  it('大小写与属性顺序不影响', () => {
    const imgs = extractImages('<IMG ALT="x" SRC="y.JPG">')
    expect(imgs).toEqual([{ index: 1, src: 'y.JPG', alt: 'x' }])
  })
  it('无 img 返回空数组', () => {
    expect(extractImages('<p>无图</p>')).toEqual([])
  })
  it('缺少 src 时 src 为空串', () => {
    expect(extractImages('<img alt="x">')).toEqual([{ index: 1, src: '', alt: 'x' }])
  })
})

describe('alt-check / isFilenameLike', () => {
  it('带图片扩展名的视为文件名', () => {
    expect(isFilenameLike('IMG_001.jpg')).toBe(true)
    expect(isFilenameLike('photo.PNG')).toBe(true)
  })
  it('IMG_001 / DSC0001 这类编号视为文件名', () => {
    expect(isFilenameLike('IMG_001')).toBe(true)
    expect(isFilenameLike('DSC0001')).toBe(true)
    expect(isFilenameLike('未命名')).toBe(true)
  })
  it('正常描述不视为文件名', () => {
    expect(isFilenameLike('一只橘猫在晒太阳')).toBe(false)
    expect(isFilenameLike('产品外观图')).toBe(false)
  })
})

describe('alt-check / findStuffedWord', () => {
  it('同一拉丁词出现 4 次检出', () => {
    expect(findStuffedWord('shoes cheap shoes buy shoes sale shoes')).toBe('shoes')
  })
  it('中文双字词出现 4 次检出', () => {
    expect(findStuffedWord('皮鞋皮鞋皮鞋皮鞋好')).toBe('皮鞋')
  })
  it('不足 4 次返回 null', () => {
    expect(findStuffedWord('shoes shoes shoes')).toBe(null)
    expect(findStuffedWord('一只可爱的橘猫')).toBe(null)
  })
})

describe('alt-check / checkAlts', () => {
  it('缺少 alt 属性', () => {
    const r = checkAlts([img(1, 'a.jpg', null)])
    expect(r.missing).toBe(1)
    expect(r.items[0].issues.some((i) => i.includes('缺少 alt'))).toBe(true)
    expect(r.passCount).toBe(0)
  })
  it('alt 为空', () => {
    const r = checkAlts([img(1, 'a.jpg', '   ')])
    expect(r.empty).toBe(1)
    expect(r.items[0].issues.some((i) => i.includes('为空'))).toBe(true)
  })
  it('alt 过长', () => {
    const r = checkAlts([img(1, 'a.jpg', '长'.repeat(ALT_MAX_LENGTH + 1))])
    expect(r.items[0].issues.some((i) => i.includes('过长'))).toBe(true)
  })
  it('alt 长度恰为上限时通过', () => {
    // 42 组不重复的双字母词 + 空格 = 恰好 125 字符，且无堆砌
    const pairs = Array.from(
      { length: 42 },
      (_, i) => String.fromCharCode(97 + (i % 26)) + String.fromCharCode(97 + ((i * 7 + 3) % 26)),
    )
    const alt = pairs.join(' ')
    expect([...alt].length).toBe(ALT_MAX_LENGTH)
    const r = checkAlts([img(1, 'a.jpg', alt)])
    expect(r.passCount).toBe(1)
  })
  it('alt 疑似文件名', () => {
    const r = checkAlts([img(1, 'a.jpg', 'IMG_001.jpg')])
    expect(r.items[0].issues.some((i) => i.includes('文件名'))).toBe(true)
  })
  it('关键词堆砌', () => {
    const r = checkAlts([img(1, 'a.jpg', '皮鞋皮鞋皮鞋皮鞋特价')])
    expect(r.items[0].issues.some((i) => i.includes('堆砌'))).toBe(true)
  })
  it('良好的 alt 通过', () => {
    const r = checkAlts([img(1, 'a.jpg', '一只橘猫在窗台上晒太阳')])
    expect(r.passCount).toBe(1)
    expect(r.passRate).toBe(1)
  })
  it('通过率统计', () => {
    const r = checkAlts([img(1, 'a.jpg', '好图'), img(2, 'b.jpg', null)])
    expect(r.total).toBe(2)
    expect(r.passCount).toBe(1)
    expect(r.passRate).toBe(0.5)
  })
  it('空数组时通过率为 1', () => {
    const r = checkAlts([])
    expect(r.total).toBe(0)
    expect(r.passRate).toBe(1)
  })
})

describe('alt-check / renderReport', () => {
  it('无问题时给出肯定结论', () => {
    const r = checkAlts([img(1, 'a.jpg', '好图')])
    const report = renderReport(r)
    expect(report).toContain('通过率：100%')
    expect(report).toContain('未发现问题')
  })
  it('有问题时列出清单', () => {
    const r = checkAlts([img(1, 'a.jpg', null), img(2, '', '   ')])
    const report = renderReport(r)
    expect(report).toContain('缺少 alt：1')
    expect(report).toContain('（无 alt 属性）')
    expect(report).toContain('问题清单')
  })
  it('无 src 的图片标注', () => {
    const r = checkAlts([img(1, '', null)])
    expect(renderReport(r)).toContain('（无 src）')
  })
})

describe('alt-check / analyzeHtml', () => {
  it('空输入报错', () => {
    expect(() => analyzeHtml('  ')).toThrow(AltCheckError)
  })
  it('超长输入报错', () => {
    expect(() => analyzeHtml('x'.repeat(200001))).toThrow(/上限/)
  })
  it('无 img 标签报错', () => {
    expect(() => analyzeHtml('<p>无图</p>')).toThrow(/<img>/)
  })
  it('正常返回结果', () => {
    const { images, result } = analyzeHtml('<img src="a.jpg" alt="好图">')
    expect(images).toHaveLength(1)
    expect(result.passCount).toBe(1)
  })
})
