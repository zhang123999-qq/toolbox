import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import {
  EXAMPLE_CSV,
  EXAMPLE_SPEC,
  multiSortRows,
  parseCsv,
  parseSortSpec,
  toCsv,
  type Row,
} from './utils'
import type { DataSortInput, DataSortOptions } from './schema'

/** 示例：CSV + 年龄降序、销售额升序 */
const EXAMPLE: DataSortInput = { text: EXAMPLE_CSV, sortSpec: EXAMPLE_SPEC }

const ERROR_CLASS = 'text-sm text-red-700 dark:text-red-300'
const TD_CLASS = 'border px-2 py-1'
const TH_CLASS = 'border bg-gray-50 px-2 py-1 text-left dark:bg-gray-700'

function resolveInput(input: DataSortInput): { headers: string[]; rows: Row[] } {
  const csvText = input.text.trim() === '' ? EXAMPLE_CSV : input.text
  return parseCsv(csvText)
}

function resolveSpec(input: DataSortInput) {
  const specText = input.sortSpec.trim() === '' ? EXAMPLE_SPEC : input.sortSpec
  return parseSortSpec(specText)
}

export default function Tool() {
  function renderOutput(input: DataSortInput, _options: DataSortOptions) {
    try {
      const { headers, rows } = resolveInput(input)
      const rules = resolveSpec(input)
      const sorted = multiSortRows(headers, rows, rules)
      return (
        <div>
          <p data-testid="sort-info" className="mb-2 text-sm">
            按 {rules.map((r) => `${r.column} ${r.dir}`).join(' → ')} 排序，共 {sorted.length} 行
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
                {sorted.map((r, ri) => (
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
    <MultiPanel<DataSortInput, DataSortOptions>
      meta={meta}
      initialInput={{ text: '', sortSpec: '' }}
      initialOptions={{}}
      example={EXAMPLE}
      extraInputs={[{ key: 'sortSpec', label: '排序规则（每行：列名:asc|desc，方向缺省 asc）' }]}
      renderOutput={renderOutput}
      toText={(input) => {
        try {
          const { headers, rows } = resolveInput(input)
          return toCsv(headers, multiSortRows(headers, rows, resolveSpec(input)))
        } catch {
          return ''
        }
      }}
      downloadExt="csv"
    />
  )
}
