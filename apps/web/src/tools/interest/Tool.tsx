import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { computeInterest, formatMoney, transform } from './utils'
import type { InterestInput, InterestOptions } from './schema'

/** 示例：本金 10000 / 年利率 5% / 3 年，复利 */
const EXAMPLE: InterestInput = { text: '10000', annualRate: '5', termYears: '3' }

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

  const optionDefs: readonly OptionDef<InterestOptions>[] = [
    {
      key: 'interestType',
      label: t('option.interestType'),
      kind: 'select',
      values: ['单利', '复利'],
    },
  ]

  function renderResult(input: InterestInput, options: InterestOptions) {
    try {
      const result = computeInterest(input, options)
      if (!result) return <p className="text-sm text-slate-500">{t('tool.empty')}</p>
      const money = (v: Parameters<typeof formatMoney>[0]) => formatMoney(v) + ' 元'
      return (
        <div>
          <Row
            label="计息方式"
            value={result.type + (result.type === '复利' ? '（年复利）' : '')}
          />
          <Row label="本金" value={money(result.principal)} />
          <Row
            label="年利率 / 期限"
            value={`${result.annualRate.toString()}% / ${result.years.toString()} 年`}
          />
          <Row label="利息" value={money(result.interest)} highlight />
          <Row label="本息和" value={money(result.maturity)} />
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
    <MultiPanel<InterestInput, InterestOptions>
      meta={meta}
      initialInput={{ text: '', annualRate: '', termYears: '' }}
      initialOptions={{ interestType: '复利' }}
      example={EXAMPLE}
      optionDefs={optionDefs}
      extraInputs={[
        { key: 'annualRate', label: t('extra.annualRate'), rows: 1 },
        { key: 'termYears', label: t('extra.termYears'), rows: 1 },
      ]}
      renderOutput={renderResult}
      toText={transform}
      downloadExt="txt"
    />
  )
}
