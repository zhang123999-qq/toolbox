import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import {
  computeOvulation,
  daysToOvulationText,
  formatYmd,
  localizeError,
  phaseLabelKey,
  transform,
} from './utils'
import type { OvulationInput, OvulationOptions } from './schema'

/** 示例：末次月经 2026-09-01，28 天周期，参考日期固定便于断言 */
const EXAMPLE: OvulationInput = { text: '2026-09-01', cycleLength: '28', textB: '2026-09-27' }

/** 结果行：标签 + 等宽数字（与 loan 工具同一样式） */
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

  function renderResult(input: OvulationInput, options: OvulationOptions) {
    try {
      const result = computeOvulation(input, options)
      if (!result) return <p className="text-sm text-slate-500">{t('tool.empty')}</p>
      return (
        <div>
          <Row
            label={t('ovulation.label.ovulationDate')}
            value={formatYmd(result.ovulationDate)}
            highlight
          />
          <Row
            label={t('ovulation.label.fertileWindow')}
            value={t('ovulation.text.fertileRange', {
              start: formatYmd(result.fertileStart),
              end: formatYmd(result.fertileEnd),
            })}
            highlight={result.phase === 'fertile'}
          />
          <Row label={t('ovulation.label.nextPeriod')} value={formatYmd(result.nextPeriodDate)} />
          <Row
            label={t('ovulation.label.phase')}
            value={`${t(phaseLabelKey(result.phase))}（${t('ovulation.text.cycleDay', { day: result.cycleDay })}）`}
          />
          <Row
            label={t('ovulation.label.daysToOvulation')}
            value={daysToOvulationText(result.daysToOvulation, t)}
          />
          <Row label={t('ovulation.label.lmp')} value={formatYmd(result.lmp)} />
          {result.abnormalCycle ? (
            <p role="alert" className="mt-2 text-xs text-amber-700 dark:text-amber-300">
              {t('ovulation.warn.abnormalCycle', { cycle: result.cycleDays })}
            </p>
          ) : null}
        </div>
      )
    } catch (error) {
      return (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          {localizeError(error, t)}
        </p>
      )
    }
  }

  return (
    <MultiPanel<OvulationInput, OvulationOptions>
      meta={meta}
      initialInput={{ text: '', cycleLength: '28', textB: '' }}
      initialOptions={{}}
      example={EXAMPLE}
      extraInputs={[
        { key: 'cycleLength', label: t('extra.cycleLength'), rows: 1 },
        { key: 'textB', label: t('extra.refDate'), rows: 1 },
      ]}
      renderOutput={renderResult}
      toText={(input, options) => transform(input, options, t)}
      downloadExt="txt"
    />
  )
}
