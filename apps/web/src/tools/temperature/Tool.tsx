import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { UNIT_IDS, transform } from './utils'
import type { TemperatureInput, TemperatureOptions } from './schema'

/** 示例：100 摄氏度 → 华氏度 */
const EXAMPLE: TemperatureInput = { text: '100' }

const OPTION_DEFS: readonly OptionDef<TemperatureOptions>[] = [
  { key: 'from', label: '从', kind: 'select', values: UNIT_IDS },
  { key: 'to', label: '到', kind: 'select', values: UNIT_IDS },
]

export default function Tool() {
  return (
    <TwoColumn<TemperatureInput, TemperatureOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ from: 'C', to: 'F' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={OPTION_DEFS}
    />
  )
}
