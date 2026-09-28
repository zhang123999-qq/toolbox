import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import {
  MAX_PREVIEW_COLS,
  MAX_PREVIEW_ROWS,
  columnLabel,
  previewToText,
  previewWorkbookFile,
} from './utils'
import type { WorkbookPreview } from './utils'
import type { ExcelViewInput, ExcelViewOptions } from './schema'

type RunStatus = 'idle' | 'busy' | 'done' | 'error'

interface ViewState {
  readonly status: RunStatus
  readonly preview: WorkbookPreview | null
  readonly active: number
  readonly error: string
}

const IDLE_STATE: ViewState = { status: 'idle', preview: null, active: 0, error: '' }

const EXAMPLE: ExcelViewInput = {
  text: '在右侧点「选择 Excel 文件」，表格将在此预览，支持切换工作表。',
}

const TAB_BUTTON = 'rounded border px-2 py-1 text-xs '
const TAB_ACTIVE = 'border-brand bg-brand text-white'
const TAB_IDLE = 'border-slate-300 dark:border-slate-700'

/** 从 unknown 取中文错误文案 */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export default function Tool() {
  const [view, setView] = useState<ViewState>(IDLE_STATE)

  /** 文件入口：xlsx 本地解析 → 预览模型存 state，表格渲染在 renderOutput */
  async function handleFile(file: File): Promise<void> {
    setView({ ...IDLE_STATE, status: 'busy' })
    try {
      const preview = await previewWorkbookFile(file)
      setView({ status: 'done', preview, active: 0, error: '' })
    } catch (error) {
      setView({ ...IDLE_STATE, status: 'error', error: messageOf(error) })
    }
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) void handleFile(file)
  }

  function setActive(index: number) {
    setView((prev) => ({ ...prev, active: index }))
  }

  const sheet = view.preview?.sheets[view.active] ?? null

  return (
    <MultiPanel<ExcelViewInput, ExcelViewOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      example={EXAMPLE}
      renderOutput={() => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="excel-file" className={SECONDARY_BUTTON + ' cursor-pointer'}>
              选择 Excel 文件
            </label>
            <input
              id="excel-file"
              data-testid="file"
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={onFileChange}
            />
            {view.preview && (
              <span data-testid="file-name" className="text-xs text-slate-500 dark:text-slate-400">
                {view.preview.fileName}
              </span>
            )}
          </div>

          {view.status === 'busy' && (
            <p data-testid="parsing" className="text-sm text-slate-500">
              正在解析 Excel 文件…
            </p>
          )}

          {view.status === 'error' && view.error !== '' && (
            <p
              role="alert"
              data-testid="excel-error"
              className="text-sm text-red-600 dark:text-red-400"
            >
              {view.error}
            </p>
          )}

          {view.status === 'idle' && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              选择 .xlsx / .xls / .csv 文件后，表格将在此预览：多工作表可切换，只显示前{' '}
              {MAX_PREVIEW_ROWS} 行 × {MAX_PREVIEW_COLS} 列，「下载」可导出为 TSV
              文本。全程本地处理，不上传。
            </p>
          )}

          {view.status === 'done' && view.preview && sheet && (
            <div className="flex flex-col gap-2">
              <div role="tablist" aria-label="工作表" className="flex flex-wrap gap-1">
                {view.preview.sheets.map((s, i) => (
                  <button
                    key={s.name + i}
                    type="button"
                    role="tab"
                    aria-selected={i === view.active}
                    data-testid={`sheet-tab-${i}`}
                    className={TAB_BUTTON + (i === view.active ? TAB_ACTIVE : TAB_IDLE)}
                    onClick={() => setActive(i)}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
              <p data-testid="sheet-info" className="text-xs text-slate-500 dark:text-slate-400">
                {sheet.name}：共 {sheet.totalRows} 行
                {sheet.truncated ? `（仅显示前 ${MAX_PREVIEW_ROWS} 行）` : ''}
              </p>
              {sheet.rows.length === 0 ? (
                <p data-testid="empty-sheet" className="text-sm text-slate-500">
                  （空表）
                </p>
              ) : (
                <div className="max-h-96 overflow-auto border border-slate-200 dark:border-slate-700">
                  <table data-testid="sheet-table" className="w-full border-collapse text-xs">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800">
                      <tr>
                        {sheet.rows[0].map((_, c) => (
                          <th
                            key={c}
                            className="border border-slate-200 px-2 py-1 text-left font-medium dark:border-slate-700"
                          >
                            {columnLabel(c)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sheet.rows.map((row, r) => (
                        <tr key={r} className={r % 2 === 1 ? 'bg-slate-50 dark:bg-slate-900' : ''}>
                          {row.map((cell, c) => (
                            <td
                              key={c}
                              className="max-w-48 truncate border border-slate-200 px-2 py-1 dark:border-slate-700"
                              title={cell}
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      toText={() => (view.preview ? previewToText(view.preview) : '')}
      downloadExt="tsv"
    />
  )
}
