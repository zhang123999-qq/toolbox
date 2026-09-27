import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { UNIT_IDS, transform } from './utils'
import type { SpeedInput, SpeedOptions } from './schema'

/** 示例：100 千米/时 → 米/秒 */
const EXAMPLE: SpeedInput = { text: '100' }

const OPTION_DEFS: readonly OptionDef<SpeedOptions>[] = [
  { key: 'from', label: '从', kind: 'select', values: UNIT_IDS },
  { key: 'to', label: '到', kind: 'select', values: UNIT_IDS },
]

export default function Tool() {
  return (
    <TwoColumn<SpeedInput, SpeedOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ from: 'km/h', to: 'm/s' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={OPTION_DEFS}
    />
  )
}
