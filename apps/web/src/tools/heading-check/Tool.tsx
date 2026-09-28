import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import { analyzeHtml, renderOutline, renderReport } from './utils'
import type { HeadingCheckInput, HeadingCheckOptions } from './schema'

const EXAMPLE: HeadingCheckInput = {
  text: [
    '<h1>免费在线工具箱</h1>',
    '<h2>文本工具</h2>',
    '<h3>字数统计</h3>',
    '<h3>大小写转换</h3>',
    '<h2>图片工具</h2>',
    '<h4>跳过了 h3（演示告警）</h4>',
  ].join('\n'),
}

/** 纯本地计算，无网络请求 */
export default function Tool() {
  return (
    <MultiPanel<HeadingCheckInput, HeadingCheckOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      example={EXAMPLE}
      renderOutput={(input) => {
        let body: React.ReactNode
        try {
          if (input.text.trim() === '') {
            body = (
              <p className="text-slate-500">
                在左侧粘贴页面的 HTML 源码，标题大纲与检查结果实时显示
              </p>
            )
          } else {
            const { headings, result } = analyzeHtml(input.text)
            body = (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    {result.score}
                    <span className="text-sm font-normal text-slate-500"> / 100</span>
                  </span>
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    共 {result.total} 个标题，h1 × {result.h1Count}
                  </span>
                </div>
                <div>
                  <p className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                    大纲
                  </p>
                  <pre className="whitespace-pre-wrap rounded bg-slate-100 p-2 font-mono text-xs text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    {renderOutline(headings)}
                  </pre>
                </div>
                <div>
                  <p className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                    检查结果（{result.issues.length}）
                  </p>
                  {result.issues.length === 0 ? (
                    <p className="text-sm text-green-700 dark:text-green-400">
                      未发现问题，标题结构良好
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {result.issues.map((issue, i) => (
                        <li
                          key={i}
                          className={`rounded p-1.5 text-sm ${
                            issue.level === 'error'
                              ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                              : 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          [{issue.level === 'error' ? '错误' : '警告'}] {issue.message}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
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
              {err instanceof Error ? err.message : '分析失败'}
            </div>
          )
        }
        return body
      }}
      toText={(input) => {
        try {
          if (input.text.trim() === '') return ''
          const { headings, result } = analyzeHtml(input.text)
          return renderReport(headings, result)
        } catch {
          return ''
        }
      }}
      downloadExt="md"
    />
  )
}
