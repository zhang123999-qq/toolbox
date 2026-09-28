import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import { checkRobots, parseRobots, renderReport } from './utils'
import type { RobotsCheckInput, RobotsCheckOptions } from './schema'

const EXAMPLE: RobotsCheckInput = {
  text: [
    'User-agent: *',
    'Disallow: /admin/',
    'Disallow: /tmp/',
    'Allow: /tmp/public/',
    'Crawl-delay: 10',
    '',
    'User-agent: BadBot',
    'Disallow: /',
    '',
    'Sitemap: https://example.com/sitemap.xml',
    'Sitemap: /sitemap.xml',
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
    <MultiPanel<RobotsCheckInput, RobotsCheckOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      example={EXAMPLE}
      renderOutput={(input) => {
        let body: React.ReactNode
        try {
          if (input.text.trim() === '') {
            body = <p className="text-slate-500">在左侧粘贴 robots.txt，规则检查结果实时显示</p>
          } else {
            const result = checkRobots(parseRobots(input.text))
            body = (
              <div className="flex flex-col gap-3">
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  共 {result.groups.length} 个分组 · {result.sitemaps.length} 个 Sitemap
                  · 问题 {result.issues.length}
                </div>
                {result.groups.map((g, gi) => (
                  <div
                    key={gi}
                    className="rounded border border-slate-200 p-2 dark:border-slate-700"
                  >
                    <p className="mb-1 font-mono text-xs text-slate-500">
                      分组 {gi + 1} · User-agent:{' '}
                      {g.userAgents.length === 0 ? '（缺失）' : g.userAgents.join(', ')}
                      {g.crawlDelay !== undefined ? ` · Crawl-delay: ${g.crawlDelay}` : ''}
                    </p>
                    <ul className="text-sm text-slate-700 dark:text-slate-300">
                      {g.rules.length === 0 ? (
                        <li className="text-slate-400">无规则</li>
                      ) : (
                        g.rules.map((r, ri) => (
                          <li key={ri} className="font-mono text-xs">
                            {r.directive === 'allow' ? 'Allow' : 'Disallow'}: {r.path || '（空）'}
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                ))}
                {result.issues.length === 0 ? (
                  <p className="text-sm text-green-700 dark:text-green-400">未发现问题，robots.txt 符合规范</p>
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
          return renderReport(checkRobots(parseRobots(input.text)))
        } catch {
          return ''
        }
      }}
      downloadExt="md"
    />
  )
}
