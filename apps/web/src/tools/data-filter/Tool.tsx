import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import {
  EXAMPLE_CONDITIONS,
  EXAMPLE_CSV,
  applyFilters,
  parseConditions,
  parseCsv,
  parseLogic,
  toCsv,
  type Row,
} from './utils'
import type { DataFilterInput, DataFilterOptions } from './schema'

/** 示例：CSV + 两条 AND 条件 */
const EXAMPLE: DataFilterInput = { text: EXAMPLE_CSV, conditions: EXAMPLE_CONDITIONS }

const ERROR_CLASS = 'text-sm text-red-700 dark:text-red-300'
const TD_CLASS = 'border px-2 py-1'
const TH_CLASS = 'border bg-gray-50 px-2 py-1 text-left dark:bg-gray-700'

function resolveInput(input: DataFilterInput): { headers: string[]; rows: Row[] } {
  const csvText = input.text.trim() === '' ? EXAMPLE_CSV : input.text
  return parseCsv(csvText)
}

function resolveConditions(input: DataFilterInput) {
  const condText = input.conditions.trim() === '' ? EXAMPLE_CONDITIONS : input.conditions
  return parseConditions(condText)
}

export default function Tool() {
  const optionDefs: readonly OptionDef<DataFilterOptions>[] = [
    { key: 'logic', label: '条件关系（AND/OR）', kind: 'text', placeholder: 'AND' },
  ]

  function renderOutput(input: DataFilterInput, options: DataFilterOptions) {
    try {
      const { headers, rows } = resolveInput(input)
      const conds = resolveConditions(input)
      const logic = parseLogic(options.logic)
      const matched = applyFilters(headers, rows, conds, logic)
      return (
        <div>
          <p data-testid="match-count" className="mb-2 text-sm">
            命中 {matched.length} / {rows.length} 行（{logic}）
          </p>
          <div className="overflow-auto">
            <table data-testid="result-grid" className="border-collapse text-sm">
              <thead>
                <tr>
                  {headers.map((h, i) => (
                    <th key={i} className={TH_CLASS}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matched.map((r, ri) => (
                  <tr key={ri}>
                    {headers.map((_, ci) => (
                      <td key={ci} className={TD_CLASS}>
                        {r[ci] ?? ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
    <MultiPanel<DataFilterInput, DataFilterOptions>
      meta={meta}
      initialInput={{ text: '', conditions: '' }}
      initialOptions={{ logic: 'AND' }}
      example={EXAMPLE}
      optionDefs={optionDefs}
      extraInputs={[{ key: 'conditions', label: '过滤条件（每行：列名 运算符 值）' }]}
      renderOutput={renderOutput}
      toText={(input, options) => {
        try {
          const { headers, rows } = resolveInput(input)
          const conds = resolveConditions(input)
          const logic = parseLogic(options.logic)
          return toCsv(headers, applyFilters(headers, rows, conds, logic))
        } catch {
          return ''
        }
      }}
      downloadExt="csv"
    />
  )
}
