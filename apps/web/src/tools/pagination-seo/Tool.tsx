import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import { checkPagination, renderReport } from './utils'
import type { PaginationSeoInput, PaginationSeoOptions } from './schema'

const EXAMPLE: PaginationSeoInput = {
  text: [
    '<head>',
    '  <link rel="canonical" href="https://example.com/list?page=2">',
    '  <link rel="prev" href="https://example.com/list?page=1">',
    '  <link rel="next" href="https://example.com/list?page=5">',
    '</head>',
  ].join('\n'),
  pageUrl: 'https://example.com/list?page=2',
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
    <MultiPanel<PaginationSeoInput, PaginationSeoOptions>
      meta={meta}
      initialInput={{ text: '', pageUrl: '' }}
      initialOptions={{}}
      example={EXAMPLE}
      extraInputs={[{ key: 'pageUrl', label: '页面 URL（识别页码，可选）', rows: 1 }]}
      renderOutput={(input) => {
        let body: React.ReactNode
        try {
          if (input.text.trim() === '') {
            body = <p className="text-slate-500">在左侧粘贴页面 HTML，分页 SEO 检查结果实时显示</p>
          } else {
            const result = checkPagination(input.text, input.pageUrl)
            body = (
              <div className="flex flex-col gap-3">
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  识别页码：{result.page === null ? '（未能识别）' : `第 ${result.page} 页`}
                  {' · '}prev: {result.prev.length === 0 ? '无' : result.prev.join(', ')}
                  {' · '}next: {result.next.length === 0 ? '无' : result.next.join(', ')}
                </div>
                {result.issues.length === 0 ? (
                  <p className="text-sm text-green-700 dark:text-green-400">未发现问题，分页 SEO 设置正确</p>
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
          return renderReport(checkPagination(input.text, input.pageUrl))
        } catch {
          return ''
        }
      }}
      downloadExt="md"
    />
  )
}
