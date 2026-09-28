import { describe, expect, it } from 'vitest'
import {
  HeadingCheckError,
  analyzeHtml,
  checkHeadings,
  cleanHeadingText,
  parseHeadings,
  renderOutline,
  renderReport,
} from './utils'
import type { Heading } from './utils'

const h = (order: number, level: Heading['level'], text: string): Heading => ({
  order,
  level,
  text,
})

describe('heading-check / cleanHeadingText', () => {
  it('去掉内层标签并解码常见实体', () => {
    expect(cleanHeadingText('<span>你好</span>&nbsp;世界&amp;')).toBe('你好 世界&')
    expect(cleanHeadingText('&lt;tag&gt; &quot;q&quot;')).toBe('<tag> "q"')
  })
  it('压缩空白', () => {
    expect(cleanHeadingText('  a\n\n  b  ')).toBe('a b')
  })
})

describe('heading-check / parseHeadings', () => {
  it('按顺序提取 h1–h6', () => {
    const hs = parseHeadings('<h1>主标题</h1><p>x</p><h2 class="a">副 <b>标题</b></h2><H3>三</H3>')
    expect(hs).toEqual([
      { order: 1, level: 1, text: '主标题' },
      { order: 2, level: 2, text: '副 标题' },
      { order: 3, level: 3, text: '三' },
    ])
  })
  it('无标题返回空数组', () => {
    expect(parseHeadings('<p>没有标题</p>')).toEqual([])
  })
  it('属性与大小写混用可解析', () => {
    const hs = parseHeadings('<H2 ID="x">T</H2>')
    expect(hs).toHaveLength(1)
    expect(hs[0].level).toBe(2)
  })
})

describe('heading-check / checkHeadings', () => {
  it('空数组：0 分并报错', () => {
    const r = checkHeadings([])
    expect(r.score).toBe(0)
    expect(r.total).toBe(0)
    expect(r.issues.some((i) => i.level === 'error')).toBe(true)
  })
  it('缺少 h1 扣 30 分', () => {
    const r = checkHeadings([h(1, 2, '副标题'), h(2, 3, '小标题')])
    expect(r.h1Count).toBe(0)
    expect(r.score).toBe(70)
    expect(r.issues.some((i) => i.message.includes('缺少 h1'))).toBe(true)
  })
  it('多个 h1 扣 15 分', () => {
    const r = checkHeadings([h(1, 1, '一'), h(2, 1, '二')])
    expect(r.h1Count).toBe(2)
    expect(r.score).toBe(85)
  })
  it('层级跳跃告警（h1→h3）', () => {
    const r = checkHeadings([h(1, 1, '主'), h(2, 3, '跳')])
    expect(r.issues.some((i) => i.message.includes('跳到 h3'))).toBe(true)
    expect(r.score).toBe(90)
  })
  it('空标题告警', () => {
    const r = checkHeadings([h(1, 1, '主'), h(2, 2, '')])
    expect(r.issues.some((i) => i.message.includes('内容为空'))).toBe(true)
    expect(r.score).toBe(90)
  })
  it('过长标题告警（>70 字符）', () => {
    const r = checkHeadings([h(1, 1, '主'), h(2, 2, '长'.repeat(71))])
    expect(r.issues.some((i) => i.message.includes('过长'))).toBe(true)
    expect(r.score).toBe(95)
  })
  it('重复标题告警', () => {
    const r = checkHeadings([h(1, 1, '主'), h(2, 2, '同'), h(3, 2, '同')])
    expect(r.issues.some((i) => i.message.includes('重复出现 2 次'))).toBe(true)
    expect(r.score).toBe(90)
  })
  it('空标题不计入重复', () => {
    const r = checkHeadings([h(1, 1, '主'), h(2, 2, ''), h(3, 2, '')])
    expect(r.issues.some((i) => i.message.includes('重复出现'))).toBe(false)
    // 两个空标题：-20
    expect(r.score).toBe(80)
  })
  it('结构良好满分', () => {
    const r = checkHeadings([
      h(1, 1, '主标题'),
      h(2, 2, '副标题一'),
      h(3, 3, '小节'),
      h(4, 2, '副标题二'),
    ])
    expect(r.score).toBe(100)
    expect(r.issues).toEqual([])
  })
  it('多项惩罚叠加有上限', () => {
    const many = [h(1, 1, '主')]
    for (let i = 0; i < 10; i++) many.push(h(i + 2, i % 2 === 0 ? 2 : 4, `标题${i}`))
    const r = checkHeadings(many)
    // h2→h4 跳跃 5 次，惩罚上限 30
    expect(r.score).toBe(70)
  })
})

describe('heading-check / renderOutline', () => {
  it('按层级缩进', () => {
    const out = renderOutline([h(1, 1, '主'), h(2, 2, '副'), h(3, 2, '')])
    expect(out).toBe('h1 主\n  h2 副\n  h2 （空）')
  })
})

describe('heading-check / renderReport', () => {
  it('有问题时列出问题', () => {
    const hs = parseHeadings('<h2>只有副标题</h2>')
    const r = checkHeadings(hs)
    const report = renderReport(hs, r)
    expect(report).toContain('缺少 h1')
    expect(report).toContain('[错误]')
    expect(report).toContain('综合评分')
  })
  it('无问题时给出肯定结论', () => {
    const hs = parseHeadings('<h1>主</h1><h2>副</h2>')
    const r = checkHeadings(hs)
    expect(renderReport(hs, r)).toContain('未发现问题')
  })
  it('只有警告时标注 [警告]', () => {
    const hs = parseHeadings('<h1>主</h1><h3>跳级</h3>')
    const r = checkHeadings(hs)
    expect(r.issues.every((i) => i.level === 'warning')).toBe(true)
    expect(renderReport(hs, r)).toContain('[警告]')
  })
})

describe('heading-check / analyzeHtml', () => {
  it('空输入报错', () => {
    expect(() => analyzeHtml('  ')).toThrow(HeadingCheckError)
  })
  it('超长输入报错', () => {
    expect(() => analyzeHtml('x'.repeat(200001))).toThrow(/上限/)
  })
  it('正常返回解析与检查结果', () => {
    const { headings, result } = analyzeHtml('<h1>主</h1><h2>副</h2>')
    expect(headings).toHaveLength(2)
    expect(result.score).toBe(100)
  })
})
