import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { RegexCheatsheetInput, RegexCheatsheetOptions } from './schema'

/** 输入框仅作触发用 */
const EXAMPLE: RegexCheatsheetInput = { text: 'show' }

export default function Tool() {
  const t = useTranslate()
  const optionDefs: readonly OptionDef<RegexCheatsheetOptions>[] = [
    {
      key: 'category',
      label: t('option.category'),
      kind: 'select',
      values: ['all', 'web', 'identity', 'number', 'date', 'text'],
    },
  ]

  return (
    <TwoColumn<RegexCheatsheetInput, RegexCheatsheetOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ category: 'all' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
