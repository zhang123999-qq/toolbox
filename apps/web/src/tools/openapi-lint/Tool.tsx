import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { OpenapiLintInput } from './schema'
import {
  DEFAULT_SPEC_JSON,
  formatLintReport,
  lintOpenApi,
  parseSpec,
  type LintIssue,
  type LintResult,
} from './utils'

const SEVERITY_STYLE: Record<LintIssue['severity'], string> = {
  error: 'text-red-600 dark:text-red-400',
  warning: 'text-amber-600 dark:text-amber-400',
  info: 'text-slate-500 dark:text-slate-400',
}

const SEVERITY_LABEL: Record<LintIssue['severity'], string> = {
  error: '错误',
  warning: '警告',
  info: '提示',
}

function lint(input: OpenapiLintInput): { result: LintResult | null; error: string } {
  try {
    const spec = parseSpec(input.text)
    return { result: lintOpenApi(spec), error: '' }
  } catch (err) {
    return { result: null, error: err instanceof Error ? err.message : '解析失败' }
  }
}

export default function Tool() {
  return (
    <MultiPanel<OpenapiLintInput, Record<string, never>>
      meta={meta}
      initialInput={{ text: DEFAULT_SPEC_JSON }}
      initialOptions={{}}
      example={{ text: DEFAULT_SPEC_JSON }}
      renderOutput={(input) => {
        const { result, error } = lint(input)
        if (error !== '') {
          return (
            <p data-testid="lint-error" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )
        }
        const r = result as LintResult
        return (
          <div className="flex flex-col gap-2">
            <p data-testid="lint-summary" className="text-sm font-medium">
              {r.summary}
            </p>
            <p data-testid="lint-score" className="font-mono text-2xl">
              {r.score} 分
            </p>
            {r.issues.length === 0 ? (
              <p className="text-sm text-green-600 dark:text-green-400">未发现问题，规范良好。</p>
            ) : (
              <ul data-testid="lint-issues" className="flex flex-col gap-1">
                {r.issues.map((issue, i) => (
                  <li key={i} className={`font-mono text-sm ${SEVERITY_STYLE[issue.severity]}`}>
                    [{SEVERITY_LABEL[issue.severity]}] {issue.path}：{issue.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      }}
      toText={(input) => {
        const { result, error } = lint(input)
        return error !== '' ? error : formatLintReport(result as LintResult)
      }}
    />
  )
}
