import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { ReadingModeInput, ReadingModeOptions } from './schema'
import {
  READING_THEMES,
  extractArticle,
  validateReadingSize,
  validateTheme,
  type ArticleResult,
  type ReadingTheme,
} from './utils'

const EXAMPLE_HTML = `<html>
<head><title>示例文章</title></head>
<body>
<nav><a href="/">首页</a></nav>
<article>
<h1>为什么需要阅读模式</h1>
<p>网页上的导航栏、广告和侧边栏常常干扰阅读。阅读模式提取正文，给你干净的阅读体验。</p>
<p>它会移除脚本、样式和导航元素，只保留标题与段落，并统计字数与预估阅读时长。</p>
</article>
<footer>版权所有</footer>
</body>
</html>`

const THEME_STYLES: Record<ReadingTheme, { bg: string; fg: string; muted: string }> = {
  light: { bg: '#ffffff', fg: '#1e293b', muted: '#64748b' },
  sepia: { bg: '#f7f0dd', fg: '#433422', muted: '#8a7a5c' },
  dark: { bg: '#0f172a', fg: '#e2e8f0', muted: '#94a3b8' },
}

function toNum(v: string): number {
  return v.trim() === '' ? NaN : Number(v)
}

export default function Tool() {
  const [fontSize, setFontSize] = useState('18')
  const [lineHeight, setLineHeight] = useState('1.8')
  const [theme, setTheme] = useState<ReadingTheme>('light')

  function articleOf(text: string): { article: ArticleResult | null; error: string } {
    if (text.trim() === '') return { article: null, error: '' }
    try {
      return { article: extractArticle(text), error: '' }
    } catch (err) {
      return { article: null, error: err instanceof Error ? err.message : '解析错误' }
    }
  }

  function viewParams(): { error: string } {
    try {
      validateReadingSize(toNum(fontSize), toNum(lineHeight))
      validateTheme(theme)
      return { error: '' }
    } catch (err) {
      return { error: err instanceof Error ? err.message : '参数错误' }
    }
  }

  const vp = viewParams()
  const ts = THEME_STYLES[theme]

  return (
    <MultiPanel<ReadingModeInput, ReadingModeOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      example={{ text: EXAMPLE_HTML }}
      renderOutput={(input) => {
        const { article, error } = articleOf(input.text)
        return (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2 rounded border border-slate-200 p-2 dark:border-slate-700">
              <label className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                字号
                <input
                  type="number"
                  data-testid="font-size"
                  className="w-20 rounded border border-slate-300 px-2 py-1 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
                  value={fontSize}
                  onChange={(e) => setFontSize(e.target.value)}
                />
              </label>
              <label className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                行高
                <input
                  type="number"
                  data-testid="line-height"
                  className="w-20 rounded border border-slate-300 px-2 py-1 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
                  value={lineHeight}
                  onChange={(e) => setLineHeight(e.target.value)}
                />
              </label>
              <label className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                主题
                <select
                  data-testid="theme"
                  className="rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as ReadingTheme)}
                >
                  {READING_THEMES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {vp.error && (
              <div role="alert" data-testid="param-error" className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                {vp.error}
              </div>
            )}
            {error ? (
              <div role="alert" data-testid="extract-error" className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                {error}
              </div>
            ) : article === null ? (
              <div data-testid="article-empty" className="text-sm text-slate-500 dark:text-slate-400">
                在上方输入框粘贴 HTML 后自动提取正文
              </div>
            ) : (
              <>
                <div data-testid="article-stats" className="text-sm text-slate-500 dark:text-slate-400">
                  {article.wordCount} 字 · 预计阅读 {article.readingMinutes} 分钟 · {article.paragraphs.length} 段
                </div>
                <article
                  data-testid="article-view"
                  className="rounded border border-slate-200 p-6 dark:border-slate-700"
                  style={{ backgroundColor: ts.bg, color: ts.fg }}
                >
                  <h1
                    data-testid="article-title"
                    className="mb-4 text-2xl font-bold"
                    style={{ fontSize: `${toNum(fontSize) + 8}px`, lineHeight: 1.4 }}
                  >
                    {article.title}
                  </h1>
                  {article.paragraphs.map((p, i) => (
                    <p
                      key={i}
                      className="mb-4"
                      style={{ fontSize: `${toNum(fontSize)}px`, lineHeight: toNum(lineHeight) }}
                    >
                      {p}
                    </p>
                  ))}
                </article>
              </>
            )}
          </div>
        )
      }}
      toText={(input) => {
        const { article } = articleOf(input.text)
        if (!article) return ''
        return [`# ${article.title}`, '', ...article.paragraphs].join('\n\n')
      }}
      downloadExt="md"
    />
  )
}
