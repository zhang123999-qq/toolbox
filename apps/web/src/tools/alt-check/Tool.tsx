import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import { analyzeHtml, renderReport } from './utils'
import type { AltCheckInput, AltCheckOptions } from './schema'

const EXAMPLE: AltCheckInput = {
  text: [
    '<img src="hero.jpg" alt="免费在线工具箱首页横幅">',
    '<img src="logo.png" alt="logo.png">',
    '<img src="banner.jpg">',
    '<img src="deco.svg" alt="">',
  ].join('\n'),
}

/** 纯本地计算，无网络请求 */
export default function Tool() {
  return (
    <MultiPanel<AltCheckInput, AltCheckOptions>
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
                在左侧粘贴页面的 HTML 源码，图片 alt 检查结果实时显示
              </p>
            )
          } else {
            const { result } = analyzeHtml(input.text)
            body = (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    {Math.round(result.passRate * 100)}
                    <span className="text-sm font-normal text-slate-500">%</span>
                  </span>
                  <span className="text-slate-600 dark:text-slate-400">
                    共 {result.total} 张图片，通过 {result.passCount}，缺少 alt {result.missing}
                    ，alt 为空 {result.empty}
                  </span>
                </div>
                {result.items.every((i) => i.issues.length === 0) ? (
                  <p className="text-sm text-green-700 dark:text-green-400">
                    未发现问题，所有图片的 alt 均符合要求
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {result.items.map((item) => (
                      <li
                        key={item.index}
                        className="rounded border border-slate-200 p-2 dark:border-slate-700"
                      >
                        <p className="mb-1 font-mono text-xs text-slate-500">
                          [{item.index}] {item.src === '' ? '（无 src）' : item.src}
                        </p>
                        <p className="mb-1 text-sm text-slate-700 dark:text-slate-300">
                          alt = {item.alt === null ? '（无 alt 属性）' : `「${item.alt}」`}
                        </p>
                        {item.issues.length === 0 ? (
                          <p className="text-xs text-green-700 dark:text-green-400">✓ 通过</p>
                        ) : (
                          <ul className="list-disc pl-5 text-xs text-amber-800 dark:text-amber-300">
                            {item.issues.map((issue, j) => (
                              <li key={j}>{issue}</li>
                            ))}
                          </ul>
                        )}
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
              {err instanceof Error ? err.message : '分析失败'}
            </div>
          )
        }
        return body
      }}
      toText={(input) => {
        try {
          if (input.text.trim() === '') return ''
          return renderReport(analyzeHtml(input.text).result)
        } catch {
          return ''
        }
      }}
      downloadExt="md"
    />
  )
}
