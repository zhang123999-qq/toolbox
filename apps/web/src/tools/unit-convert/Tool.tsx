import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { UNIT_IDS, transform } from './utils'
import type { UnitConvertInput, UnitConvertOptions } from './schema'

/** 示例：100 千米/时 */
const EXAMPLE: UnitConvertInput = { text: '100' }

export default function Tool() {
  const optionDefs: readonly OptionDef<UnitConvertOptions>[] = [
    { key: 'from', label: '从', kind: 'select', values: UNIT_IDS },
    { key: 'to', label: '到', kind: 'select', values: UNIT_IDS },
  ]

  return (
    <TwoColumn<UnitConvertInput, UnitConvertOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ from: 'km/h', to: 'm/s' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
