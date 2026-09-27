import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { UNITS, transform } from './utils'
import type { DataStorageInput, DataStorageOptions } from './schema'

/** 示例：1 GiB */
const EXAMPLE: DataStorageInput = { text: '1' }

const UNIT_IDS = Object.keys(UNITS)

export default function Tool() {
  const optionDefs: readonly OptionDef<DataStorageOptions>[] = [
    { key: 'from', label: '从', kind: 'select', values: UNIT_IDS },
    { key: 'to', label: '到', kind: 'select', values: UNIT_IDS },
  ]

  return (
    <TwoColumn<DataStorageInput, DataStorageOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ from: 'GiB', to: 'MB' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
