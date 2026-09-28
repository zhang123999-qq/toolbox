import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import { checkSitemap, renderReport } from './utils'
import type { SitemapCheckInput, SitemapCheckOptions } from './schema'

const EXAMPLE: SitemapCheckInput = {
  text: [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    '  <url>',
    '    <loc>https://example.com/</loc>',
    '    <lastmod>2026-09-01</lastmod>',
    '    <changefreq>daily</changefreq>',
    '    <priority>1.0</priority>',
    '  </url>',
    '  <url>',
    '    <loc>https://example.com/about</loc>',
    '    <lastmod>昨天</lastmod>',
    '  </url>',
    '  <url>',
    '    <loc>https://example.com/</loc>',
    '  </url>',
    '</urlset>',
  ].join('\n'),
}

const LEVEL_STYLE: Record<string, string> = {
  error: 'text-red-700 dark:text-red-300',
  warning: 'text-amber-800 dark:text-amber-300',
  info: 'text-sky-800 dark:text-sky-300',
}

const LEVEL_MARK: Record<string, string> = { error: '❌', warning: '⚠️', info: 'ℹ️' }

/** 纯本地计算，无网络请求 */
export default function Tool() {
  return (
    <MultiPanel<SitemapCheckInput, SitemapCheckOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      example={EXAMPLE}
      renderOutput={(input) => {
        let body: React.ReactNode
        try {
          if (input.text.trim() === '') {
            body = <p className="text-slate-500">在左侧粘贴 sitemap XML，规范性检查结果实时显示</p>
          } else {
            const result = checkSitemap(input.text)
            body = (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    {Math.round(result.passRate * 100)}
                    <span className="text-sm font-normal text-slate-500">%</span>
                  </span>
                  <span className="text-slate-600 dark:text-slate-400">
                    {result.isIndex ? 'sitemap 索引' : 'urlset'} · 共 {result.entries.length} 条
                    · 问题 {result.issues.length}
                  </span>
                </div>
                {result.issues.length === 0 ? (
                  <p className="text-sm text-green-700 dark:text-green-400">未发现问题，sitemap 符合规范</p>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {result.issues.map((issue, i) => (
                      <li key={i} className={`text-sm ${LEVEL_STYLE[issue.level]}`}>
                        {LEVEL_MARK[issue.level]} {issue.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          }
        } catch (err) {
          body = (
            <div role="alert" data-testid="error" className="text-sm text-red-700 dark:text-red-300">
              {err instanceof Error ? err.message : '检查失败'}
            </div>
          )
        }
        return body
      }}
      toText={(input) => {
        try {
          if (input.text.trim() === '') return ''
          return renderReport(checkSitemap(input.text))
        } catch {
          return ''
        }
      }}
      downloadExt="md"
    />
  )
}
