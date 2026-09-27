import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { computeLoan, formatMoney, transform } from './utils'
import type { LoanInput, LoanOptions } from './schema'

/** 示例：100 万 / 年利率 4.9% / 20 年，等额本息 */
const EXAMPLE: LoanInput = { text: '1000000', annualRate: '4.9', years: '20' }

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

  const optionDefs: readonly OptionDef<LoanOptions>[] = [
    {
      key: 'repayMethod',
      label: t('option.repayMethod'),
      kind: 'select',
      values: ['等额本息', '等额本金'],
    },
  ]

  function renderResult(input: LoanInput, options: LoanOptions) {
    try {
      const result = computeLoan(input, options)
      if (!result) return <p className="text-sm text-slate-500">{t('tool.empty')}</p>
      const money = (v: Parameters<typeof formatMoney>[0]) => formatMoney(v) + ' 元'
      return (
        <div>
          <Row label="还款方式" value={result.method} />
          <Row label="贷款本金" value={money(result.principal)} />
          <Row
            label="年利率 / 年限"
            value={`${result.annualRate.toString()}% / ${result.years.toString()} 年（${result.periods} 期）`}
          />
          {result.method === '等额本息' ? (
            <Row label="每月月供" value={money(result.monthlyPayment)} highlight />
          ) : (
            <>
              <Row label="首月月供" value={money(result.firstPayment!)} highlight />
              <Row label="末月月供" value={money(result.lastPayment!)} />
              <Row label="每月递减" value={money(result.monthlyDecrease!)} />
            </>
          )}
          <Row label="总利息" value={money(result.totalInterest)} />
          <Row label="总还款" value={money(result.totalPayment)} highlight />
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
    <MultiPanel<LoanInput, LoanOptions>
      meta={meta}
      initialInput={{ text: '', annualRate: '', years: '' }}
      initialOptions={{ repayMethod: '等额本息' }}
      example={EXAMPLE}
      optionDefs={optionDefs}
      extraInputs={[
        { key: 'annualRate', label: t('extra.annualRate'), rows: 1 },
        { key: 'years', label: t('extra.years'), rows: 1 },
      ]}
      renderOutput={renderResult}
      toText={transform}
      downloadExt="txt"
    />
  )
}
