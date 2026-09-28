// @vitest-environment jsdom
/**
 * keyboard-nav（#719）utils 单测：jsdom 真实 DOMParser + 可注入工厂。
 */
import { describe, expect, it, vi } from 'vitest'
import { analyzeKeyboardNav, formatAnalysis, type DocFactory } from './utils'

const factory: DocFactory = (html) => new DOMParser().parseFromString(html, 'text/html')

function issuesOf(html: string) {
  return analyzeKeyboardNav(html, factory).issues
}

describe('parseHtml 空输入', () => {
  it('空输入抛中文错', () => {
    expect(() => analyzeKeyboardNav('')).toThrow('请输入 HTML')
    expect(() => analyzeKeyboardNav('   ')).toThrow('请输入 HTML')
  })
  it('可注入自定义工厂', () => {
    const spy = vi.fn(factory)
    analyzeKeyboardNav('<button>x</button>', spy)
    expect(spy).toHaveBeenCalledWith('<button>x</button>')
  })
  it('默认工厂（不传参）', () => {
    expect(analyzeKeyboardNav('<button>x</button>').stats.total).toBe(1)
  })
})

describe('可聚焦元素收集', () => {
  it('收集各类可聚焦元素并统计', () => {
    const a = analyzeKeyboardNav(
      '<a href="/x">链</a><button>按</button><input><select></select><textarea></textarea>',
      factory,
    )
    expect(a.stats.total).toBe(5)
    expect(a.stats.byTag).toEqual({ a: 1, button: 1, input: 1, select: 1, textarea: 1 })
    expect(a.focusable[0]).toEqual({ tag: 'a', text: '<a> "链"', tabIndex: 0 })
  })
  it('跳过 disabled 与 hidden', () => {
    const a = analyzeKeyboardNav(
      '<button disabled>x</button><input type="hidden"><input disabled><button>y</button>',
      factory,
    )
    expect(a.stats.total).toBe(1)
  })
  it('contenteditable=false 跳过，true 收录', () => {
    const a = analyzeKeyboardNav(
      '<div contenteditable="false">a</div><div contenteditable="true">b</div>',
      factory,
    )
    expect(a.stats.total).toBe(1)
    expect(a.focusable[0].tag).toBe('div')
  })
  it('无 type 的 input 按 text 处理', () => {
    const a = analyzeKeyboardNav('<input>', factory)
    expect(a.stats.total).toBe(1)
  })
  it('describe 取 aria-label / value / 空', () => {
    const a = analyzeKeyboardNav(
      '<button aria-label="关闭"></button><input type="submit" value="发送"><button></button>',
      factory,
    )
    expect(a.focusable[0].text).toBe('<button> "关闭"')
    expect(a.focusable[1].text).toBe('<input> "发送"')
    expect(a.focusable[2].text).toBe('<button>')
  })
  it('超长文本截断', () => {
    const a = analyzeKeyboardNav(`<button>${'长'.repeat(100)}</button>`, factory)
    expect(a.focusable[0].text.endsWith('…"')).toBe(true)
  })
})

describe('tabindex 检查', () => {
  it('tabindex=0 与 -1 无警告', () => {
    const a = analyzeKeyboardNav(
      '<button tabindex="0">a</button><button tabindex="-1">b</button>',
      factory,
    )
    expect(a.issues.filter((i) => i.severity !== 'info')).toHaveLength(0)
  })
  it('正 tabindex 警告', () => {
    const issues = issuesOf('<button tabindex="3">a</button>')
    expect(issues.some((i) => i.message.includes('正 tabindex'))).toBe(true)
  })
  it('重复正 tabindex 警告', () => {
    const issues = issuesOf('<button tabindex="2">a</button><a href="/x" tabindex="2">b</a>')
    expect(issues.some((i) => i.message.includes('共用 tabindex="2"'))).toBe(true)
  })
  it('不重复的正 tabindex 不报重复', () => {
    const issues = issuesOf('<button tabindex="2">a</button>')
    expect(issues.some((i) => i.message.includes('共用'))).toBe(false)
  })
  it('tabindex=-2 报错', () => {
    const issues = issuesOf('<button tabindex="-2">a</button>')
    expect(issues.some((i) => i.severity === 'error' && i.message.includes('tabindex="-2"'))).toBe(
      true,
    )
  })
  it('非整数 tabindex 报错并跳过该元素', () => {
    const a = analyzeKeyboardNav('<button tabindex="foo">a</button><button>b</button>', factory)
    expect(a.issues.some((i) => i.message.includes('必须为整数'))).toBe(true)
    expect(a.stats.total).toBe(1)
  })
})

describe('语义检查', () => {
  it('a 无 href 警告', () => {
    const issues = issuesOf('<a tabindex="0">无链</a>')
    expect(issues.some((i) => i.message.includes('无 href'))).toBe(true)
  })
  it('div onclick 无 role/tabindex 警告', () => {
    const issues = issuesOf('<div onclick="go()">点我</div>')
    expect(issues.some((i) => i.message.includes('模拟可交互元素'))).toBe(true)
  })
  it('div onclick 有 role 时不警告', () => {
    const issues = issuesOf('<div onclick="go()" role="button" tabindex="0">点我</div>')
    expect(issues.some((i) => i.message.includes('模拟可交互元素'))).toBe(false)
  })
  it('div onclick 有 tabindex 无 role 时不警告', () => {
    const issues = issuesOf('<div onclick="go()" tabindex="0">点我</div>')
    expect(issues.some((i) => i.message.includes('模拟可交互元素'))).toBe(false)
  })
  it('无 on* 属性的 div/span 不检查', () => {
    const issues = issuesOf('<div class="box">x</div><span id="s">y</span><button>z</button>')
    expect(issues.some((i) => i.message.includes('模拟可交互元素'))).toBe(false)
  })
  it('span onmouseover 同样识别', () => {
    const issues = issuesOf('<span onmouseover="h()">x</span>')
    expect(issues.some((i) => i.message.includes('模拟可交互元素'))).toBe(true)
  })
})

describe('跳过链接', () => {
  it('缺失时给 info 建议', () => {
    const issues = issuesOf('<button>a</button>')
    expect(issues.some((i) => i.severity === 'info' && i.message.includes('跳过链接'))).toBe(true)
  })
  it('存在时不给建议', () => {
    const issues = issuesOf(
      '<a href="#main">跳到主要内容</a><main id="main"><button>a</button></main>',
    )
    expect(issues.some((i) => i.message.includes('跳过链接'))).toBe(false)
  })
  it('无可聚焦元素时不给建议', () => {
    const a = analyzeKeyboardNav('<div>纯文本</div>', factory)
    expect(a.issues).toHaveLength(0)
  })
})

describe('formatAnalysis', () => {
  it('完整输出含统计、顺序与三种级别', () => {
    const a = analyzeKeyboardNav(
      '<button tabindex="1">先</button><button>后</button><button tabindex="-1">藏</button><div onclick="g()">x</div>',
      factory,
    )
    const text = formatAnalysis(a)
    expect(text).toContain('可聚焦元素：3 个')
    expect(text).toContain('- <button>：3 个')
    expect(text).toContain('[tabindex=1] <button> "先"')
    expect(text).toContain('⚠')
    expect(text).toContain('ℹ')
  })
  it('error 标记', () => {
    const a = analyzeKeyboardNav('<button tabindex="-5">x</button>', factory)
    expect(formatAnalysis(a)).toContain('✗')
  })
  it('无问题时标注通过', () => {
    const a = analyzeKeyboardNav('<a href="#c">跳过</a><button>x</button>', factory)
    expect(formatAnalysis(a)).toContain('未发现问题 ✓')
  })
  it('超过 20 个时截断', () => {
    const html = Array.from({ length: 25 }, (_, i) => `<button>b${i}</button>`).join('')
    const text = formatAnalysis(analyzeKeyboardNav(html, factory))
    expect(text).toContain('还有 5 个')
  })
  it('Tab 顺序：正 tabindex 优先', () => {
    const a = analyzeKeyboardNav(
      '<a href="#c">跳过</a><button>自然</button><button tabindex="2">优先</button>',
      factory,
    )
    const text = formatAnalysis(a)
    const orderSection = text.split('Tab 顺序')[1]
    expect(orderSection.indexOf('优先')).toBeLessThan(orderSection.indexOf('自然'))
  })
})
