import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { EdgeRedirectInput, EdgeRedirectOptions } from './schema'
import {
  buildRedirectRules,
  describeRules,
  EXAMPLE_RULE,
  parseRedirectRulesJson,
  validateRedirectRule,
  type RedirectRule,
} from './utils'

interface RedirectView {
  error: string
  json: string
  summary: string
}

function buildView(input: EdgeRedirectInput, options: EdgeRedirectOptions): RedirectView {
  try {
    if (options.mode === 'parse') {
      if (input.text.trim() === '') return { error: '', json: '', summary: '左侧粘贴规则 JSON 后解析' }
      const rules = parseRedirectRulesJson(input.text)
      return { error: '', json: '', summary: describeRules(rules) }
    }
    const rule: RedirectRule = {
      from: options.from.trim(),
      to: options.to.trim(),
      status: Number(options.status) as RedirectRule['status'],
    }
    const error = validateRedirectRule(rule)
    if (error) return { error, json: '', summary: '' }
    const json = buildRedirectRules([rule])
    return { error: '', json, summary: describeRules([rule]) }
  } catch (err) {
    return { error: err instanceof Error ? err.message : '处理失败', json: '', summary: '' }
  }
}

export default function Tool() {
  return (
    <MultiPanel<EdgeRedirectInput, EdgeRedirectOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{
        mode: 'generate',
        from: EXAMPLE_RULE.from,
        to: EXAMPLE_RULE.to,
        status: '301',
      }}
      example={{ text: '' }}
      optionDefs={[
        { key: 'mode', label: '模式', kind: 'select', values: ['generate', 'parse'] },
        { key: 'from', label: '来源（from）', kind: 'text' },
        { key: 'to', label: '目标（to）', kind: 'text' },
        { key: 'status', label: '状态码', kind: 'select', values: ['301', '302', '307', '308'] },
      ]}
      renderOutput={(input, options) => {
        const view = buildView(input, options)
        return (
          <div className="flex flex-col gap-3">
            {view.error !== '' && (
              <p data-testid="edge-redirect-error" className="text-sm text-red-600 dark:text-red-400">
                {view.error}
              </p>
            )}
            {view.json !== '' && (
              <pre data-testid="edge-redirect-json" className="whitespace-pre-wrap rounded bg-slate-100 p-3 font-mono text-xs dark:bg-slate-900">
                {view.json}
              </pre>
            )}
            {view.summary !== '' && (
              <p data-testid="edge-redirect-summary" className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
                {view.summary}
              </p>
            )}
          </div>
        )
      }}
      toText={(input, options) => {
        const view = buildView(input, options)
        return view.json !== '' ? view.json : view.summary
      }}
      downloadExt="json"
    />
  )
}
