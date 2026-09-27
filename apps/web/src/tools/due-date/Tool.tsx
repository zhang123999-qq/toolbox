import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { computeDueDate, formatYmd, localizeError, transform } from './utils'
import type { DueDateInput, DueDateOptions } from './schema'

/** 示例：末次月经 2026-06-01，28 天周期，参考日期固定便于断言 */
const EXAMPLE: DueDateInput = { text: '2026-06-01', cycleLength: '28', textB: '2026-09-27' }

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

const TRIMESTER_KEYS = {
  1: 'dueDate.trimester.first',
  2: 'dueDate.trimester.second',
  3: 'dueDate.trimester.third',
} as const

export default function Tool() {
  const t = useTranslate()

  function renderResult(input: DueDateInput, options: DueDateOptions) {
    try {
      const result = computeDueDate(input, options)
      if (!result) return <p className="text-sm text-slate-500">{t('tool.empty')}</p>
      return (
        <div>
          <Row label={t('dueDate.label.edd')} value={formatYmd(result.edd)} highlight />
          <Row
            label={t('dueDate.label.gestationalAge')}
            value={t('dueDate.text.gestationalAge', { weeks: result.weeks, days: result.days })}
          />
          <Row
            label={t('dueDate.label.daysLeft')}
            value={
              result.overdue
                ? t('dueDate.text.overdue', { days: -result.daysLeft })
                : t('dueDate.text.daysLeft', { days: result.daysLeft })
            }
            highlight={result.overdue}
          />
          <Row label={t('dueDate.label.trimester')} value={t(TRIMESTER_KEYS[result.trimester])} />
          <Row label={t('dueDate.label.lmp')} value={formatYmd(result.lmp)} />
          <Row
            label={t('dueDate.label.cycleLength')}
            value={t('dueDate.unit.days', { days: result.cycleDays })}
          />
          {result.adjustmentDays !== 0 ? (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {t('dueDate.text.cycleAdjusted', {
                cycle: result.cycleDays,
                adjustment: result.adjustmentDays,
              })}
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
    <MultiPanel<DueDateInput, DueDateOptions>
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
