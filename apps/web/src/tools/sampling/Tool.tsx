import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { computeSample, transform } from './utils'
import type { SamplingInput, SamplingOptions } from './schema'

/** 示例：5 个水果中无放回抽 3 个，种子 42（结果可复现） */
const EXAMPLE: SamplingInput = {
  text: '苹果\n香蕉\n橙子\n葡萄\n西瓜',
  sampleSize: '3',
  seed: '42',
}

/** 结果行：标签 + 值 */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-slate-100 py-1.5 last:border-0 dark:border-slate-800">
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span className="font-mono text-sm tabular-nums text-slate-900 dark:text-slate-100">
        {value}
      </span>
    </div>
  )
}

export default function Tool() {
  const t = useTranslate()

  const optionDefs: readonly OptionDef<SamplingOptions>[] = [
    { key: 'replace', label: t('sampling.option.replace'), kind: 'boolean' },
  ]

  function renderResult(input: SamplingInput, options: SamplingOptions) {
    try {
      const result = computeSample(input, options)
      if (!result) return <p className="text-sm text-slate-500">{t('tool.empty')}</p>
      return (
        <div>
          <Row
            label={t('sampling.mode')}
            value={
              result.withReplacement
                ? t('sampling.mode.withReplacement')
                : t('sampling.mode.withoutReplacement')
            }
          />
          <Row label={t('sampling.population')} value={String(result.populationSize)} />
          <Row label={t('sampling.size')} value={String(result.size)} />
          <Row
            label={t('sampling.seed')}
            value={result.seedText === '' ? t('sampling.seed.random') : result.seedText}
          />
          <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            {t('sampling.result')}
          </p>
          <ol className="mt-1 list-decimal space-y-0.5 pl-5 font-mono text-sm text-slate-900 dark:text-slate-100">
            {result.items.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ol>
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
    <MultiPanel<SamplingInput, SamplingOptions>
      meta={meta}
      initialInput={{ text: '', sampleSize: '', seed: '' }}
      initialOptions={{ replace: false }}
      example={EXAMPLE}
      optionDefs={optionDefs}
      extraInputs={[
        { key: 'sampleSize', label: t('sampling.extra.sampleSize'), rows: 1 },
        { key: 'seed', label: t('sampling.extra.seed'), rows: 1 },
      ]}
      renderOutput={renderResult}
      toText={(input, options) => transform(input, options, t)}
      downloadExt="txt"
    />
  )
}
