import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { PrecisionInput, PrecisionOptions } from './schema'

/** 示例：经典浮点陷阱 0.1 + 0.2 */
const EXAMPLE: PrecisionInput = { text: '0.1', textB: '0.2' }

export default function Tool() {
  const t = useTranslate()

  const optionDefs: readonly OptionDef<PrecisionOptions>[] = [
    {
      key: 'operator',
      label: t('precision.option.operator'),
      kind: 'select',
      values: ['+', '-', '×', '÷'],
    },
  ]

  return (
    <TwoColumn<PrecisionInput, PrecisionOptions>
      meta={meta}
      initialInput={{ text: '', textB: '' }}
      initialOptions={{ operator: '+' }}
      run={(input, options) => transform(input, options, t)}
      example={EXAMPLE}
      optionDefs={optionDefs}
      extraInputs={[{ key: 'textB', label: t('precision.extra.secondNumber'), rows: 1 }]}
    />
  )
}
