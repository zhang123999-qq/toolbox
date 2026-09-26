import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { RegexCrossInput, RegexCrossOptions } from './schema'

const EXAMPLE: RegexCrossInput = { text: '/#([A-Z])(\\d+)/g' }

export default function Tool() {
  const t = useTranslate()
  const optionDefs: readonly OptionDef<RegexCrossOptions>[] = [
    { key: 'target', label: t('option.language'), kind: 'select', values: ['python', 'java'] },
  ]

  return (
    <TwoColumn<RegexCrossInput, RegexCrossOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ target: 'python' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
