import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { LunarInput, LunarOptions } from './schema'

const EXAMPLE: LunarInput = { text: '2025-01-29' }

export default function Tool() {
  const t = useTranslate()
  const optionDefs: readonly OptionDef<LunarOptions>[] = [
    {
      key: 'direction',
      label: t('option.direction'),
      kind: 'select',
      values: ['solar2lunar', 'lunar2solar'],
    },
  ]

  return (
    <TwoColumn<LunarInput, LunarOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ direction: 'solar2lunar' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
