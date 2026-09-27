import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { computeCompound, formatMoney, transform } from './utils'
import type { CompoundInterestInput, CompoundInterestOptions } from './schema'

/** 示例：本金 10000 / 年利率 5% / 10 年，每年复利 */
const EXAMPLE: CompoundInterestInput = { text: '10000', annualRate: '5', years: '10' }

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

  const optionDefs: readonly OptionDef<CompoundInterestOptions>[] = [
    {
      key: 'compoundFreq',
      label: t('option.compoundFreq'),
      kind: 'select',
      values: ['每年', '每半年', '每季度', '每月', '每天'],
    },
  ]

  function renderResult(input: CompoundInterestInput, options: CompoundInterestOptions) {
    try {
      const result = computeCompound(input, options)
      if (!result) return <p className="text-sm text-slate-500">{t('tool.empty')}</p>
      const money = (v: Parameters<typeof formatMoney>[0]) => formatMoney(v) + ' 元'
      return (
        <div>
          <Row label="复利频率" value={`${result.frequency}（${result.timesPerYear} 次/年）`} />
          <Row label="本金" value={money(result.principal)} />
          <Row
            label="年利率 / 年限"
            value={`${result.annualRate.toString()}% / ${result.years.toString()} 年`}
          />
          <Row label="本息和" value={money(result.futureValue)} highlight />
          <Row label="总利息" value={money(result.totalInterest)} />
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
    <MultiPanel<CompoundInterestInput, CompoundInterestOptions>
      meta={meta}
      initialInput={{ text: '', annualRate: '', years: '' }}
      initialOptions={{ compoundFreq: '每年' }}
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
