import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { UNIT_IDS, transform } from './utils'
import type { VolumeInput, VolumeOptions } from './schema'

/** 示例：1 美制加仑 → 升 */
const EXAMPLE: VolumeInput = { text: '1' }

const OPTION_DEFS: readonly OptionDef<VolumeOptions>[] = [
  { key: 'from', label: '从', kind: 'select', values: UNIT_IDS },
  { key: 'to', label: '到', kind: 'select', values: UNIT_IDS },
]

export default function Tool() {
  return (
    <TwoColumn<VolumeInput, VolumeOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ from: 'gal', to: 'l' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={OPTION_DEFS}
    />
  )
}
