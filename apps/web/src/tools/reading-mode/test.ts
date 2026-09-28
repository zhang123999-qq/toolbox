// @vitest-environment jsdom
/**
 * reading-mode（#739）utils 单测：用 jsdom 注入 DocFactory。
 */
import { describe, expect, it } from 'vitest'
import {
  countWords,
  extractArticle,
  validateReadingSize,
  validateTheme,
  type DocFactory,
} from './utils'

const jsdomFactory: DocFactory = (html) => new DOMParser().parseFromString(html, 'text/html')

describe('countWords', () => {
  it('中文按字计', () => {
    expect(countWords('你好世界')).toBe(4)
  })
  it('英文按词计', () => {
    expect(countWords('hello world')).toBe(2)
  })
  it('中英混合', () => {
    expect(countWords('你好 world')).toBe(3)
  })
  it('空字符串为 0', () => {
    expect(countWords('   ')).toBe(0)
  })
})

describe('extractArticle', () => {
  it('空输入抛错', () => {
    expect(() => extractArticle('   ', jsdomFactory)).toThrow('请粘贴要提取正文的 HTML')
  })
  it('优先提取 article 内的段落', () => {
    const html = `
      <html><head><title>页面标题</title></head><body>
      <nav><p>导航文字导航文字</p></nav>
      <article><h1>文章标题</h1><p>第一段正文内容。</p><p>第二段正文内容更长一些。</p></article>
      <footer><p>页脚</p></footer>
      </body></html>`
    const r = extractArticle(html, jsdomFactory)
    expect(r.title).toBe('文章标题')
    expect(r.paragraphs).toHaveLength(3)
    expect(r.paragraphs[1]).toContain('第一段正文内容')
    expect(r.wordCount).toBeGreaterThan(0)
    expect(r.readingMinutes).toBeGreaterThanOrEqual(1)
  })
  it('无 article 时用 main', () => {
    const html = `<body><main><p>主体段落一二三四五。</p><p>主体段落六七八九十。</p></main></body>`
    const r = extractArticle(html, jsdomFactory)
    expect(r.paragraphs).toHaveLength(2)
  })
  it('无 article/main 时按打分选 div', () => {
    const html = `<body>
      <div class="sidebar"><p>短</p></div>
      <div class="content"><p>这是一段比较长的正文内容，包含很多文字。</p><p>这是第二段正文，同样包含不少文字内容。</p></div>
    </body>`
    const r = extractArticle(html, jsdomFactory)
    expect(r.paragraphs.some((p) => p.includes('比较长的正文'))).toBe(true)
  })
  it('script/style 内容被移除', () => {
    const html = `<body><article><p>正文</p><script>var x = 1;</script><style>.a{}</style></article></body>`
    const r = extractArticle(html, jsdomFactory)
    expect(r.paragraphs.join('')).not.toContain('var x')
  })
  it('无标题时用 document.title', () => {
    const html = `<html><head><title>文档标题</title></head><body><article><p>正文内容段落。</p></article></body>`
    const r = extractArticle(html, jsdomFactory)
    expect(r.title).toBe('文档标题')
  })
  it('无任何标题时用默认标题', () => {
    const r = extractArticle(`<body><article><p>正文内容段落。</p></article></body>`, jsdomFactory)
    expect(r.title).toBe('未命名文章')
  })
  it('没有有效段落抛错', () => {
    expect(() => extractArticle('<body><div></div></body>', jsdomFactory)).toThrow('未能提取到正文')
  })
  it('过短文本被过滤', () => {
    expect(() =>
      extractArticle('<body><article><p>a</p></article></body>', jsdomFactory),
    ).toThrow('未能提取到正文')
  })
  it('阅读时长按 400 字/分钟向上取整', () => {
    const long = '字'.repeat(801)
    const r = extractArticle(`<body><article><p>${long}</p></article></body>`, jsdomFactory)
    expect(r.wordCount).toBe(801)
    expect(r.readingMinutes).toBe(3)
  })
})

describe('validateTheme', () => {
  it('三种主题通过', () => {
    expect(validateTheme('light')).toBe('light')
    expect(validateTheme('sepia')).toBe('sepia')
    expect(validateTheme('dark')).toBe('dark')
  })
  it('非法主题抛错', () => {
    expect(() => validateTheme('blue')).toThrow('主题不合法')
  })
})

describe('validateReadingSize', () => {
  it('合法范围通过', () => {
    expect(() => validateReadingSize(18, 1.6)).not.toThrow()
    expect(() => validateReadingSize(12, 1.2)).not.toThrow()
    expect(() => validateReadingSize(32, 2.5)).not.toThrow()
  })
  it('字号越界抛错', () => {
    expect(() => validateReadingSize(11, 1.6)).toThrow('阅读字号超出范围')
    expect(() => validateReadingSize(33, 1.6)).toThrow('阅读字号超出范围')
    expect(() => validateReadingSize(NaN, 1.6)).toThrow('阅读字号超出范围')
  })
  it('行高越界抛错', () => {
    expect(() => validateReadingSize(18, 1.1)).toThrow('阅读行高超出范围')
    expect(() => validateReadingSize(18, 2.6)).toThrow('阅读行高超出范围')
  })
})
