import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import { checkCanonical, renderReport } from './utils'
import type { CanonicalCheckInput, CanonicalCheckOptions } from './schema'

const EXAMPLE: CanonicalCheckInput = {
  text: [
    '<head>',
    '  <title>示例文章</title>',
    '  <link rel="canonical" href="https://example.com/article">',
    '</head>',
  ].join('\n'),
  pageUrl: 'https://example.com/article?page=2',
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
    <MultiPanel<CanonicalCheckInput, CanonicalCheckOptions>
      meta={meta}
      initialInput={{ text: '', pageUrl: '' }}
      initialOptions={{}}
      example={EXAMPLE}
      extraInputs={[{ key: 'pageUrl', label: '页面 URL（用于判断是否自指，可选）', rows: 1 }]}
      renderOutput={(input) => {
        let body: React.ReactNode
        try {
          if (input.text.trim() === '') {
            body = <p className="text-slate-500">在左侧粘贴页面 HTML，canonical 检查结果实时显示</p>
          } else {
            const result = checkCanonical(input.text, input.pageUrl)
            body = (
              <div className="flex flex-col gap-3">
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  发现 {result.links.length} 个 canonical
                </div>
                {result.links.length > 0 && (
                  <ul className="flex flex-col gap-1">
                    {result.links.map((href, i) => (
                      <li key={i} className="font-mono text-xs text-slate-700 dark:text-slate-300">
                        [{i + 1}] {href === '' ? '（空 href）' : href}
                      </li>
                    ))}
                  </ul>
                )}
                {result.issues.length === 0 ? (
                  <p className="text-sm text-green-700 dark:text-green-400">
                    未发现问题，canonical 设置正确
                  </p>
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
            <div
              role="alert"
              data-testid="error"
              className="text-sm text-red-700 dark:text-red-300"
            >
              {err instanceof Error ? err.message : '检查失败'}
            </div>
          )
        }
        return body
      }}
      toText={(input) => {
        try {
          if (input.text.trim() === '') return ''
          return renderReport(checkCanonical(input.text, input.pageUrl))
        } catch {
          return ''
        }
      }}
      downloadExt="md"
    />
  )
}
