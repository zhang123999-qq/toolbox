import { describe, expect, it } from 'vitest'
import {
  DescCheckError,
  analyzeDescription,
  displayWidth,
  findCtaWords,
  findRepeatedWords,
  renderReport,
} from './utils'

describe('desc-check / displayWidth', () => {
  it('ASCII 计 1，中文计 2', () => {
    expect(displayWidth('abc')).toBe(3)
    expect(displayWidth('中文')).toBe(4)
    expect(displayWidth('a中b')).toBe(4)
    expect(displayWidth('')).toBe(0)
  })
})

describe('desc-check / findRepeatedWords', () => {
  it('拉丁词出现 3 次及以上检出', () => {
    expect(findRepeatedWords('free download and free shipping, free trial')).toContain('free')
  })
  it('不足 3 次不检出', () => {
    expect(findRepeatedWords('free download now')).toEqual([])
  })
  it('中文双字词重复检出', () => {
    expect(findRepeatedWords('免费下载免费试用免费注册')).toContain('免费')
  })
  it('短拉丁词（<3 字母）不计入', () => {
    expect(findRepeatedWords('go go go go')).toEqual([])
  })
})

describe('desc-check / findCtaWords', () => {
  it('命中中英文 CTA 词', () => {
    const found = findCtaWords('立即免费下载试用 Free trial now')
    expect(found).toContain('立即')
    expect(found).toContain('免费')
    expect(found).toContain('free')
  })
  it('无命中返回空数组', () => {
    expect(findCtaWords('这是一段普通的描述文字')).toEqual([])
  })
})

describe('desc-check / analyzeDescription', () => {
  it('空输入报错', () => {
    expect(() => analyzeDescription('   ')).toThrow(DescCheckError)
    expect(() => analyzeDescription('   ')).toThrow(/请输入/)
  })
  it('超长输入报错', () => {
    expect(() => analyzeDescription('x'.repeat(200001))).toThrow(/上限/)
  })
  it('过短评级并扣分', () => {
    const a = analyzeDescription('太短了')
    expect(a.rating).toBe('过短')
    expect(a.score).toBeLessThan(100)
    expect(a.suggestions.some((s) => s.includes('过短'))).toBe(true)
  })
  it('过长评级', () => {
    const a = analyzeDescription('长'.repeat(200))
    expect(a.rating).toBe('过长')
    expect(a.width).toBe(400)
    expect(a.suggestions.some((s) => s.includes('截断'))).toBe(true)
  })
  it('合适长度满分附近', () => {
    const text =
      '免费在线工具箱收录上百种实用小工具，涵盖文本处理、编码转换、图片编辑与开发辅助，' +
      '界面简洁无需注册，打开网页即可使用，欢迎立即试用了解更多精彩功能。'
    const a = analyzeDescription(text)
    expect(a.rating).toBe('合适')
    expect(a.ctaFound.length).toBeGreaterThan(0)
    expect(a.repeatedWords).toEqual([])
    expect(a.score).toBe(100)
  })
  it('关键词缺失扣 15 分并给建议', () => {
    const a = analyzeDescription(
      '这是一段合适长度的中文描述文字内容填充到足够长。'.repeat(4),
      '关键词',
    )
    expect(a.keywordFound).toBe(false)
    expect(a.suggestions.some((s) => s.includes('关键词') && s.includes('未找到'))).toBe(true)
  })
  it('关键词前置不扣分，靠后扣 5 分', () => {
    const front = analyzeDescription('关键词' + '填充文字内容描述。'.repeat(12), '关键词')
    expect(front.keywordFound).toBe(true)
    expect(front.keywordFront).toBe(true)
    const back = analyzeDescription('填充文字内容描述。'.repeat(12) + '关键词', '关键词')
    expect(back.keywordFound).toBe(true)
    expect(back.keywordFront).toBe(false)
    expect(back.score).toBe(front.score - 5)
  })
  it('重复词扣分（每个 10 分，最多 20 分）', () => {
    const a = analyzeDescription(
      '免费免费免费免费，还有 free free free 的英文重复词测试填充。'.repeat(6),
    )
    expect(a.repeatedWords.length).toBeGreaterThan(0)
    expect(a.score).toBeLessThan(100)
    expect(a.suggestions.some((s) => s.includes('重复出现'))).toBe(true)
  })
  it('无关键词时不做关键词检查', () => {
    const a = analyzeDescription('合适长度的描述文字内容填充。'.repeat(10))
    expect(a.keyword).toBe('')
    expect(a.keywordFound).toBe(false)
    expect(a.suggestions.some((s) => s.includes('目标关键词'))).toBe(false)
  })
  it('各项良好时给出肯定建议', () => {
    const text =
      '关键词免费在线工具箱收录实用小工具，涵盖文本处理与编码转换，界面简洁无需注册，' +
      '打开网页即可使用，欢迎立即试用了解更多精彩功能。'
    const a = analyzeDescription(text, '关键词')
    expect(a.suggestions).toEqual(['描述长度与结构良好，关键词位置恰当'])
  })
})

describe('desc-check / renderReport', () => {
  it('报告包含关键行', () => {
    const a = analyzeDescription('关键词免费在线工具，立即下载试用了解更多。'.repeat(4), '关键词')
    const report = renderReport(a)
    expect(report).toContain('长度评级')
    expect(report).toContain('综合评分')
    expect(report).toContain('改写建议')
    expect(report).toContain('关键词')
  })
  it('关键词缺失 / 重复词 / 无 CTA 的分支', () => {
    const a = analyzeDescription(
      '免费免费免费免费普通描述文字内容填充足够长。'.repeat(6),
      '不存在的词',
    )
    const report = renderReport(a)
    expect(report).toContain('未找到')
    expect(a.repeatedWords).toContain('免费')
    expect(report).toContain(`重复词：${a.repeatedWords.join('、')}`)
  })
  it('关键词靠后 / 无重复词 / 无 CTA 的分支', () => {
    const a = analyzeDescription(
      '这是一段用于测试目标词位置的普通描述文字，内容需要足够长才能达到合适的展示宽度要求，填充一些不同的文字避免过短，关键词',
      '关键词',
    )
    expect(a.keywordFound).toBe(true)
    expect(a.keywordFront).toBe(false)
    expect(renderReport(a)).toContain('位置靠后')
    const noRepeat = analyzeDescription('甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉。')
    expect(noRepeat.repeatedWords).toEqual([])
    expect(renderReport(noRepeat)).toContain('重复词：无')
    expect(renderReport(noRepeat)).toContain('行动号召词：无')
  })
  it('无关键词时不输出关键词行', () => {
    const a = analyzeDescription('普通描述文字内容填充足够长度的文本段落。'.repeat(10))
    expect(renderReport(a)).not.toContain('目标关键词')
  })
})
