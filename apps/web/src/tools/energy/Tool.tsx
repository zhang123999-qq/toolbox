import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { UNITS, transform } from './utils'
import type { EnergyInput, EnergyOptions } from './schema'

/** 示例：1 千瓦时 */
const EXAMPLE: EnergyInput = { text: '1' }

const UNIT_IDS = Object.keys(UNITS)

export default function Tool() {
  const optionDefs: readonly OptionDef<EnergyOptions>[] = [
    { key: 'from', label: '从', kind: 'select', values: UNIT_IDS },
    { key: 'to', label: '到', kind: 'select', values: UNIT_IDS },
  ]

  return (
    <TwoColumn<EnergyInput, EnergyOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ from: 'kWh', to: 'MJ' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
