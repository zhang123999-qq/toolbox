import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { UNITS, transform } from './utils'
import type { TimeUnitInput, TimeUnitOptions } from './schema'

/** 示例：1 小时 */
const EXAMPLE: TimeUnitInput = { text: '1' }

const UNIT_IDS = Object.keys(UNITS)

export default function Tool() {
  const optionDefs: readonly OptionDef<TimeUnitOptions>[] = [
    { key: 'from', label: '从', kind: 'select', values: UNIT_IDS },
    { key: 'to', label: '到', kind: 'select', values: UNIT_IDS },
  ]

  return (
    <TwoColumn<TimeUnitInput, TimeUnitOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ from: 'h', to: 'min' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
