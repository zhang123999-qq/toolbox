import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { UNITS, transform } from './utils'
import type { WeightInput, WeightOptions } from './schema'

/** 示例：1 磅 */
const EXAMPLE: WeightInput = { text: '1' }

const UNIT_IDS = Object.keys(UNITS)

export default function Tool() {
  const optionDefs: readonly OptionDef<WeightOptions>[] = [
    { key: 'from', label: '从', kind: 'select', values: UNIT_IDS },
    { key: 'to', label: '到', kind: 'select', values: UNIT_IDS },
  ]

  return (
    <TwoColumn<WeightInput, WeightOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ from: 'lb', to: 'kg' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
