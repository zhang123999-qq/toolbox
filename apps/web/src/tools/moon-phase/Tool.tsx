import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { MoonPhaseInput, MoonPhaseOptions } from './schema'

/** 示例：2025-10-06 前后的满月 */
const EXAMPLE: MoonPhaseInput = { text: '2025-10-06' }

export default function Tool() {
  const optionDefs: readonly OptionDef<MoonPhaseOptions>[] = []

  return (
    <TwoColumn<MoonPhaseInput, MoonPhaseOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
