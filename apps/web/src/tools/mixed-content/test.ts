import { describe, expect, it } from 'vitest'
import type { MixedContentOptions } from './schema'
import {
  assessMixedContent,
  assertPageUrl,
  extractHttpResources,
  renderReport,
  transform,
} from './utils'

const noOptions: MixedContentOptions = {}

describe('mixed-content / extractHttpResources', () => {
  it('提取各类标签的 http 引用并区分主被动', () => {
    const html = `
      <script src="http://cdn.a.com/app.js"></script>
      <iframe src="http://b.com/frame"></iframe>
      <embed src="http://c.com/e.swf">
      <object data="http://d.com/o.swf"></object>
      <img src="http://e.com/a.png">
      <video src="http://f.com/v.mp4"></video>
      <audio src="http://g.com/a.mp3"></audio>
      <source src="http://h.com/s.mp4">
      <track src="http://i.com/t.vtt">
      <input type="image" src="http://j.com/btn.png">
      <link rel="stylesheet" href="http://k.com/s.css">
    `
    const rs = extractHttpResources(html)
    expect(rs).toHaveLength(11)
    const script = rs.find((r) => r.tag === 'script')
    expect(script).toMatchObject({ attr: 'src', url: 'http://cdn.a.com/app.js', active: true })
    const img = rs.find((r) => r.tag === 'img')
    expect(img?.active).toBe(false)
    expect(rs.find((r) => r.tag === 'object')).toMatchObject({ attr: 'data', active: true })
  })

  it('https / 相对地址 / 协议相对地址不计入', () => {
    const html = `
      <img src="https://e.com/a.png">
      <img src="/rel.png">
      <img src="//cdn.e.com/c.png">
      <script src="https://cdn.a.com/app.js"></script>
    `
    expect(extractHttpResources(html)).toHaveLength(0)
  })

  it('大小写不敏感的 http://', () => {
    const html = `<IMG SRC="HTTP://e.com/a.png">`
    const rs = extractHttpResources(html)
    expect(rs).toHaveLength(1)
    expect(rs[0].url).toBe('HTTP://e.com/a.png')
  })

  it('重复引用去重', () => {
    const html = `<script src="http://a.com/x.js"></script><script src="http://a.com/x.js"></script>`
    expect(extractHttpResources(html)).toHaveLength(1)
  })

  it('srcset 多候选拆分', () => {
    const html = `<img srcset="http://a.com/1x.png 1x, http://a.com/2x.png 2x, , https://a.com/3x.png 3x">`
    const rs = extractHttpResources(html)
    expect(rs.map((r) => r.url)).toEqual(['http://a.com/1x.png', 'http://a.com/2x.png'])
    expect(rs[0]).toMatchObject({ tag: 'img', attr: 'srcset', active: false })
  })

  it('source 标签的 srcset', () => {
    const html = `<picture><source srcset="http://a.com/w.webp"></picture>`
    expect(extractHttpResources(html)).toHaveLength(1)
  })

  it('css url() 三种引号写法', () => {
    const html = `<style>.a{background:url(http://a.com/1.png)}.b{background:url('http://a.com/2.png')}.c{background:url("http://a.com/3.png")}</style>`
    const rs = extractHttpResources(html)
    expect(rs).toHaveLength(3)
    expect(rs[0]).toMatchObject({ tag: 'css', attr: 'url()', active: false })
  })

  it('内联 style 中的 url()', () => {
    const html = `<div style="background:url(http://a.com/bg.png)"></div>`
    expect(extractHttpResources(html)).toHaveLength(1)
  })

  it('data: 与 javascript: 伪协议不计入', () => {
    const html = `<img src="data:image/png;base64,AAA"><a href="javascript:void(0)">x</a>`
    expect(extractHttpResources(html)).toHaveLength(0)
  })
})

describe('mixed-content / assertPageUrl', () => {
  it('空报错', () => {
    expect(() => assertPageUrl('  ')).toThrow(/请填写页面 URL/)
  })
  it('非法 URL 报错', () => {
    expect(() => assertPageUrl('not url')).toThrow(/格式不正确/)
  })
  it('非 http(s) 报错', () => {
    expect(() => assertPageUrl('ftp://a.com/')).toThrow(/只支持 http/)
  })
  it('http 返回 false，https 返回 true', () => {
    expect(assertPageUrl('http://a.com/')).toBe(false)
    expect(assertPageUrl('https://a.com/')).toBe(true)
  })
})

describe('mixed-content / assessMixedContent', () => {
  const img = { tag: 'img', attr: 'src', url: 'http://a.com/1.png', active: false }
  const js = { tag: 'script', attr: 'src', url: 'http://a.com/x.js', active: true }

  it('http 页面：警告（全站明文）', () => {
    const a = assessMixedContent([img], false, 'http://a.com/')
    expect(a.level).toBe('警告')
    expect(a.summary).toContain('全站明文')
    expect(a.count).toBe(1)
    expect(a.passiveCount).toBe(1)
    expect(a.activeCount).toBe(0)
  })

  it('https + 主动混合内容：风险', () => {
    const a = assessMixedContent([img, js], true, 'https://a.com/')
    expect(a.level).toBe('风险')
    expect(a.summary).toContain('主动混合内容')
    expect(a.activeCount).toBe(1)
  })

  it('https + 仅被动混合内容：警告', () => {
    const a = assessMixedContent([img], true, 'https://a.com/')
    expect(a.level).toBe('警告')
    expect(a.summary).toContain('被动混合内容')
  })

  it('https + 无混合内容：安全', () => {
    const a = assessMixedContent([], true, 'https://a.com/')
    expect(a.level).toBe('安全')
    expect(a.summary).toContain('无混合内容')
  })

  it('按标签统计合并同名', () => {
    const a = assessMixedContent([img, { ...img, url: 'http://a.com/2.png' }], true, 'https://a.com/')
    expect(a.byType).toEqual({ img: 2 })
  })
})

describe('mixed-content / renderReport', () => {
  it('有问题时渲染明细与统计', () => {
    const resources = extractHttpResources(`<script src="http://a.com/x.js"></script>`)
    const out = renderReport(assessMixedContent(resources, true, 'https://a.com/'), resources)
    expect(out).toContain('风险等级：风险')
    expect(out).toContain('[主动] <script> src = http://a.com/x.js')
    expect(out).toContain('按标签统计：script×1')
  })

  it('无问题时不渲染明细段', () => {
    const out = renderReport(assessMixedContent([], true, 'https://a.com/'), [])
    expect(out).toContain('风险等级：安全')
    expect(out).not.toContain('明细：')
  })
})

describe('mixed-content / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '   ', pageUrl: 'https://a.com/' }, noOptions)).toBe('')
  })
  it('超长输入报错', () => {
    expect(() =>
      transform({ text: 'x'.repeat(500001), pageUrl: 'https://a.com/' }, noOptions),
    ).toThrow(/上限/)
  })
  it('页面 URL 非法报错', () => {
    expect(() => transform({ text: '<img src="http://a.com/1.png">', pageUrl: 'nope' }, noOptions)).toThrow(
      /格式不正确/,
    )
  })
  it('https 页面检出混合内容', () => {
    const out = transform(
      { text: '<html><img src="http://a.com/1.png"></html>', pageUrl: 'https://a.com/' },
      noOptions,
    )
    expect(out).toContain('风险等级：警告')
    expect(out).toContain('http://a.com/1.png')
  })
  it('http 页面给出全站明文警告', () => {
    const out = transform(
      { text: '<html><img src="http://a.com/1.png"></html>', pageUrl: 'http://a.com/' },
      noOptions,
    )
    expect(out).toContain('全站明文')
  })
})
