import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { EdgeRouteInput, EdgeRouteOptions } from './schema'
import { EXAMPLE_ROUTES, EXAMPLE_URL, matchRoute, parseRoutesText } from './utils'

interface MatchView {
  error: string
  matched: string
  detail: string
}

function buildView(input: EdgeRouteInput): MatchView {
  try {
    const rules = parseRoutesText(input.text)
    if (input.url.trim() === '') return { error: '请输入待测试的 URL', matched: '', detail: '' }
    const hit = matchRoute(rules, input.url)
    if (hit === null)
      return {
        error: '',
        matched: '无命中',
        detail: `共 ${rules.length} 条规则，没有一条匹配该 URL`,
      }
    return {
      error: '',
      matched: hit.target,
      detail: `命中规则：${hit.pattern}（共 ${rules.length} 条规则）`,
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : '匹配失败', matched: '', detail: '' }
  }
}

export default function Tool() {
  return (
    <MultiPanel<EdgeRouteInput, EdgeRouteOptions>
      meta={meta}
      initialInput={{ text: EXAMPLE_ROUTES, url: EXAMPLE_URL }}
      initialOptions={{}}
      example={{ text: EXAMPLE_ROUTES, url: EXAMPLE_URL }}
      extraInputs={[{ key: 'url', label: '待测试 URL', rows: 1 }]}
      renderOutput={(input) => {
        const view = buildView(input)
        return (
          <div className="flex flex-col gap-3">
            {view.error !== '' && (
              <p data-testid="edge-route-error" className="text-sm text-red-600 dark:text-red-400">
                {view.error}
              </p>
            )}
            {view.matched !== '' && (
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">命中目标</p>
                <p
                  data-testid="edge-route-target"
                  className="font-mono text-lg font-semibold text-emerald-700 dark:text-emerald-300"
                >
                  {view.matched}
                </p>
                <p data-testid="edge-route-detail" className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {view.detail}
                </p>
              </div>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              匹配对象为「主机名 + 路径」（不含协议与查询串）；优先级：精确 &gt; 前缀 &gt; 通配符。
            </p>
          </div>
        )
      }}
      toText={(input) => {
        const view = buildView(input)
        return view.error !== '' ? view.error : `${view.matched}\n${view.detail}`
      }}
      downloadExt="txt"
    />
  )
}
