import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { UNITS, transform } from './utils'
import type { LengthInput, LengthOptions } from './schema'

/** 示例：1 英里 */
const EXAMPLE: LengthInput = { text: '1' }

const UNIT_IDS = Object.keys(UNITS)

export default function Tool() {
  const optionDefs: readonly OptionDef<LengthOptions>[] = [
    { key: 'from', label: '从', kind: 'select', values: UNIT_IDS },
    { key: 'to', label: '到', kind: 'select', values: UNIT_IDS },
  ]

  return (
    <TwoColumn<LengthInput, LengthOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ from: 'mi', to: 'km' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
