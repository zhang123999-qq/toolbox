import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { BadgeInput, BadgeOptions } from './schema'

const EXAMPLE: BadgeInput = { text: 'generate' }

export default function Tool() {
  const optionDefs: readonly OptionDef<BadgeOptions>[] = [
    { key: 'label', label: '标签', kind: 'text', placeholder: 'version' },
    { key: 'message', label: '信息', kind: 'text', placeholder: '1.2.0' },
    { key: 'color', label: '颜色', kind: 'text', placeholder: 'brightgreen' },
  ]

  return (
    <TwoColumn<BadgeInput, BadgeOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ label: 'version', message: '1.2.0', color: 'brightgreen' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
