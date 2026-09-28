import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { NetlifyInput, NetlifyOptions } from './schema'
import { buildNetlifyToml, EXAMPLE_NETLIFY_TOML, parseNetlifyToml, summarizeNetlify } from './utils'

function buildResult(input: NetlifyInput): { toml: string; summary: string; error: string } {
  try {
    const config = parseNetlifyToml(input.text)
    const toml = buildNetlifyToml(config)
    return { toml, summary: summarizeNetlify(config), error: '' }
  } catch (err) {
    return { toml: '', summary: '', error: err instanceof Error ? err.message : '校验失败' }
  }
}

export default function Tool() {
  return (
    <MultiPanel<NetlifyInput, NetlifyOptions>
      meta={meta}
      initialInput={{ text: EXAMPLE_NETLIFY_TOML }}
      initialOptions={{}}
      example={{ text: EXAMPLE_NETLIFY_TOML }}
      renderOutput={(input) => {
        const view = buildResult(input)
        return (
          <div className="flex flex-col gap-3">
            {view.error !== '' && (
              <p data-testid="netlify-error" className="text-sm text-red-600 dark:text-red-400">
                {view.error}
              </p>
            )}
            {view.toml !== '' && (
              <div>
                <p
                  data-testid="netlify-summary"
                  className="mb-1 text-xs text-slate-500 dark:text-slate-400"
                >
                  校验通过：{view.summary}
                </p>
                <pre data-testid="netlify-toml" className="whitespace-pre-wrap font-mono text-sm">
                  {view.toml}
                </pre>
              </div>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              说明：左侧编写 netlify.toml，右侧实时校验并输出规范版本；支持
              [build]、[[redirects]]、[[headers]] 与 [headers.values]；from / to / for 须以 /
              开头。不引入 TOML 第三方依赖。
            </p>
          </div>
        )
      }}
      toText={(input) => {
        const view = buildResult(input)
        return view.error !== '' ? view.error : view.toml
      }}
      downloadExt="toml"
    />
  )
}
