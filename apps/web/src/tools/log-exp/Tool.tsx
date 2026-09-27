import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { LogExpInput, LogExpOptions } from './schema'

/** 示例：lg(100) = 2 */
const EXAMPLE: LogExpInput = { text: '100', textB: '' }

export default function Tool() {
  const t = useTranslate()
  const optionDefs: readonly OptionDef<LogExpOptions>[] = [
    {
      key: 'function',
      label: t('option.function'),
      kind: 'select',
      values: ['log10', 'ln', 'log2', 'logbase', 'exp', 'pow10', 'pow2'],
    },
  ]

  return (
    <TwoColumn<LogExpInput, LogExpOptions>
      meta={meta}
      initialInput={{ text: '', textB: '' }}
      initialOptions={{ function: 'log10' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
      extraInputs={[{ key: 'textB', label: t('extra.base') }]}
    />
  )
}
