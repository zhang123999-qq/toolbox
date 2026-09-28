import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { VercelInput, VercelOptions } from './schema'
import { buildVercelJson, EXAMPLE_VERCEL_JSON, parseVercelJson, summarizeConfig } from './utils'

function buildResult(input: VercelInput): { json: string; summary: string; error: string } {
  try {
    const config = parseVercelJson(input.text)
    const json = buildVercelJson(config)
    return { json, summary: summarizeConfig(config), error: '' }
  } catch (err) {
    return { json: '', summary: '', error: err instanceof Error ? err.message : '校验失败' }
  }
}

export default function Tool() {
  return (
    <MultiPanel<VercelInput, VercelOptions>
      meta={meta}
      initialInput={{ text: EXAMPLE_VERCEL_JSON }}
      initialOptions={{}}
      example={{ text: EXAMPLE_VERCEL_JSON }}
      renderOutput={(input) => {
        const view = buildResult(input)
        return (
          <div className="flex flex-col gap-3">
            {view.error !== '' && (
              <p data-testid="vercel-error" className="text-sm text-red-600 dark:text-red-400">
                {view.error}
              </p>
            )}
            {view.json !== '' && (
              <div>
                <p
                  data-testid="vercel-summary"
                  className="mb-1 text-xs text-slate-500 dark:text-slate-400"
                >
                  校验通过：{view.summary}
                </p>
                <pre data-testid="vercel-json" className="whitespace-pre-wrap font-mono text-sm">
                  {view.json}
                </pre>
              </div>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              说明：左侧粘贴或编写 vercel.json，右侧实时校验并输出格式化版本；source 须以 /
              开头，destination 可为站内路径或 http(s) 外链。只处理 rewrites / redirects / headers
              三节。
            </p>
          </div>
        )
      }}
      toText={(input) => {
        const view = buildResult(input)
        return view.error !== '' ? view.error : view.json
      }}
      downloadExt="json"
    />
  )
}
