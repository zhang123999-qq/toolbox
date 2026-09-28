// @vitest-environment jsdom
/**
 * heading-structure（#732）utils 单测：jsdom 真实 DOMParser + 可注入工厂。
 */
import { describe, expect, it, vi } from 'vitest'
import {
  analyzeHeadings,
  formatHeadingReport,
  scoreGrade,
  type DocFactory,
} from './utils'

const factory: DocFactory = (html) => new DOMParser().parseFromString(html, 'text/html')

describe('parseHtml 空输入', () => {
  it('空输入抛中文错', () => {
    expect(() => analyzeHeadings('')).toThrow('请输入 HTML')
    expect(() => analyzeHeadings('   ')).toThrow('请输入 HTML')
  })
  it('可注入自定义工厂', () => {
    const spy = vi.fn(factory)
    analyzeHeadings('<h1>x</h1>', spy)
    expect(spy).toHaveBeenCalledWith('<h1>x</h1>')
  })
  it('默认工厂（不传参）', () => {
    expect(analyzeHeadings('<h1>x</h1>').stats.total).toBe(1)
  })
})

describe('大纲提取', () => {
  it('按顺序提取 h1–h6', () => {
    const a = analyzeHeadings('<h1>A</h1><h2>B</h2><h3>C</h3>', factory)
    expect(a.outline).toEqual([
      { level: 1, text: 'A', order: 1 },
      { level: 2, text: 'B', order: 2 },
      { level: 3, text: 'C', order: 3 },
    ])
    expect(a.stats).toEqual({ total: 3, h1Count: 1 })
  })
  it('文本去空白并截断', () => {
    const a = analyzeHeadings('<h2>  a   b  </h2>', factory)
    expect(a.outline[0]?.text).toBe('a b')
  })
  it('无标题时评分为 0 并给提示', () => {
    const a = analyzeHeadings('<p>正文</p>', factory)
    expect(a.score).toBe(0)
    expect(a.issues[0]?.severity).toBe('info')
    expect(a.issues[0]?.message).toContain('未找到任何标题')
    expect(a.stats).toEqual({ total: 0, h1Count: 0 })
  })
})

describe('结构问题检查', () => {
  it('缺少 h1 报错误扣 25 分', () => {
    const a = analyzeHeadings('<h2>A</h2>', factory)
    expect(a.issues.some((i) => i.message.includes('缺少 h1'))).toBe(true)
    expect(a.score).toBe(75)
  })
  it('多个 h1 报警告扣 15 分', () => {
    const a = analyzeHeadings('<h1>A</h1><h1>B</h1>', factory)
    expect(a.issues.some((i) => i.message.includes('2 个 h1'))).toBe(true)
    expect(a.score).toBe(85)
  })
  it('层级跳跃报警告扣 10 分', () => {
    const a = analyzeHeadings('<h1>A</h1><h3>B</h3>', factory)
    const issue = a.issues.find((i) => i.message.includes('层级跳跃'))
    expect(issue?.message).toContain('从 h1 直接跳到 h3')
    expect(issue?.suggestion).toContain('h2')
    expect(a.score).toBe(90)
  })
  it('空标题报错误扣 20 分', () => {
    const a = analyzeHeadings('<h1>A</h1><h2>   </h2>', factory)
    expect(a.issues.some((i) => i.message.includes('空标题'))).toBe(true)
    expect(a.score).toBe(80)
  })
  it('过长标题报警告扣 5 分', () => {
    const a = analyzeHeadings(`<h1>A</h1><h2>${'x'.repeat(71)}</h2>`, factory)
    const issue = a.issues.find((i) => i.message.includes('标题过长'))
    expect(issue?.message).toContain('71 字')
    expect(a.score).toBe(95)
  })
  it('70 字整不警告', () => {
    const a = analyzeHeadings(`<h1>${'x'.repeat(70)}</h1>`, factory)
    expect(a.issues.some((i) => i.message.includes('标题过长'))).toBe(false)
    expect(a.score).toBe(100)
  })
  it('完美结构满分无问题', () => {
    const a = analyzeHeadings('<h1>A</h1><h2>B</h2><h3>C</h3><h2>D</h2>', factory)
    expect(a.score).toBe(100)
    expect(a.issues).toEqual([])
  })
  it('分数不低于 0', () => {
    const a = analyzeHeadings('<h2></h2><h4></h4><h6></h6>', factory)
    expect(a.score).toBeGreaterThanOrEqual(0)
  })
})

describe('scoreGrade', () => {
  it('四档等级', () => {
    expect(scoreGrade(95)).toBe('优秀')
    expect(scoreGrade(90)).toBe('优秀')
    expect(scoreGrade(80)).toBe('良好')
    expect(scoreGrade(75)).toBe('良好')
    expect(scoreGrade(65)).toBe('及格')
    expect(scoreGrade(60)).toBe('及格')
    expect(scoreGrade(59)).toBe('需改进')
    expect(scoreGrade(0)).toBe('需改进')
  })
})

describe('formatHeadingReport', () => {
  it('报告含评分、大纲与问题', () => {
    const r = formatHeadingReport(analyzeHeadings('<h1>A</h1><h1>B</h1><h3>C</h3>', factory))
    expect(r).toContain('标题结构评分：75 分')
    expect(r).toContain('标题总数：3')
    expect(r).toContain('h1 A')
    expect(r).toContain('    h3 C')
    expect(r).toContain('[警告]')
    expect(r).toContain('建议：')
  })
  it('无问题时显示通过', () => {
    const r = formatHeadingReport(analyzeHeadings('<h1>A</h1>', factory))
    expect(r).toContain('未发现结构问题 ✓')
  })
  it('无标题时大纲显示（无）', () => {
    const r = formatHeadingReport(analyzeHeadings('<p>x</p>', factory))
    expect(r).toContain('（无）')
  })
  it('空标题在大纲中标注', () => {
    const r = formatHeadingReport(analyzeHeadings('<h1>A</h1><h2></h2>', factory))
    expect(r).toContain('（空标题）')
  })
  it('错误级别标注为错误', () => {
    const r = formatHeadingReport(analyzeHeadings('<h2>A</h2>', factory))
    expect(r).toContain('[错误]')
  })
})
