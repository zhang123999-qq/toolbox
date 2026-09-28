/**
 * popup（#780）utils 单测：Popup 弹出页三文件模板生成。
 */
import { describe, expect, it } from 'vitest'
import {
  escapeHtml,
  FEATURE_VALUES,
  generatePopup,
  parsePopupInput,
  renderPopupFiles,
  validatePopupOptions,
  validatePopupSize,
} from './utils'

describe('escapeHtml', () => {
  it('转义全部特殊字符', () => {
    expect(escapeHtml('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&#39;')
  })
  it('普通字符串不变', () => {
    expect(escapeHtml('我的扩展')).toBe('我的扩展')
  })
})

describe('validatePopupSize', () => {
  it('合法尺寸通过', () => {
    expect(() => validatePopupSize(360, 480)).not.toThrow()
    expect(() => validatePopupSize(800, 600)).not.toThrow()
    expect(() => validatePopupSize(1, 1)).not.toThrow()
  })
  it('非整数或非数字报错', () => {
    expect(() => validatePopupSize(360.5, 480)).toThrow('width 必须是整数')
    expect(() => validatePopupSize('360' as never, 480)).toThrow('width 必须是整数')
    expect(() => validatePopupSize(360, NaN as never)).toThrow('height 必须是整数')
  })
  it('超出 Chrome 上限报错', () => {
    expect(() => validatePopupSize(801, 480)).toThrow('width 超出范围')
    expect(() => validatePopupSize(360, 601)).toThrow('height 超出范围')
    expect(() => validatePopupSize(0, 480)).toThrow('width 超出范围')
  })
})

describe('validatePopupOptions', () => {
  it('合法配置通过', () => {
    expect(() =>
      validatePopupOptions({ title: 't', width: 100, height: 100, features: ['tabs'] }),
    ).not.toThrow()
  })
  it('非法配置报错', () => {
    expect(() => validatePopupOptions(null as never)).toThrow('配置不能为空')
    expect(() => validatePopupOptions({ title: '  ', width: 100, height: 100, features: [] })).toThrow(
      'title 必须是非空字符串',
    )
    expect(() => validatePopupOptions({ title: 1 as never, width: 100, height: 100, features: [] })).toThrow(
      'title 必须是非空字符串',
    )
    expect(() => validatePopupOptions({ title: 't', width: 100, height: 100, features: 'x' as never })).toThrow(
      'features 必须是数组',
    )
    expect(() => validatePopupOptions({ title: 't', width: 100, height: 100, features: ['nope' as never] })).toThrow(
      '未知特性',
    )
    expect(() => validatePopupOptions({ title: 't', width: 0, height: 100, features: [] })).toThrow('width 超出范围')
  })
  it('特性值覆盖标签表', () => {
    expect(FEATURE_VALUES.length).toBe(3)
  })
})

describe('generatePopup', () => {
  it('生成三文件并转义标题', () => {
    const files = generatePopup({ title: '<b>扩展</b>', width: 360, height: 480, features: ['tabs'] })
    expect(files.html).toContain('&lt;b&gt;扩展&lt;/b&gt;')
    expect(files.html).not.toContain('<b>扩展</b>')
    expect(files.js).toContain('chrome.tabs.query')
    expect(files.css).toContain('width: 360px')
    expect(files.css).toContain('min-height: 480px')
  })
  it('特性片段按需拼接', () => {
    const files = generatePopup({ title: 't', width: 200, height: 200, features: ['storage', 'i18n'] })
    expect(files.js).toContain('chrome.storage.sync')
    expect(files.js).toContain('chrome.i18n.getMessage')
    expect(files.html).toContain('data-i18n')
    expect(files.js).not.toContain('chrome.tabs.query')
  })
  it('无特性时仍生成骨架', () => {
    const files = generatePopup({ title: 't', width: 200, height: 200, features: [] })
    expect(files.html).toContain('<h1>t</h1>')
    expect(files.js).toContain('popup.js 模板')
  })
  it('重复特性去重', () => {
    const files = generatePopup({ title: 't', width: 200, height: 200, features: ['tabs', 'tabs'] })
    expect(files.js.match(/btn-tab/g)?.length).toBe(1)
    expect(files.html.match(/btn-tab/g)?.length).toBe(1)
  })
  it('renderPopupFiles 输出三段分隔', () => {
    const out = renderPopupFiles(generatePopup({ title: 't', width: 200, height: 200, features: [] }))
    expect(out).toContain('===== popup.html =====')
    expect(out).toContain('===== popup.js =====')
    expect(out).toContain('===== popup.css =====')
  })
})

describe('parsePopupInput', () => {
  it('解析合法 JSON', () => {
    const opts = parsePopupInput('{"title":"t","width":300,"height":400,"features":["i18n"]}')
    expect(opts.features).toEqual(['i18n'])
  })
  it('缺失字段时走校验报错', () => {
    expect(() => parsePopupInput('{"title":"t"}')).toThrow('width 必须是整数')
    expect(() => parsePopupInput('{"width":100,"height":100,"features":[]}')).toThrow('title 必须是非空字符串')
  })
  it('非法输入报错', () => {
    expect(() => parsePopupInput('')).toThrow('输入不能为空')
    expect(() => parsePopupInput('{bad')).toThrow('输入不是合法 JSON')
    expect(() => parsePopupInput('[]')).toThrow('输入必须是 JSON 对象')
  })
})
