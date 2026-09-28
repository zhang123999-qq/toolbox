import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { buildPdf } from './utils'
import type { PdfResult } from './utils'
import type { HtmlToPdfInput, HtmlToPdfOptions } from './schema'

/** 示例：标题、段落、列表、代码块 */
const EXAMPLE: HtmlToPdfInput = {
  text: '<h1>Weekly Digest</h1><p>Highlights of the week:</p><ul><li>Ship v2.0</li><li>Fix login bug</li></ul><pre>deploy --prod</pre>',
}

const optionDefs: readonly OptionDef<HtmlToPdfOptions>[] = [
  { key: 'fontSize', label: '字号', kind: 'select', values: ['10', '12', '14'] },
  { key: 'margin', label: '页边距', kind: 'select', values: ['36', '54', '72'] },
]

export default function Tool() {
  const [pdf, setPdf] = useState<PdfResult | null>(null)
  const [error, setError] = useState('')
  const [working, setWorking] = useState(false)

  /** 生成 PDF 并触发浏览器下载：二进制走 Blob，不经过模板的文本下载通道 */
  async function exportPdf(input: HtmlToPdfInput, options: HtmlToPdfOptions): Promise<void> {
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

  function renderOutput(input: HtmlToPdfInput, options: HtmlToPdfOptions) {
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
            只提取文本结构（标题/段落/列表/代码块），样式与图片会被丢弃；含中文会报错。
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
    <MultiPanel<HtmlToPdfInput, HtmlToPdfOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ fontSize: '12', margin: '54' }}
      example={EXAMPLE}
      optionDefs={optionDefs}
      renderOutput={renderOutput}
      toText={(input) => input.text}
      downloadExt="html"
    />
  )
}
