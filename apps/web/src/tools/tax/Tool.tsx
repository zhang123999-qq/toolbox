import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { computeTax, formatMoney, transform } from './utils'
import type { TaxInput, TaxOptions } from './schema'

/** 示例：含税价 113 / 税率 13% → 不含税 */
const EXAMPLE: TaxInput = { text: '113', taxRate: '13' }

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

  const optionDefs: readonly OptionDef<TaxOptions>[] = [
    {
      key: 'taxDirection',
      label: t('option.taxDirection'),
      kind: 'select',
      values: ['含税价 → 不含税', '不含税价 → 含税'],
    },
  ]

  function renderResult(input: TaxInput, options: TaxOptions) {
    try {
      const result = computeTax(input, options)
      if (!result) return <p className="text-sm text-slate-500">{t('tool.empty')}</p>
      const money = (v: Parameters<typeof formatMoney>[0]) => formatMoney(v) + ' 元'
      return (
        <div>
          <Row label="换算方向" value={result.direction} />
          <Row label="税率" value={result.rate.toString() + '%'} />
          <Row label="不含税价" value={money(result.exclusive)} highlight />
          <Row label="税额" value={money(result.tax)} />
          <Row label="含税价" value={money(result.inclusive)} highlight />
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
    <MultiPanel<TaxInput, TaxOptions>
      meta={meta}
      initialInput={{ text: '', taxRate: '' }}
      initialOptions={{ taxDirection: '含税价 → 不含税' }}
      example={EXAMPLE}
      optionDefs={optionDefs}
      extraInputs={[{ key: 'taxRate', label: t('extra.taxRate'), rows: 1 }]}
      renderOutput={renderResult}
      toText={transform}
      downloadExt="txt"
    />
  )
}
