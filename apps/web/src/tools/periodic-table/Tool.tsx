import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { PeriodicTableInput, PeriodicTableOptions } from './schema'
import { CATEGORIES, describeElement, elementsByCategory, getElement } from './utils'

interface TableView {
  error: string
  detail: string
}

function buildView(input: PeriodicTableInput, options: PeriodicTableOptions): TableView {
  try {
    if (options.mode === 'category') {
      const elements = elementsByCategory(options.category)
      const detail =
        `${options.category}（${elements.length} 种）：\n` +
        elements.map((el) => `${el.n}. ${el.name}（${el.symbol}）`).join('\n')
      return { error: '', detail }
    }
    const query = input.text.trim() === '' ? 'Fe' : input.text
    return { error: '', detail: describeElement(getElement(query)) }
  } catch (err) {
    return { error: err instanceof Error ? err.message : '处理失败', detail: '' }
  }
}

export default function Tool() {
  return (
    <MultiPanel<PeriodicTableInput, PeriodicTableOptions>
      meta={meta}
      initialInput={{ text: 'Fe' }}
      initialOptions={{ mode: 'search', category: '卤素' }}
      example={{ text: 'Au' }}
      optionDefs={[
        { key: 'mode', label: '模式', kind: 'select', values: ['search', 'category'] },
        { key: 'category', label: '分类', kind: 'select', values: [...CATEGORIES] },
      ]}
      renderOutput={(input, options) => {
        const view = buildView(input, options)
        return (
          <div className="flex flex-col gap-3">
            {view.error !== '' && (
              <p
                data-testid="periodic-table-error"
                className="text-sm text-red-600 dark:text-red-400"
              >
                {view.error}
              </p>
            )}
            {view.detail !== '' && (
              <p
                data-testid="periodic-table-detail"
                className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300"
              >
                {view.detail}
              </p>
            )}
          </div>
        )
      }}
      toText={(input, options) => buildView(input, options).detail}
      downloadExt="txt"
    />
  )
}
