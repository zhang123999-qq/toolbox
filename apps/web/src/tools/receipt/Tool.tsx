import { useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { buildReceiptData, exportFileName, formatMoney, localizeError, toPlainText } from './utils'
import type { ReceiptData } from './utils'
import type { ReceiptInput, ReceiptOptions } from './schema'

/** 示例：完整的收据 */
const EXAMPLE: ReceiptInput = {
  text: '2026 年 9 月房屋租金',
  payer: '张三',
  payee: '李四',
  amount: '3500',
  date: '2026-09-27',
  number: 'R-2026-0001',
}

/** html-to-image 导出倍率：2x 保证 PNG 清晰度 */
const EXPORT_PIXEL_RATIO = 2

/** 预览用内联样式（固定浅色纸面，保证导出 PNG 与预览一致） */
const PAPER_STYLE: CSSProperties = {
  backgroundColor: '#ffffff',
  color: '#1e293b',
  padding: '32px 36px',
  border: '2px dashed #94a3b8',
  fontFamily:
    '-apple-system, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif',
  lineHeight: 1.8,
  fontSize: '14px',
}
const DOC_TITLE_STYLE: CSSProperties = {
  fontSize: '24px',
  fontWeight: 700,
  textAlign: 'center',
  margin: '0 0 4px',
  letterSpacing: '8px',
}
const AMOUNT_STYLE: CSSProperties = {
  fontSize: '28px',
  fontWeight: 700,
  color: '#b45309',
  textAlign: 'center',
  margin: '12px 0',
  fontVariantNumeric: 'tabular-nums',
}
const ROW_STYLE: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  margin: '2px 0',
}
const LABEL_STYLE: CSSProperties = { color: '#64748b' }

export default function Tool() {
  const t = useTranslate()
  const previewRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')

  const methodValues = [
    t('receipt.method.cash'),
    t('receipt.method.transfer'),
    t('receipt.method.card'),
    t('receipt.method.other'),
  ]
  const optionDefs: readonly OptionDef<ReceiptOptions>[] = [
    { key: 'method', label: t('receipt.method'), kind: 'select', values: methodValues },
  ]

  /** 导出 PNG：html-to-image 只在点击时动态加载，不进主包 */
  async function exportPng(data: ReceiptData): Promise<void> {
    const node = previewRef.current
    if (!node) return
    setExporting(true)
    setExportError('')
    try {
      const { toPng } = await import('html-to-image')
      const dataUrl = await toPng(node, { pixelRatio: EXPORT_PIXEL_RATIO, cacheBust: true })
      const anchor = document.createElement('a')
      anchor.href = dataUrl
      anchor.download = exportFileName(data)
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
    } catch (error) {
      setExportError(
        t('export.failed', { reason: error instanceof Error ? error.message : String(error) }),
      )
    } finally {
      setExporting(false)
    }
  }

  function renderPreview(input: ReceiptInput, options: ReceiptOptions) {
    let data: ReceiptData | null
    try {
      data = buildReceiptData(input, options, t)
    } catch (error) {
      return (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          {localizeError(error, t)}
        </p>
      )
    }
    if (!data) return <p className="text-sm text-slate-500">{t('receipt.empty')}</p>
    return (
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-testid="export-png"
            disabled={exporting}
            className={SECONDARY_BUTTON}
            onClick={() => void exportPng(data)}
          >
            {exporting ? t('export.exporting') : t('export.png')}
          </button>
          {exportError === '' ? null : (
            <p
              role="alert"
              data-testid="export-error"
              className="text-sm text-red-700 dark:text-red-300"
            >
              {exportError}
            </p>
          )}
        </div>
        <div ref={previewRef} data-testid="receipt-preview" style={PAPER_STYLE}>
          <h2 style={DOC_TITLE_STYLE}>{meta.title}</h2>
          <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', margin: '0 0 8px' }}>
            {[data.number, data.date].filter((part) => part !== '').join(' · ')}
          </p>
          <div style={AMOUNT_STYLE}>{formatMoney(data.amount)}</div>
          {data.payer === '' ? null : (
            <div style={ROW_STYLE}>
              <span style={LABEL_STYLE}>{t('receipt.field.payer')}</span>
              <span>{data.payer}</span>
            </div>
          )}
          {data.payee === '' ? null : (
            <div style={ROW_STYLE}>
              <span style={LABEL_STYLE}>{t('receipt.field.payee')}</span>
              <span>{data.payee}</span>
            </div>
          )}
          <div style={ROW_STYLE}>
            <span style={LABEL_STYLE}>{t('receipt.method')}</span>
            <span>{data.method}</span>
          </div>
          {data.reason === '' ? null : (
            <p style={{ marginTop: '12px', whiteSpace: 'pre-line' }}>
              <span style={LABEL_STYLE}>{t('receipt.field.reason')}：</span>
              {data.reason}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <MultiPanel<ReceiptInput, ReceiptOptions>
      meta={meta}
      initialInput={{ text: '', payer: '', payee: '', amount: '', date: '', number: '' }}
      initialOptions={{ method: t('receipt.method.cash') }}
      optionDefs={optionDefs}
      example={EXAMPLE}
      extraInputs={[
        { key: 'payer', label: t('receipt.field.payer'), rows: 1 },
        { key: 'payee', label: t('receipt.field.payee'), rows: 1 },
        { key: 'amount', label: t('receipt.field.amount'), rows: 1 },
        { key: 'date', label: t('receipt.field.date'), rows: 1 },
        { key: 'number', label: t('receipt.field.number'), rows: 1 },
      ]}
      renderOutput={renderPreview}
      toText={(input, options) => toPlainText(input, options, t)}
      downloadExt="txt"
    />
  )
}
