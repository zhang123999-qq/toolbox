// @vitest-environment jsdom
/**
 * skip-link（#734）utils 单测：jsdom 真实 DOMParser + 可注入工厂。
 */
import { describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_LABEL,
  DEFAULT_TARGET_ID,
  detectSkipLink,
  escapeHtml,
  formatSkipLinkReport,
  generateSkipLink,
  validateLabel,
  validateTargetId,
  type DocFactory,
} from './utils'

const factory: DocFactory = (html) => new DOMParser().parseFromString(html, 'text/html')

describe('escapeHtml', () => {
  it('转义五种特殊字符', () => {
    expect(escapeHtml('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&#39;')
  })
  it('普通文本不变', () => {
    expect(escapeHtml('跳转到主要内容')).toBe('跳转到主要内容')
  })
})

describe('validateTargetId', () => {
  it('空 id 抛错', () => {
    expect(() => validateTargetId('')).toThrow('不能为空')
    expect(() => validateTargetId('   ')).toThrow('不能为空')
  })
  it('非法 id 抛错', () => {
    expect(() => validateTargetId('1abc')).toThrow('不合法')
    expect(() => validateTargetId('a b')).toThrow('不合法')
    expect(() => validateTargetId('a#b')).toThrow('不合法')
  })
  it('合法 id 去空格返回', () => {
    expect(validateTargetId('  main-content  ')).toBe('main-content')
    expect(validateTargetId('main_content:1.2')).toBe('main_content:1.2')
  })
})

describe('validateLabel', () => {
  it('空文案抛错', () => {
    expect(() => validateLabel('')).toThrow('不能为空')
  })
  it('超长抛错', () => {
    expect(() => validateLabel('x'.repeat(61))).toThrow('超过 60 上限')
  })
  it('60 字整通过', () => {
    expect(validateLabel('x'.repeat(60))).toBe('x'.repeat(60))
  })
})

describe('generateSkipLink', () => {
  it('生成 HTML 与 CSS', () => {
    const s = generateSkipLink({ targetId: 'main-content', label: '跳转到主要内容' })
    expect(s.html).toBe('<a class="skip-link" href="#main-content">跳转到主要内容</a>')
    expect(s.css).toContain('.skip-link')
    expect(s.css).toContain(':focus-visible')
    expect(s.css).toContain('left: -9999px')
  })
  it('用户输入被转义', () => {
    const s = generateSkipLink({ targetId: 'main', label: '<script>alert(1)</script>' })
    expect(s.html).toContain('&lt;script&gt;')
    expect(s.html).not.toContain('<script>')
  })
  it('非法参数抛错', () => {
    expect(() => generateSkipLink({ targetId: '', label: 'x' })).toThrow('不能为空')
    expect(() => generateSkipLink({ targetId: 'm', label: '' })).toThrow('不能为空')
  })
})

describe('detectSkipLink', () => {
  it('空输入抛中文错', () => {
    expect(() => detectSkipLink('')).toThrow('请输入 HTML')
  })
  it('可注入自定义工厂', () => {
    const spy = vi.fn(factory)
    detectSkipLink('<a href="#m" class="skip-link">跳过</a>', spy)
    expect(spy).toHaveBeenCalledWith('<a href="#m" class="skip-link">跳过</a>')
  })
  it('默认工厂（不传参）', () => {
    const d = detectSkipLink('<a href="#m" class="skip-link">跳过导航</a><main id="m">x</main>')
    expect(d.found).toBe(true)
  })
  it('文本含"跳过"被识别', () => {
    const d = detectSkipLink('<a href="#c">跳转到主要内容</a><main id="c">x</main>', factory)
    expect(d.found).toBe(true)
    expect(d.matches[0]?.targetExists).toBe(true)
  })
  it('英文 skip 文本被识别（大小写不敏感）', () => {
    const d = detectSkipLink('<a href="#c">Skip to content</a>', factory)
    expect(d.found).toBe(true)
    expect(d.matches[0]?.targetExists).toBe(false)
  })
  it('class 含 skip 被识别', () => {
    const d = detectSkipLink('<a href="#c" class="my-skipper">目录</a><div id="c"></div>', factory)
    expect(d.found).toBe(true)
  })
  it('普通锚点不被误判', () => {
    const d = detectSkipLink('<a href="#c">查看目录</a><div id="c"></div>', factory)
    expect(d.found).toBe(false)
    expect(d.matches).toEqual([])
  })
  it('空 href 目标判为不存在', () => {
    const d = detectSkipLink('<a href="#" class="skip-link">跳过</a>', factory)
    expect(d.matches[0]?.targetExists).toBe(false)
  })
})

describe('formatSkipLinkReport', () => {
  it('报告含代码与使用说明', () => {
    const r = formatSkipLinkReport(
      generateSkipLink({ targetId: DEFAULT_TARGET_ID, label: DEFAULT_LABEL }),
      null,
    )
    expect(r).toContain('生成的跳转链接 HTML')
    expect(r).toContain('配套 CSS')
    expect(r).toContain('<body> 的最前面')
  })
  it('检测到链接时列出目标状态', () => {
    const d = detectSkipLink('<a href="#c" class="skip-link">跳过</a>', factory)
    const r = formatSkipLinkReport(generateSkipLink({ targetId: 'm', label: '跳过' }), d)
    expect(r).toContain('检测到 1 个跳过链接')
    expect(r).toContain('目标不存在')
  })
  it('目标存在时报告写目标存在', () => {
    const d = detectSkipLink(
      '<a href="#c" class="skip-link">跳过</a><main id="c">x</main>',
      factory,
    )
    const r = formatSkipLinkReport(generateSkipLink({ targetId: 'm', label: '跳过' }), d)
    expect(r).toContain('目标存在')
  })
  it('未检测到时给建议', () => {
    const d = detectSkipLink('<p>x</p>', factory)
    const r = formatSkipLinkReport(generateSkipLink({ targetId: 'm', label: '跳过' }), d)
    expect(r).toContain('未检测到跳过链接')
  })
})
