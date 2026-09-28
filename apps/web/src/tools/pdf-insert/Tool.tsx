import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { ExtraInputDef } from '../../components/tool/templates/TwoColumn'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { insertTextIntoPdf, validatePdfFile } from './utils'
import type { PdfResult } from './utils'
import type { PdfInsertInput } from './schema'

/** 示例：插入的文字与页码 */
const EXAMPLE: PdfInsertInput = { text: 'DRAFT - Confidential', page: '1' }

const extraInputs: readonly ExtraInputDef[] = [{ key: 'page', label: '页码（从 1 开始）', rows: 1 }]

export default function Tool() {
  // T3 模板无原生文件入口：PDF 文件存在组件 state 里，由自定义输出区的文件选择框维护
  const [file, setFile] = useState<File | null>(null)
  const [pdf, setPdf] = useState<PdfResult | null>(null)
  const [error, setError] = useState('')
  const [working, setWorking] = useState(false)

  /** 读取文件 → 插入文字 → 触发浏览器下载：二进制走 Blob，不经过模板的文本下载通道 */
  async function exportPdf(input: PdfInsertInput): Promise<void> {
    setWorking(true)
    setError('')
    try {
      if (file === null) throw new Error('请先选择 PDF 文件')
      validatePdfFile(file)
      const result = await insertTextIntoPdf(
        new Uint8Array(await file.arrayBuffer()),
        input.text,
        input.page,
      )
      setPdf(result)
      const bytes = new Uint8Array(result.bytes) // 精确拷贝，保证 .buffer 可安全传给 Blob
      const blob = new Blob([bytes.buffer], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = file.name.replace(/\.pdf$/i, '') + '-inserted.pdf'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setPdf(null)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setWorking(false)
    }
  }

  function renderOutput(input: PdfInsertInput) {
    return (
      <div className="flex flex-col gap-2">
        <div>
          <label
            htmlFor="pdf-insert-file"
            className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400"
          >
            PDF 文件
          </label>
          <input
            id="pdf-insert-file"
            data-testid="file"
            type="file"
            accept=".pdf,application/pdf"
            className="w-full text-sm text-slate-700 dark:text-slate-200"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null)
              setPdf(null)
              setError('')
            }}
          />
        </div>
        <div>
          <button
            type="button"
            data-testid="export-pdf"
            className={SECONDARY_BUTTON}
            disabled={working}
            onClick={() => void exportPdf(input)}
          >
            {working ? '处理中…' : '插入并下载 PDF'}
          </button>
        </div>
        {error === '' ? null : (
          <p
            role="alert"
            data-testid="export-error"
            className="text-sm text-red-700 dark:text-red-300"
          >
            {error}
          </p>
        )}
        {pdf === null ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            先选 PDF，再填文字与页码；文字插在页面左上角，含中文会报错。
          </p>
        ) : (
          <p data-testid="pdf-info" className="text-sm text-slate-600 dark:text-slate-300">
            已生成 PDF：{pdf.pages} 页，{(pdf.bytes.length / 1024).toFixed(1)} KB
          </p>
        )}
      </div>
    )
  }

  return (
    <MultiPanel<PdfInsertInput, Record<string, never>>
      meta={meta}
      initialInput={{ text: '', page: '' }}
      initialOptions={{}}
      example={EXAMPLE}
      extraInputs={extraInputs}
      renderOutput={renderOutput}
      toText={(input) => input.text}
      downloadExt="txt"
    />
  )
}
