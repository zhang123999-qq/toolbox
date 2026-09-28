/**
 * aria-gen（#717）utils 单测：8 种组件片段、校验分支、HTML 转义。
 */
import { describe, expect, it } from 'vitest'
import {
  ARIA_TYPES,
  buildAriaSnippet,
  escapeHtml,
  parseAriaOptions,
  parseAriaType,
} from './utils'

describe('parseAriaType', () => {
  it('8 种类型全部合法', () => {
    expect(ARIA_TYPES).toHaveLength(8)
    for (const t of ARIA_TYPES) expect(parseAriaType(t)).toBe(t)
  })
  it('非法类型抛错', () => {
    expect(() => parseAriaType('marquee')).toThrow('不支持的组件类型')
    expect(() => parseAriaType('')).toThrow('不支持的组件类型')
  })
})

describe('escapeHtml', () => {
  it('转义 5 种特殊字符', () => {
    expect(escapeHtml('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&#39;')
  })
  it('普通文本不变', () => {
    expect(escapeHtml('提交订单')).toBe('提交订单')
  })
})

describe('parseAriaOptions', () => {
  it('完整解析', () => {
    const o = parseAriaOptions({ label: ' 音量 ', id: ' vol ', describedBy: ' help ', min: '0', max: '100', value: '50' })
    expect(o).toEqual({ label: '音量', id: 'vol', describedBy: 'help', min: 0, max: 100, value: 50 })
  })
  it('空串视为未提供', () => {
    const o = parseAriaOptions({ label: 'x', id: '', describedBy: '', min: '', max: '', value: '' })
    expect(o.id).toBeUndefined()
    expect(o.describedBy).toBeUndefined()
    expect(o.min).toBeUndefined()
    expect(o.max).toBeUndefined()
    expect(o.value).toBeUndefined()
  })
  it('缺省可选字段为 undefined', () => {
    const o = parseAriaOptions({ label: 'x' })
    expect(o.id).toBeUndefined()
    expect(o.min).toBeUndefined()
  })
  it('label 为空抛错', () => {
    expect(() => parseAriaOptions({ label: '   ' })).toThrow('label')
  })
  it('非数字抛错', () => {
    expect(() => parseAriaOptions({ label: 'x', min: 'abc' })).toThrow('最小值必须是数字')
    expect(() => parseAriaOptions({ label: 'x', max: 'abc' })).toThrow('最大值必须是数字')
    expect(() => parseAriaOptions({ label: 'x', value: 'abc' })).toThrow('当前值必须是数字')
  })
})

describe('buildAriaSnippet 各组件', () => {
  const base = { label: '提交' }

  it('button 含 aria-label 与说明', () => {
    const s = buildAriaSnippet('button', base)
    expect(s.html).toContain('aria-label="提交"')
    expect(s.notes.length).toBeGreaterThan(0)
  })
  it('input 生成 label 关联', () => {
    const s = buildAriaSnippet('input', { label: '姓名', id: 'name', describedBy: 'name-help' })
    expect(s.html).toContain('<label for="name">姓名</label>')
    expect(s.html).toContain('aria-describedby="name-help"')
  })
  it('input 无 describedBy 时不输出属性', () => {
    const s = buildAriaSnippet('input', { label: '姓名', id: 'name' })
    expect(s.html).not.toContain('aria-describedby')
  })
  it('input 缺 id 抛错', () => {
    expect(() => buildAriaSnippet('input', base)).toThrow('需要提供 id')
  })
  it('dialog 使用默认 id 与自定义 id', () => {
    expect(buildAriaSnippet('dialog', base).html).toContain('dialog-1-title')
    expect(buildAriaSnippet('dialog', { ...base, id: 'd' }).html).toContain('d-title')
    expect(buildAriaSnippet('dialog', base).html).toContain('aria-modal="true"')
  })
  it('nav 片段', () => {
    const s = buildAriaSnippet('nav', { label: '主导航' })
    expect(s.html).toContain('<nav aria-label="主导航">')
  })
  it('tabs 含关联属性与默认 id', () => {
    const s = buildAriaSnippet('tabs', base)
    expect(s.html).toContain('role="tablist"')
    expect(s.html).toContain('aria-controls="tabs-1-panel-1"')
    const custom = buildAriaSnippet('tabs', { ...base, id: 't' })
    expect(custom.html).toContain('t-panel-2')
  })
  it('switch 片段', () => {
    const s = buildAriaSnippet('switch', { label: '深色模式' })
    expect(s.html).toContain('role="switch"')
    expect(s.html).toContain('aria-checked="false"')
  })
  it('slider 生成数值属性', () => {
    const s = buildAriaSnippet('slider', { label: '音量', min: 0, max: 100, value: 30, describedBy: 'h' })
    expect(s.html).toContain('aria-valuemin="0"')
    expect(s.html).toContain('aria-valuenow="30"')
    expect(s.html).toContain('aria-describedby="h"')
  })
  it('slider 缺数值抛错', () => {
    expect(() => buildAriaSnippet('slider', base)).toThrow('需要提供最小值')
    expect(() => buildAriaSnippet('slider', { ...base, min: 0, max: 100 })).toThrow('需要提供最小值')
  })
  it('slider min>=max 抛错', () => {
    expect(() => buildAriaSnippet('slider', { ...base, min: 10, max: 10, value: 10 })).toThrow('最小值必须小于最大值')
    expect(() => buildAriaSnippet('slider', { ...base, min: 20, max: 10, value: 15 })).toThrow('最小值必须小于最大值')
  })
  it('slider value 越界抛错', () => {
    expect(() => buildAriaSnippet('slider', { ...base, min: 0, max: 100, value: 101 })).toThrow('之间')
    expect(() => buildAriaSnippet('slider', { ...base, min: 0, max: 100, value: -1 })).toThrow('之间')
  })
  it('alert 片段', () => {
    const s = buildAriaSnippet('alert', { label: '保存成功' })
    expect(s.html).toContain('role="alert"')
  })
  it('用户输入被转义防注入', () => {
    const s = buildAriaSnippet('button', { label: '"><script>alert(1)</script>' })
    expect(s.html).not.toContain('<script>')
    expect(s.html).toContain('&lt;script&gt;')
  })
})
