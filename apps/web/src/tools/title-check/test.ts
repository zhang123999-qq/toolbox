import { describe, expect, it } from 'vitest'
import type { TitleCheckOptions } from './schema'
import {
  analyzeTitle,
  displayWidth,
  findDuplicates,
  rateWidth,
  renderAnalysis,
  tokenize,
  transform,
} from './utils'

const base: TitleCheckOptions = { keyword: '' }

describe('title-check / displayWidth', () => {
  it('纯英文半角计 1', () => {
    expect(displayWidth('Hello')).toBe(5)
  })
  it('纯中文全角计 2', () => {
    expect(displayWidth('你好')).toBe(4)
  })
  it('中英混合累加', () => {
    expect(displayWidth('Hi你好')).toBe(6)
  })
  it('emoji 按码点计 2', () => {
    expect(displayWidth('😀')).toBe(2)
  })
  it('空串宽度为 0', () => {
    expect(displayWidth('')).toBe(0)
  })
})

describe('title-check / rateWidth', () => {
  it('29 为过短', () => {
    expect(rateWidth(29)).toBe('过短')
  })
  it('30 为合适', () => {
    expect(rateWidth(30)).toBe('合适')
  })
  it('60 为合适', () => {
    expect(rateWidth(60)).toBe('合适')
  })
  it('61 为过长', () => {
    expect(rateWidth(61)).toBe('过长')
  })
})

describe('title-check / tokenize', () => {
  it('中英混合分词', () => {
    expect(tokenize('Hello 世界！World')).toEqual(['hello', '世', '界', 'world'])
  })
  it('英文转小写', () => {
    expect(tokenize('ABC abc')).toEqual(['abc', 'abc'])
  })
  it('数字保留在英文词中', () => {
    expect(tokenize('abc123')).toEqual(['abc123'])
  })
  it('空串返回空数组', () => {
    expect(tokenize('')).toEqual([])
  })
  it('无可匹配字符返回空数组', () => {
    expect(tokenize('！？，。')).toEqual([])
  })
})

describe('title-check / findDuplicates', () => {
  it('无重复返回空数组', () => {
    expect(findDuplicates(['a', 'b', 'c'])).toEqual([])
  })
  it('有重复按首次出现顺序返回', () => {
    expect(findDuplicates(['a', 'b', 'a', 'c', 'b'])).toEqual(['a', 'b'])
  })
  it('出现三次只返回一次', () => {
    expect(findDuplicates(['a', 'a', 'a'])).toEqual(['a'])
  })
})

describe('title-check / analyzeTitle', () => {
  it('空标题抛中文错', () => {
    expect(() => analyzeTitle('')).toThrow(/请输入页面标题/)
    expect(() => analyzeTitle('   ')).toThrow(/请输入页面标题/)
  })
  it('过短标题评级与建议', () => {
    const a = analyzeTitle('Hi')
    expect(a.rating).toBe('过短')
    expect(a.width).toBe(2)
    expect(a.length).toBe(2)
    expect(a.truncated).toBe('Hi')
    expect(a.suggestions).toContain('标题过短，建议 30–60 显示宽度')
  })
  it('合适长度标题', () => {
    const a = analyzeTitle('2026年最好的10款无线耳机推荐：实测对比')
    expect(a.width).toBe(38)
    expect(a.rating).toBe('合适')
    expect(a.truncated).toBe(a.title)
  })
  it('过长标题评级与截断建议', () => {
    const a = analyzeTitle('2026年最好的10款无线耳机推荐：实测对比与选购指南大全集锦终极版')
    expect(a.rating).toBe('过长')
    expect(a.suggestions).toContain('标题过长，Google 约 60 宽度后截断，重要信息前置')
    expect(a.truncated.endsWith('…')).toBe(true)
  })
  it('截断不拆散宽字符', () => {
    const a = analyzeTitle('啊'.repeat(40))
    expect(a.width).toBe(80)
    expect(a.truncated).toBe('啊'.repeat(30) + '…')
    expect(displayWidth(a.truncated.replace('…', ''))).toBeLessThanOrEqual(60)
  })
  it('关键词前置为 true', () => {
    const a = analyzeTitle('无线耳机推荐：2026年最好的10款', '无线耳机')
    expect(a.keywordFirst).toBe(true)
  })
  it('关键词在后半部分为 false 并给出建议', () => {
    const a = analyzeTitle('2026年度盘点：最好的无线耳机推荐', '无线耳机')
    expect(a.keywordFirst).toBe(false)
    expect(a.suggestions).toContain('目标关键词未前置，建议放到标题前部')
  })
  it('关键词为空时 keywordFirst 为 null', () => {
    expect(analyzeTitle('2026年最好的10款无线耳机推荐').keywordFirst).toBeNull()
  })
  it('省略 keyword 参数时 keywordFirst 为 null', () => {
    expect(analyzeTitle('2026年最好的10款无线耳机推荐').keywordFirst).toBeNull()
  })
  it('中文关键词直接匹配', () => {
    const a = analyzeTitle('无线耳机推荐指南', '无线耳机')
    expect(a.keywordFirst).toBe(true)
  })
  it('关键词匹配大小写不敏感', () => {
    const a = analyzeTitle('Best Wireless Earbuds Review 2026', 'WIRELESS')
    expect(a.keywordFirst).toBe(true)
  })
  it('重复词检测与建议', () => {
    const a = analyzeTitle('耳机 耳机 headphone headphone test')
    expect(a.duplicates).toEqual(['耳', '机', 'headphone'])
    expect(a.suggestions).toContain('存在重复词：耳、机、headphone，建议精简')
  })
  it('年份识别为加分项', () => {
    expect(analyzeTitle('2026年最好的耳机推荐').hasYear).toBe(true)
    expect(analyzeTitle('最好的耳机推荐').hasYear).toBe(false)
  })
  it('无数字给出加数字建议', () => {
    const a = analyzeTitle('最好的无线耳机推荐指南')
    expect(a.hasNumber).toBe(false)
    expect(a.suggestions).toContain('可考虑加入数字/年份提升点击率')
  })
  it('全优标题给出肯定建议', () => {
    const a = analyzeTitle('无线耳机推荐：2026年最好的10款实测对比', '无线耳机')
    expect(a.rating).toBe('合适')
    expect(a.keywordFirst).toBe(true)
    expect(a.duplicates).toEqual([])
    expect(a.hasNumber).toBe(true)
    expect(a.suggestions).toEqual(['标题长度合适，关键词前置，无重复词'])
  })
})

describe('title-check / renderAnalysis', () => {
  it('渲染过长标题报告', () => {
    const a = analyzeTitle(
      '2026年最好的10款无线耳机推荐：实测对比与选购指南大全集锦终极版',
      '选购指南',
    )
    const out = renderAnalysis(a)
    expect(out).toContain('评级：过长')
    expect(out).toContain('截断预览：')
    expect(out).toContain('…')
    expect(out).toContain('目标关键词：选购指南')
    expect(out).toContain('关键词前置：否')
    expect(out).toContain('含数字：是')
    expect(out).toContain('含年份：是')
    expect(out).toContain('建议：')
    expect(out).toContain('- 标题过长')
  })
  it('渲染短标题报告（无截断预览、未填关键词）', () => {
    const out = renderAnalysis(analyzeTitle('Hi'))
    expect(out).toContain('显示宽度：2')
    expect(out).toContain('评级：过短')
    expect(out).not.toContain('截断预览')
    expect(out).toContain('目标关键词：（未填写）')
    expect(out).toContain('关键词前置：未检测')
    expect(out).toContain('重复词：无')
    expect(out).toContain('含数字：否')
    expect(out).toContain('含年份：否')
  })
  it('渲染关键词前置为是的报告', () => {
    const out = renderAnalysis(analyzeTitle('无线耳机推荐：2026年最好的10款实测对比', '无线耳机'))
    expect(out).toContain('关键词前置：是')
    expect(out).toContain('重复词：无')
  })
  it('渲染含重复词的报告', () => {
    const out = renderAnalysis(analyzeTitle('耳机 耳机 test test'))
    expect(out).toContain('重复词：耳、机、test')
  })
})

describe('title-check / transform', () => {
  it('空输入返回空串', async () => {
    await expect(transform({ text: '   ' }, base)).resolves.toBe('')
  })
  it('超长输入报错', async () => {
    await expect(transform({ text: 'x'.repeat(200001) }, base)).rejects.toThrow(/上限/)
  })
  it('正常输入输出完整报告', async () => {
    const out = await transform({ text: '2026年最好的10款无线耳机推荐' }, { keyword: '无线耳机' })
    expect(out).toContain('评级')
    expect(out).toContain('显示宽度')
    expect(out).toContain('建议')
  })
})
