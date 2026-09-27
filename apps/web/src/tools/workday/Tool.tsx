import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { WorkdayInput, WorkdayOptions } from './schema'

const EXAMPLE: WorkdayInput = { text: '2025-01-27\n3' }

export default function Tool() {
  const t = useTranslate()
  const optionDefs: readonly OptionDef<WorkdayOptions>[] = [
    { key: 'direction', label: t('option.direction'), kind: 'select', values: ['add', 'subtract'] },
  ]

  return (
    <TwoColumn<WorkdayInput, WorkdayOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ direction: 'add' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
