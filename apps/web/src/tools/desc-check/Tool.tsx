import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import { analyzeDescription, renderReport } from './utils'
import type { DescCheckInput, DescCheckOptions } from './schema'

const EXAMPLE: DescCheckInput = {
  text: '免费在线工具箱收录上百种实用小工具，涵盖文本处理、编码转换、图片编辑与开发辅助，界面简洁无需注册，打开网页即可使用，欢迎立即试用了解更多精彩功能。',
  keyword: '在线工具箱',
}

function ratingColor(rating: string): string {
  if (rating === '合适') return 'text-green-700 dark:text-green-400'
  if (rating === '过短') return 'text-amber-700 dark:text-amber-400'
  return 'text-red-700 dark:text-red-400'
}

/** 纯本地计算，无网络请求 */
export default function Tool() {
  return (
    <MultiPanel<DescCheckInput, DescCheckOptions>
      meta={meta}
      initialInput={{ text: '', keyword: '' }}
      initialOptions={{}}
      extraInputs={[{ key: 'keyword', label: '目标关键词（可选）', rows: 1 }]}
      example={EXAMPLE}
      renderOutput={(input) => {
        let body: React.ReactNode
        try {
          if (input.text.trim() === '') {
            body = <p className="text-slate-500">在左侧粘贴 meta description 文本，分析结果实时显示</p>
          } else {
            const a = analyzeDescription(input.text, input.keyword)
            body = (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    {a.score}
                    <span className="text-sm font-normal text-slate-500"> / 100</span>
                  </span>
                  <span className={`text-sm font-medium ${ratingColor(a.rating)}`}>
                    长度{a.rating}（{a.charCount} 字符 / 显示宽度 {a.width}）
                  </span>
                </div>
                <dl className="grid grid-cols-1 gap-1 text-sm text-slate-700 dark:text-slate-300">
                  <div>
                    <dt className="inline font-medium">目标关键词：</dt>
                    <dd className="inline">
                      {a.keyword === ''
                        ? '未填写'
                        : a.keywordFound
                          ? `已找到${a.keywordFront ? '（前置✓）' : '（位置靠后）'}`
                          : '未找到'}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline font-medium">重复词：</dt>
                    <dd className="inline">{a.repeatedWords.length > 0 ? a.repeatedWords.join('、') : '无'}</dd>
                  </div>
                  <div>
                    <dt className="inline font-medium">行动号召词：</dt>
                    <dd className="inline">{a.ctaFound.length > 0 ? a.ctaFound.join('、') : '无'}</dd>
                  </div>
                </dl>
                <div>
                  <p className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">改写建议</p>
                  <ul className="list-disc pl-5 text-sm text-slate-600 dark:text-slate-400">
                    {a.suggestions.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )
          }
        } catch (err) {
          body = (
            <div role="alert" data-testid="error" className="text-sm text-red-700 dark:text-red-300">
              {err instanceof Error ? err.message : '分析失败'}
            </div>
          )
        }
        return body
      }}
      toText={(input) => {
        try {
          if (input.text.trim() === '') return ''
          return renderReport(analyzeDescription(input.text, input.keyword))
        } catch {
          return ''
        }
      }}
      downloadExt="md"
    />
  )
}
