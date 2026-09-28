import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import {
  EXAMPLE_CSV,
  filterRows,
  paginate,
  parseCsv,
  parsePageSize,
  sortRows,
  toCsv,
  type Row,
  type SortDir,
} from './utils'
import type { DataTableInput, DataTableOptions } from './schema'

/** 示例 CSV */
const EXAMPLE: DataTableInput = { text: EXAMPLE_CSV }

const ERROR_CLASS = 'text-sm text-red-700 dark:text-red-300'
const TH_CLASS =
  'cursor-pointer select-none border px-2 py-1 text-left hover:bg-gray-100 dark:hover:bg-gray-700'
const TD_CLASS = 'border px-2 py-1'

export default function Tool() {
  // 交互状态：排序列 / 方向 / 搜索词 / 页码（随输入变化重置由 key 保证）
  const [sortCol, setSortCol] = useState<number | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>(null)
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)

  const optionDefs: readonly OptionDef<DataTableOptions>[] = [
    { key: 'pageSize', label: '每页条数', kind: 'text', placeholder: '10' },
  ]

  function toggleSort(col: number) {
    if (sortCol !== col) {
      setSortCol(col)
      setSortDir('asc')
    } else if (sortDir === 'asc') {
      setSortDir('desc')
    } else if (sortDir === 'desc') {
      setSortCol(null)
      setSortDir(null)
    } else {
      setSortDir('asc')
    }
    setPage(1)
  }

  function renderOutput(input: DataTableInput, options: DataTableOptions) {
    let headers: string[]
    let rows: Row[]
    let pageSize: number
    try {
      const parsed = parseCsv(input.text.trim() === '' ? EXAMPLE_CSV : input.text)
      headers = parsed.headers
      rows = parsed.rows
      pageSize = parsePageSize(options.pageSize)
    } catch (e) {
      return (
        <p role="alert" className={ERROR_CLASS}>
          {e instanceof Error ? e.message : String(e)}
        </p>
      )
    }

    const filtered = filterRows(rows, keyword)
    const sorted = sortCol === null ? filtered : sortRows(filtered, sortCol, sortDir)
    const { pageRows, totalPages, page: cur } = paginate(sorted, page, pageSize)

    const downloadCsv = () => {
      const blob = new Blob([toCsv(headers, sorted)], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${meta.slug}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    }

    return (
      <div>
        <div className="mb-2 flex items-center gap-2">
          <input
            type="text"
            data-testid="search"
            placeholder="关键词搜索…"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value)
              setPage(1)
            }}
            className="rounded border px-2 py-1 text-sm"
          />
          <span data-testid="row-count" className="text-sm text-gray-600 dark:text-gray-300">
            {filtered.length} / {rows.length} 行
          </span>
          <button
            type="button"
            data-testid="export-csv"
            onClick={downloadCsv}
            className="rounded border px-2 py-1 text-sm"
          >
            导出 CSV
          </button>
        </div>
        <div className="overflow-auto">
          <table data-testid="data-grid" className="border-collapse text-sm">
            <thead>
              <tr>
                {headers.map((h, i) => (
                  <th
                    key={i}
                    data-testid={`th-${i}`}
                    className={TH_CLASS}
                    onClick={() => toggleSort(i)}
                  >
                    {h}
                    {sortCol === i
                      ? sortDir === 'asc'
                        ? ' ▲'
                        : sortDir === 'desc'
                          ? ' ▼'
                          : ''
                      : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r, ri) => (
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
        <div className="mt-2 flex items-center gap-2 text-sm">
          <button
            type="button"
            data-testid="prev-page"
            disabled={cur <= 1}
            onClick={() => setPage(cur - 1)}
            className="rounded border px-2 py-1 disabled:opacity-40"
          >
            上一页
          </button>
          <span data-testid="page-info">
            第 {cur} / {totalPages} 页
          </span>
          <button
            type="button"
            data-testid="next-page"
            disabled={cur >= totalPages}
            onClick={() => setPage(cur + 1)}
            className="rounded border px-2 py-1 disabled:opacity-40"
          >
            下一页
          </button>
        </div>
      </div>
    )
  }

  return (
    <MultiPanel<DataTableInput, DataTableOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ pageSize: '' }}
      example={EXAMPLE}
      optionDefs={optionDefs}
      renderOutput={renderOutput}
      toText={(input) => {
        try {
          const { headers, rows } = parseCsv(input.text.trim() === '' ? EXAMPLE_CSV : input.text)
          return toCsv(headers, rows)
        } catch {
          return ''
        }
      }}
      downloadExt="csv"
    />
  )
}
