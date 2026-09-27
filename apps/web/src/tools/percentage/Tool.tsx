import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { PercentageInput, PercentageOptions } from './schema'

/** 示例：50 是 200 的百分之几 */
const EXAMPLE: PercentageInput = { text: '50', textB: '200' }

function safeText(input: PercentageInput, options: PercentageOptions): string {
  try {
    return transform(input, options)
  } catch {
    return ''
  }
}

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<PercentageOptions>[] = [
    { key: 'mode', label: t('option.mode'), kind: 'select', values: ['of', 'value', 'change'] },
  ]

  return (
    <MultiPanel<PercentageInput, PercentageOptions>
      meta={meta}
      initialInput={{ text: '', textB: '' }}
      initialOptions={{ mode: 'of' }}
      example={EXAMPLE}
      optionDefs={optionDefs}
      extraInputs={[{ key: 'textB', label: t('percentage.input.b'), rows: 1 }]}
      renderOutput={(input, options) => {
        try {
          const value = transform(input, options)
          if (value === '') {
            return <p className="text-sm text-slate-500 dark:text-slate-400">{t('tool.empty')}</p>
          }
          return <pre className="font-mono text-sm whitespace-pre-wrap">{value}</pre>
        } catch (error) {
          return (
            <p
              data-testid="output-error"
              role="alert"
              className="text-sm text-red-700 dark:text-red-300"
            >
              {error instanceof Error ? error.message : String(error)}
            </p>
          )
        }
      }}
      toText={safeText}
      downloadExt="txt"
    />
  )
}
