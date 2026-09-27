import { useMemo, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { useTranslate } from '../../i18n'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { buildText, createInvoiceData, formatMoney, todayISO } from './utils'
import type { InvoiceInput } from './schema'
import type { InvoiceData } from './utils'

/** 税率选项（%） */
const TAX_RATES: readonly string[] = ['0', '3', '6', '9', '13']
const DEFAULT_TAX_RATE = '6'

function initialInput(): InvoiceInput {
  return { buyer: '', seller: '', invoiceNo: '', date: todayISO(), itemsText: '', remark: '' }
}

/** 示例：两项明细 + 6% 税率 */
const EXAMPLE: InvoiceInput = {
  buyer: '示例科技有限公司',
  seller: '某某服务有限公司',
  invoiceNo: 'INV-20260927-001',
  date: todayISO(),
  itemsText: '咨询服务,2,500\n技术支持,1,1200',
  remark: '示例备注',
}

/** HTML 转义（下载的独立 HTML 文档用） */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 生成可独立打开的发票 HTML 文档（供「下载 HTML」用） */
function renderHtmlDocument(data: InvoiceData): string {
  const rows = data.items
    .map(
      (it, i) =>
        `<tr><td>${i + 1}</td><td>${escapeHtml(it.name)}</td><td>${it.qty}</td>` +
        `<td>${formatMoney(it.price)}</td><td>${formatMoney(it.qty * it.price)}</td></tr>`,
    )
    .join('')
  const head = (label: string, value: string) =>
    value.trim() === '' ? '' : `<p><strong>${label}：</strong>${escapeHtml(value.trim())}</p>`
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="utf-8"><title>发票${escapeHtml(data.invoiceNo.trim())}</title>
<style>body{font-family:sans-serif;max-width:720px;margin:40px auto;color:#111}
table{width:100%;border-collapse:collapse;margin:16px 0}
th,td{border:1px solid #999;padding:6px 10px;text-align:left}
th{background:#f0f0f0}.total{text-align:right;font-size:18px;margin-top:16px}</style>
</head>
<body>
<h1>发票</h1>
${head('发票号', data.invoiceNo)}${head('日期', data.date)}${head('购买方', data.buyer)}${head('销售方', data.seller)}
<table><thead><tr><th>序号</th><th>项目</th><th>数量</th><th>单价</th><th>金额</th></tr></thead>
<tbody>${rows}</tbody></table>
<p>共 ${data.totals.count} 项</p>
<p>小计：${formatMoney(data.totals.subtotal)}</p>
<p>税额（${data.taxRate}%）：${formatMoney(data.totals.tax)}</p>
<p class="total"><strong>总额：${formatMoney(data.totals.total)}</strong></p>
<p>备注：${escapeHtml(data.remark.trim() === '' ? '无' : data.remark.trim())}</p>
</body></html>`
}

/** 右列预览里的发票卡片（强制浅色，保证 PNG 导出效果一致） */
function InvoiceCard({ data }: { readonly data: InvoiceData }) {
  return (
    <div className="bg-white p-4 text-slate-900">
      <h2 className="mb-1 text-center text-xl font-bold">发票</h2>
      <div className="mb-3 flex justify-between text-xs text-slate-600">
        <span>发票号：{data.invoiceNo.trim() || '—'}</span>
        <span>日期：{data.date.trim() || '—'}</span>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-slate-500">购买方：</span>
          {data.buyer.trim() || '—'}
        </div>
        <div>
          <span className="text-slate-500">销售方：</span>
          {data.seller.trim() || '—'}
        </div>
      </div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-100">
            <th className="border border-slate-300 px-2 py-1 text-left">序号</th>
            <th className="border border-slate-300 px-2 py-1 text-left">项目</th>
            <th className="border border-slate-300 px-2 py-1 text-left">数量</th>
            <th className="border border-slate-300 px-2 py-1 text-left">单价</th>
            <th className="border border-slate-300 px-2 py-1 text-left">金额</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((it, i) => (
            <tr key={i}>
              <td className="border border-slate-300 px-2 py-1">{i + 1}</td>
              <td className="border border-slate-300 px-2 py-1">{it.name}</td>
              <td className="border border-slate-300 px-2 py-1">{it.qty}</td>
              <td className="border border-slate-300 px-2 py-1">{formatMoney(it.price)}</td>
              <td className="border border-slate-300 px-2 py-1">
                {formatMoney(it.qty * it.price)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 space-y-1 text-right text-sm">
        <div>
          共 {data.totals.count} 项，小计：{formatMoney(data.totals.subtotal)}
        </div>
        <div>
          税额（{data.taxRate}%）：{formatMoney(data.totals.tax)}
        </div>
        <div className="text-base font-bold">总额：{formatMoney(data.totals.total)}</div>
      </div>
      <div className="mt-2 text-sm text-slate-600">
        备注：{data.remark.trim() === '' ? '无' : data.remark.trim()}
      </div>
    </div>
  )
}

type View =
  | { readonly kind: 'idle' }
  | { readonly kind: 'error'; readonly message: string }
  | { readonly kind: 'ok'; readonly data: InvoiceData }

const FIELD_CLASS =
  'w-full rounded border border-slate-200 p-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100'
const LABEL_CLASS = 'mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400'

export default function Tool() {
  const t = useTranslate()
  const [input, setInput] = useState<InvoiceInput>(initialInput)
  const [taxRate, setTaxRate] = useState<string>(DEFAULT_TAX_RATE)
  const [copied, setCopied] = useState(false)
  const [pngError, setPngError] = useState('')
  const [nonce, setNonce] = useState(0)
  const previewRef = useRef<HTMLDivElement>(null)

  function update(patch: Partial<InvoiceInput>) {
    setInput((prev) => ({ ...prev, ...patch }))
    setPngError('')
  }

  function changeTaxRate(value: string) {
    setTaxRate(value)
    setPngError('')
  }

  // 每次渲染都重新解析明细 + 计算合计；点「运行」通过 nonce 强制重算一次
  const view: View = useMemo(() => {
    void nonce
    if (input.itemsText.trim() === '') return { kind: 'idle' }
    try {
      return { kind: 'ok', data: createInvoiceData(input, Number(taxRate)) }
    } catch (err) {
      return { kind: 'error', message: err instanceof Error ? err.message : String(err) }
    }
  }, [input, taxRate, nonce])

  function fileStem(): string {
    const raw =
      input.invoiceNo.trim() !== ''
        ? input.invoiceNo.trim()
        : input.date.trim() !== ''
          ? input.date.trim()
          : 'export'
    return `${meta.slug}-` + raw.replace(/[\\/:*?"<>|]/g, '-')
  }

  async function copy() {
    if (view.kind !== 'ok') return
    try {
      await navigator.clipboard.writeText(buildText(view.data))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(url)
  }

  function downloadHtml() {
    if (view.kind !== 'ok') return
    downloadBlob(
      new Blob([renderHtmlDocument(view.data)], { type: 'text/html;charset=utf-8' }),
      `${fileStem()}.html`,
    )
  }

  async function downloadPng() {
    const node = previewRef.current
    if (!node || view.kind !== 'ok') return
    try {
      const dataUrl = await toPng(node, { cacheBust: true })
      const anchor = document.createElement('a')
      anchor.href = dataUrl
      anchor.download = `${fileStem()}.png`
      anchor.click()
      setPngError('')
    } catch {
      // 不弹 alert：错误显示在输出区
      setPngError('导出 PNG 失败，请重试')
    }
  }

  const alertMessage = pngError !== '' ? pngError : view.kind === 'error' ? view.message : ''

  return (
    <section className="grid gap-4 md:grid-cols-2">
      {/* 左列：输入面板（data-testid="input" 满足工具 testid 约定） */}
      <div
        data-testid="input"
        className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
      >
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {t('tool.input')}
        </span>
        <div>
          <label htmlFor="invoice-buyer" className={LABEL_CLASS}>
            购买方
          </label>
          <input
            id="invoice-buyer"
            data-testid="input-buyer"
            className={FIELD_CLASS}
            value={input.buyer}
            onChange={(e) => update({ buyer: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="invoice-seller" className={LABEL_CLASS}>
            销售方
          </label>
          <input
            id="invoice-seller"
            data-testid="input-seller"
            className={FIELD_CLASS}
            value={input.seller}
            onChange={(e) => update({ seller: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="invoice-no" className={LABEL_CLASS}>
              发票号
            </label>
            <input
              id="invoice-no"
              data-testid="input-invoiceNo"
              className={FIELD_CLASS}
              value={input.invoiceNo}
              onChange={(e) => update({ invoiceNo: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="invoice-date" className={LABEL_CLASS}>
              日期
            </label>
            <input
              id="invoice-date"
              data-testid="input-date"
              type="date"
              className={FIELD_CLASS}
              value={input.date}
              onChange={(e) => update({ date: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label htmlFor="invoice-items" className={LABEL_CLASS}>
            项目明细
          </label>
          <textarea
            id="invoice-items"
            data-testid="input-items"
            rows={6}
            className={FIELD_CLASS + ' resize-y font-mono'}
            placeholder={'每行一项，格式：名称,数量,单价\n示例：咨询服务,2,500'}
            value={input.itemsText}
            onChange={(e) => update({ itemsText: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="invoice-tax" className={LABEL_CLASS}>
            税率%
          </label>
          <select
            id="invoice-tax"
            data-testid="option-taxRate"
            className={FIELD_CLASS}
            value={taxRate}
            onChange={(e) => changeTaxRate(e.target.value)}
          >
            {TAX_RATES.map((r) => (
              <option key={r} value={r}>
                {r}%
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="invoice-remark" className={LABEL_CLASS}>
            备注
          </label>
          <input
            id="invoice-remark"
            data-testid="input-remark"
            className={FIELD_CLASS}
            value={input.remark}
            onChange={(e) => update({ remark: e.target.value })}
          />
        </div>
        <div className="tool-actions flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="example"
            className={SECONDARY_BUTTON}
            onClick={() => {
              setInput({ ...EXAMPLE, date: todayISO() })
              setTaxRate(DEFAULT_TAX_RATE)
              setPngError('')
            }}
          >
            {t('tool.example')}
          </button>
          <button
            type="button"
            data-testid="clear"
            className={SECONDARY_BUTTON}
            onClick={() => {
              setInput(initialInput())
              setTaxRate(DEFAULT_TAX_RATE)
              setPngError('')
            }}
          >
            {t('tool.clear')}
          </button>
        </div>
      </div>

      {/* 右列：发票预览 */}
      <div className="flex flex-col rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <span className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          {t('tool.output')}
        </span>
        <div
          ref={previewRef}
          data-testid="output"
          role={alertMessage !== '' ? 'alert' : undefined}
          className="min-h-64 w-full flex-1 overflow-auto rounded border border-slate-200 bg-slate-50 p-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
        >
          {alertMessage !== '' ? (
            alertMessage
          ) : view.kind === 'idle' ? (
            <span className="text-slate-400">在左侧填写项目明细后，这里会实时预览发票。</span>
          ) : view.kind === 'ok' ? (
            <InvoiceCard data={view.data} />
          ) : null}
        </div>
        <div className="tool-actions mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="run"
            className="rounded bg-brand px-3 py-1.5 text-sm text-white hover:opacity-90"
            onClick={() => setNonce((n) => n + 1)}
          >
            {t('tool.run')}
          </button>
          <button type="button" data-testid="copy" className={SECONDARY_BUTTON} onClick={copy}>
            {copied ? t('tool.copied') : t('tool.copy')}
          </button>
          <button
            type="button"
            data-testid="download"
            className={SECONDARY_BUTTON}
            onClick={downloadHtml}
          >
            下载 HTML
          </button>
          <button
            type="button"
            data-testid="download-png"
            className={SECONDARY_BUTTON}
            onClick={downloadPng}
          >
            下载 PNG
          </button>
        </div>
      </div>
    </section>
  )
}
