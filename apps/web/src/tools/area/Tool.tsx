import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { UNITS, transform } from './utils'
import type { AreaInput, AreaOptions } from './schema'

/** 示例：1 亩 */
const EXAMPLE: AreaInput = { text: '1' }

const UNIT_IDS = Object.keys(UNITS)

export default function Tool() {
  const optionDefs: readonly OptionDef<AreaOptions>[] = [
    { key: 'from', label: '从', kind: 'select', values: UNIT_IDS },
    { key: 'to', label: '到', kind: 'select', values: UNIT_IDS },
  ]

  return (
    <TwoColumn<AreaInput, AreaOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ from: '亩', to: 'm²' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
