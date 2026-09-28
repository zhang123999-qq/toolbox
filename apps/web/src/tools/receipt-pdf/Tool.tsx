import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { ExtraInputDef } from '../../components/tool/templates/TwoColumn'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { buildPdf, buildReceiptData, toPlainText } from './utils'
import type { PdfResult } from './utils'
import type { ReceiptInput } from './schema'

/** 示例：咖啡馆小票 */
const EXAMPLE: ReceiptInput = {
  text: 'Coffee,2,4.5\nSandwich,1,12',
  merchant: 'Sunny Cafe',
  date: '2026-09-28',
  payment: 'Credit Card',
}

const extraInputs: readonly ExtraInputDef[] = [
  { key: 'merchant', label: '商户', rows: 1 },
  { key: 'date', label: '日期', rows: 1 },
  { key: 'payment', label: '支付方式', rows: 1 },
]

const INITIAL_INPUT: ReceiptInput = { text: '', merchant: '', date: '', payment: '' }

/** 复制/下载用的纯文本：能组装成收据就用排版版，失败则退回原始输入 */
function receiptText(input: ReceiptInput): string {
  try {
    return toPlainText(buildReceiptData(input))
  } catch {
    return input.text
  }
}

export default function Tool() {
  const [pdf, setPdf] = useState<PdfResult | null>(null)
  const [error, setError] = useState('')
  const [working, setWorking] = useState(false)

  /** 生成 PDF 并触发浏览器下载：二进制走 Blob，不经过模板的文本下载通道 */
  async function exportPdf(input: ReceiptInput): Promise<void> {
    setWorking(true)
    setError('')
    try {
      const result = await buildPdf(input)
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

  function renderOutput(input: ReceiptInput) {
    return (
      <div className="flex flex-col gap-2">
        <div>
          <button
            type="button"
            data-testid="export-pdf"
            className={SECONDARY_BUTTON}
            disabled={working}
            onClick={() => void exportPdf(input)}
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
            明细每行格式为「品名,数量,单价」（英文逗号）；含中文会报错。
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
    <MultiPanel<ReceiptInput, Record<string, never>>
      meta={meta}
      initialInput={INITIAL_INPUT}
      initialOptions={{}}
      example={EXAMPLE}
      extraInputs={extraInputs}
      renderOutput={renderOutput}
      toText={receiptText}
      downloadExt="txt"
    />
  )
}
