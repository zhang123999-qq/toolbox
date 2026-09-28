import { useRef, useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { AGGS, parseCsv, pivotTable, toPivotCsv, transform, type PivotResult } from './utils'
import type { PivotInput, PivotOptions } from './schema'

/** 示例输入 */
const EXAMPLE: PivotInput = { text: '', rowKey: '地区', colKey: '季度', valKey: '销售额' }

const ERROR_CLASS = 'text-sm text-red-700 dark:text-red-300'
const CELL_CLASS = 'border border-slate-300 px-2 py-1 dark:border-slate-600'

export default function Tool() {
  // 导出用：render 阶段缓存最近一次成功的透视结果与角落标签
  const pendingExport = useRef<{ csv: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const optionDefs: readonly OptionDef<PivotOptions>[] = [
    { key: 'agg', label: '聚合方式', kind: 'select', values: AGGS },
  ]

  function downloadCsv() {
    const pending = pendingExport.current
    if (!pending) {
      setError('暂无可导出的透视结果')
      return
    }
    try {
      const blob = new Blob([pending.csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${meta.slug}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function renderTable(result: PivotResult) {
    return (
      <table data-testid="pivot-table" className="border-collapse text-sm">
        <thead>
          <tr>
            <th className={CELL_CLASS} />
            {result.colHeaders.map((h) => (
              <th key={h} className={CELL_CLASS}>
                {h}
              </th>
            ))}
            <th className={CELL_CLASS}>行合计</th>
          </tr>
        </thead>
        <tbody>
          {result.rowHeaders.map((rh, r) => (
            <tr key={rh}>
              <th className={CELL_CLASS}>{rh}</th>
              {result.matrix[r].map((v, c) => (
                <td key={c} className={CELL_CLASS}>
                  {v === null ? '' : v}
                </td>
              ))}
              <td className={CELL_CLASS}>{result.rowTotals[r]}</td>
            </tr>
          ))}
          <tr>
            <th className={CELL_CLASS}>列合计</th>
            {result.colTotals.map((t, c) => (
              <td key={c} className={CELL_CLASS}>
                {t}
              </td>
            ))}
            <td className={CELL_CLASS}>{result.grandTotal}</td>
          </tr>
        </tbody>
      </table>
    )
  }

  function renderOutput(input: PivotInput, options: PivotOptions) {
    try {
      const rows = parseCsv(transform(input))
      const result = pivotTable(rows, {
        rowKey: input.rowKey.trim(),
        colKey: input.colKey.trim(),
        valKey: input.valKey.trim(),
        agg: options.agg,
      })
      pendingExport.current = {
        csv: toPivotCsv(result, `${input.rowKey.trim()}/${input.colKey.trim()}`),
      }
      return (
        <div>
          <div className="overflow-x-auto">{renderTable(result)}</div>
          <button type="button" data-testid="download-csv" onClick={downloadCsv} className="mt-2">
            导出 CSV
          </button>
          {error ? (
            <p role="alert" className={ERROR_CLASS}>
              {error}
            </p>
          ) : null}
        </div>
      )
    } catch (e) {
      pendingExport.current = null
      return (
        <p role="alert" className={ERROR_CLASS}>
          {e instanceof Error ? e.message : String(e)}
        </p>
      )
    }
  }

  return (
    <MultiPanel<PivotInput, PivotOptions>
      meta={meta}
      initialInput={{ text: '', rowKey: '地区', colKey: '季度', valKey: '销售额' }}
      initialOptions={{ agg: 'sum' }}
      example={EXAMPLE}
      optionDefs={optionDefs}
      extraInputs={[
        { key: 'rowKey', label: '行维度列名' },
        { key: 'colKey', label: '列维度列名' },
        { key: 'valKey', label: '值列名' },
      ]}
      renderOutput={renderOutput}
      toText={(input, options) => {
        try {
          const rows = parseCsv(transform(input))
          const result = pivotTable(rows, {
            rowKey: input.rowKey.trim(),
            colKey: input.colKey.trim(),
            valKey: input.valKey.trim(),
            agg: options.agg,
          })
          return toPivotCsv(result, `${input.rowKey.trim()}/${input.colKey.trim()}`)
        } catch {
          return ''
        }
      }}
      downloadExt="csv"
    />
  )
}
