import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { ExtraInputDef } from '../../components/tool/templates/TwoColumn'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { attachFileToPdf, validatePdfFile } from './utils'
import type { PdfResult } from './utils'
import type { PdfAttachInput } from './schema'

/** 示例：附件文件名与内容 */
const EXAMPLE: PdfAttachInput = { text: 'These are the release notes.', filename: 'notes.txt' }

const extraInputs: readonly ExtraInputDef[] = [
  { key: 'filename', label: '附件文件名（如 notes.txt）', rows: 1 },
]

export default function Tool() {
  // T3 模板无原生文件入口：PDF 文件存在组件 state 里，由自定义输出区的文件选择框维护
  const [file, setFile] = useState<File | null>(null)
  const [pdf, setPdf] = useState<PdfResult | null>(null)
  const [error, setError] = useState('')
  const [working, setWorking] = useState(false)

  /** 读取文件 → 嵌入附件 → 触发浏览器下载：二进制走 Blob，不经过模板的文本下载通道 */
  async function exportPdf(input: PdfAttachInput): Promise<void> {
    setWorking(true)
    setError('')
    try {
      if (file === null) throw new Error('请先选择 PDF 文件')
      validatePdfFile(file)
      const result = await attachFileToPdf(
        new Uint8Array(await file.arrayBuffer()),
        input.text,
        input.filename,
      )
      setPdf(result)
      const bytes = new Uint8Array(result.bytes) // 精确拷贝，保证 .buffer 可安全传给 Blob
      const blob = new Blob([bytes.buffer], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = file.name.replace(/\.pdf$/i, '') + '-attach.pdf'
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

  function renderOutput(input: PdfAttachInput) {
    return (
      <div className="flex flex-col gap-2">
        <div>
          <label
            htmlFor="pdf-attach-file"
            className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400"
          >
            PDF 文件
          </label>
          <input
            id="pdf-attach-file"
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
            {working ? '处理中…' : '嵌入附件并下载 PDF'}
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
            先选 PDF，再填附件文件名与文本内容；附件嵌入后可用阅读器的附件面板查看。
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
    <MultiPanel<PdfAttachInput, Record<string, never>>
      meta={meta}
      initialInput={{ text: '', filename: '' }}
      initialOptions={{}}
      example={EXAMPLE}
      extraInputs={extraInputs}
      renderOutput={renderOutput}
      toText={(input) => input.text}
      downloadExt="txt"
    />
  )
}
