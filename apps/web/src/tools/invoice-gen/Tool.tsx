import { useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { buildInvoiceData, exportFileName, formatMoney, localizeError, toPlainText } from './utils'
import type { InvoiceData } from './utils'
import type { InvoiceInput, InvoiceOptions } from './schema'

/** 示例：三项明细、税率 6% */
const EXAMPLE: InvoiceInput = {
  text: '网站设计服务,1,8000\n域名续费,2,100\n服务器托管（年）,1,2400',
  seller: '星辰科技有限公司',
  buyer: '蓝海互联有限公司',
  number: 'INV-2026-0001',
  date: '2026-09-27',
  taxRate: '6',
  notes: '请于 15 日内付款',
}

/** html-to-image 导出倍率：2x 保证 PNG 清晰度 */
const EXPORT_PIXEL_RATIO = 2

/** 预览用内联样式（固定浅色纸面，保证导出 PNG 与预览一致） */
const PAPER_STYLE: CSSProperties = {
  backgroundColor: '#ffffff',
  color: '#1e293b',
  padding: '32px 36px',
  fontFamily:
    '-apple-system, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif',
  lineHeight: 1.7,
  fontSize: '14px',
}
const DOC_TITLE_STYLE: CSSProperties = {
  fontSize: '24px',
  fontWeight: 700,
  textAlign: 'center',
  margin: '0 0 4px',
  letterSpacing: '8px',
}
const META_STYLE: CSSProperties = {
  fontSize: '13px',
  color: '#64748b',
  textAlign: 'center',
  margin: '0 0 16px',
}
const ROW_STYLE: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  margin: '2px 0',
}
const TABLE_HEAD_STYLE: CSSProperties = {
  display: 'flex',
  fontWeight: 700,
  borderTop: '2px solid #1e293b',
  borderBottom: '1px solid #94a3b8',
  padding: '6px 0',
}
const TABLE_ROW_STYLE: CSSProperties = {
  display: 'flex',
  borderBottom: '1px solid #e2e8f0',
  padding: '6px 0',
}
const CELL_NAME: CSSProperties = { flex: 3 }
const CELL_NUM: CSSProperties = { flex: 1, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }
const TOTAL_STYLE: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontWeight: 700,
  fontSize: '16px',
  marginTop: '8px',
}

export default function Tool() {
  const t = useTranslate()
  const previewRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')

  /** 导出 PNG：html-to-image 只在点击时动态加载，不进主包 */
  async function exportPng(data: InvoiceData): Promise<void> {
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

  function renderPreview(input: InvoiceInput) {
    let data: InvoiceData | null
    try {
      data = buildInvoiceData(input, t)
    } catch (error) {
      return (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          {localizeError(error, t)}
        </p>
      )
    }
    if (!data) return <p className="text-sm text-slate-500">{t('invoice.empty')}</p>
    return (
      <div>
        <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">{t('invoice.itemsHint')}</p>
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
        <div ref={previewRef} data-testid="invoice-preview" style={PAPER_STYLE}>
          <h2 style={DOC_TITLE_STYLE}>{meta.title}</h2>
          <p style={META_STYLE}>
            {[data.number, data.date].filter((part) => part !== '').join(' · ')}
          </p>
          {data.seller === '' ? null : (
            <div style={ROW_STYLE}>
              <span>{t('invoice.field.seller')}</span>
              <span>{data.seller}</span>
            </div>
          )}
          {data.buyer === '' ? null : (
            <div style={ROW_STYLE}>
              <span>{t('invoice.field.buyer')}</span>
              <span>{data.buyer}</span>
            </div>
          )}
          <div style={TABLE_HEAD_STYLE}>
            <span style={CELL_NAME}>{t('invoice.label.item')}</span>
            <span style={CELL_NUM}>{t('invoice.label.quantity')}</span>
            <span style={CELL_NUM}>{t('invoice.label.unitPrice')}</span>
            <span style={CELL_NUM}>{t('invoice.label.amount')}</span>
          </div>
          {data.items.map((item, index) => (
            <div key={index} style={TABLE_ROW_STYLE}>
              <span style={CELL_NAME}>{item.name}</span>
              <span style={CELL_NUM}>{item.quantity}</span>
              <span style={CELL_NUM}>{formatMoney(item.unitPrice)}</span>
              <span style={CELL_NUM}>{formatMoney(item.amount)}</span>
            </div>
          ))}
          <div style={ROW_STYLE}>
            <span>{t('invoice.label.subtotal')}</span>
            <span>{formatMoney(data.subtotal)}</span>
          </div>
          <div style={ROW_STYLE}>
            <span>
              {t('invoice.label.tax')}（{data.taxRate}%）
            </span>
            <span>{formatMoney(data.tax)}</span>
          </div>
          <div style={TOTAL_STYLE}>
            <span>{t('invoice.label.total')}</span>
            <span>{formatMoney(data.total)}</span>
          </div>
          {data.notes === '' ? null : (
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '12px' }}>
              {t('invoice.field.notes')}：{data.notes}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <MultiPanel<InvoiceInput, InvoiceOptions>
      meta={meta}
      initialInput={{
        text: '',
        seller: '',
        buyer: '',
        number: '',
        date: '',
        taxRate: '',
        notes: '',
      }}
      initialOptions={{}}
      example={EXAMPLE}
      extraInputs={[
        { key: 'seller', label: t('invoice.field.seller'), rows: 1 },
        { key: 'buyer', label: t('invoice.field.buyer'), rows: 1 },
        { key: 'number', label: t('invoice.field.number'), rows: 1 },
        { key: 'date', label: t('invoice.field.date'), rows: 1 },
        { key: 'taxRate', label: t('invoice.field.taxRate'), rows: 1 },
        { key: 'notes', label: t('invoice.field.notes'), rows: 2 },
      ]}
      renderOutput={renderPreview}
      toText={(input) => toPlainText(input, t)}
      downloadExt="txt"
    />
  )
}
