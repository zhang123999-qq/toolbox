// @vitest-environment jsdom
/**
 * screen-reader（#718）utils 单测：jsdom 真实 DOMParser + 可注入工厂。
 */
import { describe, expect, it, vi } from 'vitest'
import {
  formatPreview,
  parseHtml,
  previewScreenReader,
  type DocFactory,
} from './utils'

const factory: DocFactory = (html) => new DOMParser().parseFromString(html, 'text/html')

describe('parseHtml', () => {
  it('空输入抛中文错', () => {
    expect(() => parseHtml('')).toThrow('请输入 HTML')
    expect(() => parseHtml('   ')).toThrow('请输入 HTML')
  })
  it('默认用 DOMParser 解析', () => {
    const doc = parseHtml('<p>hi</p>')
    expect(doc.body.textContent).toContain('hi')
  })
  it('可注入自定义工厂', () => {
    const spy = vi.fn(factory)
    parseHtml('<p>hi</p>', spy)
    expect(spy).toHaveBeenCalledWith('<p>hi</p>')
  })
})

describe('标题分析', () => {
  it('正常层级无警告，大纲含标题', () => {
    const p = previewScreenReader('<h1>主标题</h1><h2>副标题</h2>', factory)
    expect(p.issues).toHaveLength(0)
    expect(p.outline).toEqual([
      { kind: 'heading', level: 1, text: '主标题' },
      { kind: 'heading', level: 2, text: '副标题' },
    ])
  })
  it('层级跳跃报警告', () => {
    const p = previewScreenReader('<h1>主</h1><h3>跳</h3>', factory)
    expect(p.issues.some((i) => i.message.includes('标题层级跳跃'))).toBe(true)
  })
  it('多个 h1 报警告', () => {
    const p = previewScreenReader('<h1>一</h1><h1>二</h1>', factory)
    expect(p.issues.some((i) => i.message.includes('2 个 h1'))).toBe(true)
  })
  it('空标题标注', () => {
    const p = previewScreenReader('<h2></h2>', factory)
    expect(p.outline[0].text).toContain('空标题')
  })
  it('超长标题截断', () => {
    const p = previewScreenReader(`<h1>${'长'.repeat(100)}</h1>`, factory)
    expect(p.outline[0].text.endsWith('…')).toBe(true)
  })
})

describe('地标与链接', () => {
  it('地标带名称', () => {
    const p = previewScreenReader('<nav aria-label="主导航"></nav><main></main>', factory)
    const landmarks = p.outline.filter((o) => o.kind === 'landmark')
    expect(landmarks[0].text).toBe('nav（主导航）')
    expect(landmarks[1].text).toBe('main')
  })
  it('无意义链接文本警告', () => {
    const p = previewScreenReader('<a href="/x">点击这里</a>', factory)
    expect(p.issues.some((i) => i.message.includes('无意义'))).toBe(true)
    expect(p.outline.some((o) => o.kind === 'link' && o.text === '点击这里')).toBe(true)
  })
  it('英文无意义链接文本同样警告', () => {
    const p = previewScreenReader('<a href="/x">Click Here</a>', factory)
    expect(p.issues.some((i) => i.severity === 'warning')).toBe(true)
  })
  it('正常链接无警告', () => {
    const p = previewScreenReader('<a href="/docs">使用文档</a>', factory)
    expect(p.issues).toHaveLength(0)
  })
  it('空链接文本报错', () => {
    const p = previewScreenReader('<a href="/x"></a>', factory)
    expect(p.issues.some((i) => i.severity === 'error')).toBe(true)
  })
  it('链接可用 aria-label 命名', () => {
    const p = previewScreenReader('<a href="/x" aria-label="前往文档"></a>', factory)
    expect(p.outline.some((o) => o.kind === 'link' && o.text === '前往文档')).toBe(true)
  })
  it('aria-labelledby 指向不存在 id 时回退可见文本', () => {
    const p = previewScreenReader('<a href="/x" aria-labelledby="nope">回退文本</a>', factory)
    expect(p.outline.some((o) => o.kind === 'link' && o.text === '回退文本')).toBe(true)
  })
  it('aria-labelledby 指向空元素时回退', () => {
    const p = previewScreenReader(
      '<span id="e"></span><a href="/x" aria-labelledby="e">可见</a>',
      factory,
    )
    expect(p.outline.some((o) => o.kind === 'link' && o.text === '可见')).toBe(true)
  })
  it('aria-labelledby 正常解析', () => {
    const p = previewScreenReader(
      '<span id="t">标签文本</span><a href="/x" aria-labelledby="t"></a>',
      factory,
    )
    expect(p.outline.some((o) => o.kind === 'link' && o.text === '标签文本')).toBe(true)
  })
})

describe('按钮与图片', () => {
  it('无名称按钮报错', () => {
    const p = previewScreenReader('<button></button>', factory)
    expect(p.issues.some((i) => i.message.includes('无名称的按钮'))).toBe(true)
  })
  it('role=button 被识别', () => {
    const p = previewScreenReader('<div role="button">确定</div>', factory)
    expect(p.outline.some((o) => o.kind === 'button' && o.text === '确定')).toBe(true)
  })
  it('图片缺 alt 警告', () => {
    const p = previewScreenReader('<img src="a.png">', factory)
    expect(p.issues.some((i) => i.message.includes('缺少 alt'))).toBe(true)
  })
  it('空 alt 视为装饰图', () => {
    const p = previewScreenReader('<img src="a.png" alt="">', factory)
    expect(p.issues).toHaveLength(0)
    expect(p.outline.some((o) => o.kind === 'image' && o.text.includes('装饰图'))).toBe(true)
  })
  it('有 alt 正常收录', () => {
    const p = previewScreenReader('<img src="a.png" alt="一只猫">', factory)
    expect(p.outline.some((o) => o.kind === 'image' && o.text === '一只猫')).toBe(true)
  })
})

describe('表单控件', () => {
  it('label[for] 关联', () => {
    const p = previewScreenReader('<label for="n">姓名</label><input id="n">', factory)
    expect(p.issues).toHaveLength(0)
    expect(p.outline.some((o) => o.kind === 'form' && o.text === '姓名')).toBe(true)
  })
  it('包裹 label 关联', () => {
    const p = previewScreenReader('<label>邮箱<input type="email"></label>', factory)
    expect(p.issues).toHaveLength(0)
  })
  it('aria-label 命名', () => {
    const p = previewScreenReader('<input aria-label="搜索">', factory)
    expect(p.issues).toHaveLength(0)
  })
  it('无 label 报错', () => {
    const p = previewScreenReader('<input type="text">', factory)
    expect(p.issues.some((i) => i.message.includes('<input>'))).toBe(true)
  })
  it('label[for] 指向空文本时继续找包裹 label', () => {
    const p = previewScreenReader(
      '<label for="a"></label><label>包裹<input id="a"></label>',
      factory,
    )
    expect(p.issues).toHaveLength(0)
  })
  it('label[for] 找不到且无包裹时报错', () => {
    const p = previewScreenReader('<label for="missing">x</label><input id="other">', factory)
    expect(p.issues.some((i) => i.severity === 'error')).toBe(true)
  })
  it('hidden input 跳过', () => {
    const p = previewScreenReader('<input type="hidden" value="1"><h1>t</h1>', factory)
    expect(p.outline.every((o) => o.kind !== 'form')).toBe(true)
  })
  it('submit / button / reset 取 value 为名', () => {
    const p = previewScreenReader(
      '<input type="submit" value="发送"><input type="button" value="取消"><input type="reset">',
      factory,
    )
    const forms = p.outline.filter((o) => o.kind === 'form')
    expect(forms[0].text).toBe('按钮：发送')
    expect(forms[1].text).toBe('按钮：取消')
    expect(forms[2].text).toBe('按钮（无 value 文本）')
  })
  it('select / textarea 检查', () => {
    const p = previewScreenReader(
      '<select aria-label="城市"></select><textarea></textarea>',
      factory,
    )
    expect(p.outline.some((o) => o.kind === 'form' && o.text === '城市')).toBe(true)
    expect(p.issues.some((i) => i.message.includes('<textarea>'))).toBe(true)
  })
  it('表单 aria-labelledby 命名', () => {
    const p = previewScreenReader('<span id="t">昵称</span><input aria-labelledby="t">', factory)
    expect(p.issues).toHaveLength(0)
    expect(p.outline.some((o) => o.kind === 'form' && o.text === '昵称')).toBe(true)
  })
  it('表单 aria-labelledby 指向空元素时回退报错', () => {
    const p = previewScreenReader('<span id="e"></span><input aria-labelledby="e">', factory)
    expect(p.issues.some((i) => i.severity === 'error')).toBe(true)
  })
  it('空包裹 label 时报错', () => {
    const p = previewScreenReader('<label> <input> </label>', factory)
    expect(p.issues.some((i) => i.severity === 'error')).toBe(true)
  })
})

describe('空文档与格式化', () => {
  it('无可朗读内容时给提示', () => {
    const p = previewScreenReader('<p>纯段落</p>', factory)
    expect(p.outline).toHaveLength(0)
    expect(p.issues.some((i) => i.message.includes('没有可朗读的内容'))).toBe(true)
  })
  it('formatPreview 大纲为空时标注', () => {
    const text = formatPreview({ outline: [], issues: [] })
    expect(text).toContain('（无）')
    expect(text).toContain('未发现问题')
  })
  it('formatPreview 完整输出', () => {
    const p = previewScreenReader(
      '<h1>标题</h1><a href="/x">点击这里</a><a href="/y"></a><img src="a.png">',
      factory,
    )
    const text = formatPreview(p)
    expect(text).toContain('[h1] 标题')
    expect(text).toContain('[链接] 点击这里')
    expect(text).toContain('⚠')
    expect(text).toContain('✗')
  })
  it('previewScreenReader 默认工厂（不传参）', () => {
    const p = previewScreenReader('<h1>默认</h1>')
    expect(p.outline[0].text).toBe('默认')
  })
})
