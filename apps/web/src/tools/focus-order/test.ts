// @vitest-environment jsdom
/**
 * focus-order（#720）utils 单测：Tab 顺序可视化。
 */
import { describe, expect, it, vi } from 'vitest'
import { formatTabOrder, getTabOrder, type DocFactory } from './utils'

const factory: DocFactory = (html) => new DOMParser().parseFromString(html, 'text/html')

describe('parseHtml 空输入', () => {
  it('空输入抛中文错', () => {
    expect(() => getTabOrder('')).toThrow('请输入 HTML')
    expect(() => getTabOrder('  \n ')).toThrow('请输入 HTML')
  })
  it('可注入自定义工厂', () => {
    const spy = vi.fn(factory)
    getTabOrder('<button>x</button>', spy)
    expect(spy).toHaveBeenCalledWith('<button>x</button>')
  })
  it('默认工厂（不传参）', () => {
    expect(getTabOrder('<button>x</button>').total).toBe(1)
  })
})

describe('Tab 顺序规则', () => {
  it('纯 DOM 顺序', () => {
    const r = getTabOrder('<a href="/a">一</a><button>二</button><input value="三">', factory)
    expect(r.order.map((i) => i.order)).toEqual([1, 2, 3])
    expect(r.order.map((i) => i.label)).toEqual(['<a> "一"', '<button> "二"', '<input> "三"'])
  })
  it('正 tabindex 按数值优先', () => {
    const r = getTabOrder(
      '<button>自然</button><button tabindex="2">后</button><button tabindex="1">先</button>',
      factory,
    )
    expect(r.order.map((i) => i.label)).toEqual([
      '<button> "先"',
      '<button> "后"',
      '<button> "自然"',
    ])
  })
  it('同值正 tabindex 保持 DOM 先后（稳定）', () => {
    const r = getTabOrder('<button tabindex="1">甲</button><button tabindex="1">乙</button>', factory)
    expect(r.order.map((i) => i.label)).toEqual(['<button> "甲"', '<button> "乙"'])
  })
  it('tabindex=-1 跳过顺序单独列出', () => {
    const r = getTabOrder('<button>可见</button><button tabindex="-1">脚本</button>', factory)
    expect(r.order).toHaveLength(1)
    expect(r.skipped).toHaveLength(1)
    expect(r.skipped[0].label).toBe('<button> "脚本"')
    expect(r.total).toBe(2)
  })
  it('非法 tabindex 按 0 处理', () => {
    const r = getTabOrder('<button tabindex="abc">a</button><button>b</button>', factory)
    expect(r.order[0].tabIndex).toBe(0)
    expect(r.order.map((i) => i.label)).toEqual(['<button> "a"', '<button> "b"'])
  })
  it('tabindex 小数按 0 处理', () => {
    const r = getTabOrder('<button tabindex="1.5">a</button>', factory)
    expect(r.order[0].tabIndex).toBe(0)
  })
})

describe('元素收集', () => {
  it('跳过 disabled / hidden / contenteditable=false', () => {
    const r = getTabOrder(
      '<button disabled>a</button><input type="hidden"><div contenteditable="false">x</div><button>b</button>',
      factory,
    )
    expect(r.total).toBe(1)
    expect(r.order[0].label).toBe('<button> "b"')
  })
  it('label 取 aria-label 优先', () => {
    const r = getTabOrder('<button aria-label="关闭">×</button>', factory)
    expect(r.order[0].label).toBe('<button> "关闭"')
  })
  it('无文本时取 value', () => {
    const r = getTabOrder('<input type="submit" value="发送">', factory)
    expect(r.order[0].label).toBe('<input> "发送"')
  })
  it('无文本无 label 时只显示标签', () => {
    const r = getTabOrder('<button></button>', factory)
    expect(r.order[0].label).toBe('<button>')
  })
  it('超长文本截断', () => {
    const r = getTabOrder(`<button>${'长'.repeat(100)}</button>`, factory)
    expect(r.order[0].label.endsWith('…"')).toBe(true)
  })
  it('多空白折叠', () => {
    const r = getTabOrder('<button>确\n  定</button>', factory)
    expect(r.order[0].label).toBe('<button> "确 定"')
  })
})

describe('formatTabOrder', () => {
  it('编号徽章式输出', () => {
    const r = getTabOrder('<button>一</button><button>二</button>', factory)
    const text = formatTabOrder(r)
    expect(text).toContain('Tab 顺序共 2 个可聚焦元素')
    expect(text).toContain(' 1. [tabindex=0] <button> "一"')
    expect(text).toContain(' 2. [tabindex=0] <button> "二"')
    expect(text).toContain('说明：')
  })
  it('含跳过元素时列出', () => {
    const r = getTabOrder('<button>a</button><a href="/x" tabindex="-1">跳过我</a>', factory)
    const text = formatTabOrder(r)
    expect(text).toContain('跳过 Tab 顺序（tabindex="-1"，共 1 个）')
    expect(text).toContain('<a> "跳过我"')
  })
  it('无跳过元素时不出现跳过段', () => {
    const r = getTabOrder('<button>a</button>', factory)
    expect(formatTabOrder(r)).not.toContain('跳过 Tab 顺序')
  })
})
