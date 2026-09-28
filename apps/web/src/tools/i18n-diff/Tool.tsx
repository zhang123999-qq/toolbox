import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { ExtraInputDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { DIFF_KIND_LABELS, diffI18n, formatDiffResult, type DiffKind, type I18nDiffResult } from './utils'
import type { I18nDiffInput, I18nDiffOptions } from './schema'

/** 示例：英文基准 vs 中文目标（含缺失/空值/未翻译） */
const EXAMPLE: I18nDiffInput = {
  text: '{\n  "app": {\n    "title": "My App",\n    "ok": "OK",\n    "cancel": "Cancel"\n  }\n}',
  target: '{\n  "app": {\n    "title": "我的应用",\n    "ok": "OK"\n  }\n}',
}

const extraInputs: readonly ExtraInputDef[] = [{ key: 'target', label: '目标语言 JSON', rows: 8 }]

const ERROR_CLASS = 'text-sm text-red-700 dark:text-red-300'

function compute(input: I18nDiffInput): I18nDiffResult {
  const base = input.text.trim() === '' ? EXAMPLE.text : input.text
  const target = input.target.trim() === '' ? EXAMPLE.target : input.target
  return diffI18n(base, target)
}

function toText(input: I18nDiffInput): string {
  try {
    return formatDiffResult(compute(input))
  } catch (e) {
    return `对比失败：${e instanceof Error ? e.message : String(e)}`
  }
}

const SECTIONS: ReadonlyArray<{ kind: DiffKind; keys: (r: I18nDiffResult) => string[] }> = [
  { kind: 'missing', keys: (r) => r.missingKeys },
  { kind: 'extra', keys: (r) => r.extraKeys },
  { kind: 'empty', keys: (r) => r.emptyValues },
  { kind: 'untranslated', keys: (r) => r.untranslatedKeys },
]

export default function Tool() {
  function renderOutput(input: I18nDiffInput) {
    try {
      const r = compute(input)
      return (
        <div data-testid="results" className="space-y-3">
          <p data-testid="result-summary" className="text-sm">
            基准 <span className="font-mono">{r.totalBase}</span> 条 目标{' '}
            <span className="font-mono">{r.totalTarget}</span> 条 已翻译{' '}
            <span className="font-mono">{r.translatedCount}</span> 条 完成率{' '}
            <span className="font-mono font-bold">{r.completionRate}%</span>
          </p>
          {SECTIONS.map(({ kind, keys }) => {
            const list = keys(r)
            return (
              <div key={kind}>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  {DIFF_KIND_LABELS[kind]}（{list.length}）
                </p>
                {list.length === 0 ? (
                  <p className="text-xs text-gray-400">无</p>
                ) : (
                  <ul className="mt-1 space-y-0.5">
                    {list.map((k) => (
                      <li key={k} data-testid={`result-${kind}`} className="font-mono text-xs break-all">
                        {k}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      )
    } catch (e) {
      return (
        <p role="alert" className={ERROR_CLASS}>
          {e instanceof Error ? e.message : String(e)}
        </p>
      )
    }
  }

  return (
    <MultiPanel<I18nDiffInput, I18nDiffOptions>
      meta={meta}
      initialInput={{ text: '', target: '' }}
      initialOptions={{}}
      example={EXAMPLE}
      extraInputs={extraInputs}
      renderOutput={renderOutput}
      toText={toText}
      downloadExt="txt"
    />
  )
}
