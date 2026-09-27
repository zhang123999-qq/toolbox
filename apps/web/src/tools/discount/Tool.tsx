import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { computeDiscount, formatMoney, transform } from './utils'
import { Decimal } from 'decimal.js'
import type { DiscountInput, DiscountOptions } from './schema'

/** 示例：原价 100 / 折扣 20% / 数量 2 */
const EXAMPLE: DiscountInput = { text: '100', discountRate: '20', quantity: '2' }

/** 结果行：标签 + 等宽数字 */
function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-slate-100 py-1.5 last:border-0 dark:border-slate-800">
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span
        className={
          'font-mono text-sm tabular-nums ' +
          (highlight ? 'font-semibold text-brand' : 'text-slate-900 dark:text-slate-100')
        }
      >
        {value}
      </span>
    </div>
  )
}

export default function Tool() {
  const t = useTranslate()

  function renderResult(input: DiscountInput, options: DiscountOptions) {
    try {
      const result = computeDiscount(input, options)
      if (!result) return <p className="text-sm text-slate-500">{t('tool.empty')}</p>
      const money = (v: Parameters<typeof formatMoney>[0]) => formatMoney(v) + ' 元'
      return (
        <div>
          <Row label="原价" value={money(result.price)} />
          <Row
            label="折扣"
            value={`${result.rate.toString()}%（${new Decimal(10).minus(result.rate.div(10)).toString()} 折）`}
          />
          <Row label="数量" value={result.quantity.toString()} />
          <Row label="折后单价" value={money(result.unitDiscounted)} highlight />
          <Row label="单件节省" value={money(result.unitSaving)} />
          <Row label="实付总额" value={money(result.totalPayable)} highlight />
          <Row label="总共节省" value={money(result.totalSaving)} />
        </div>
      )
    } catch (error) {
      return (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          {error instanceof Error ? error.message : String(error)}
        </p>
      )
    }
  }

  return (
    <MultiPanel<DiscountInput, DiscountOptions>
      meta={meta}
      initialInput={{ text: '', discountRate: '', quantity: '' }}
      initialOptions={{}}
      example={EXAMPLE}
      extraInputs={[
        { key: 'discountRate', label: t('extra.discountRate'), rows: 1 },
        { key: 'quantity', label: t('extra.quantity'), rows: 1 },
      ]}
      renderOutput={renderResult}
      toText={transform}
      downloadExt="txt"
    />
  )
}
