import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { buildPdf } from './utils'
import type { PdfResult } from './utils'
import type { CodeToPdfInput, CodeToPdfOptions } from './schema'

/** 示例：一段 JS */
const EXAMPLE: CodeToPdfInput = {
  text: 'function fib(n) {\n\tif (n < 2) return n;\n\treturn fib(n - 1) + fib(n - 2);\n}\n\nconsole.log(fib(10));',
}

const optionDefs: readonly OptionDef<CodeToPdfOptions>[] = [
  { key: 'fontSize', label: '字号', kind: 'select', values: ['9', '10', '12'] },
  { key: 'lineNumbers', label: '显示行号', kind: 'boolean' },
  { key: 'margin', label: '页边距', kind: 'select', values: ['36', '54', '72'] },
]

export default function Tool() {
  const [pdf, setPdf] = useState<PdfResult | null>(null)
  const [error, setError] = useState('')
  const [working, setWorking] = useState(false)

  /** 生成 PDF 并触发浏览器下载：二进制走 Blob，不经过模板的文本下载通道 */
  async function exportPdf(input: CodeToPdfInput, options: CodeToPdfOptions): Promise<void> {
    setWorking(true)
    setError('')
    try {
      const result = await buildPdf(input, options)
      setPdf(result)
      const bytes = new Uint8Array(result.bytes) // 精确拷贝，保证 .buffer 可安全传给 Blob
      const blob = new Blob([bytes.buffer], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${meta.slug}.pdf`
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

  function renderOutput(input: CodeToPdfInput, options: CodeToPdfOptions) {
    return (
      <div className="flex flex-col gap-2">
        <div>
          <button
            type="button"
            data-testid="export-pdf"
            className={SECONDARY_BUTTON}
            disabled={working}
            onClick={() => void exportPdf(input, options)}
          >
            {working ? '生成中…' : '生成并下载 PDF'}
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
            等宽字体排版，制表符按 4 空格展开；含中文会报错。
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
    <MultiPanel<CodeToPdfInput, CodeToPdfOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ fontSize: '10', lineNumbers: true, margin: '54' }}
      example={EXAMPLE}
      optionDefs={optionDefs}
      renderOutput={renderOutput}
      toText={(input) => input.text}
      downloadExt="txt"
    />
  )
}
