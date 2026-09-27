import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { FactorizationInput, FactorizationOptions } from './schema'

/** 示例：360 = 2³ × 3² × 5 */
const EXAMPLE: FactorizationInput = { text: '360' }

export default function Tool() {
  return (
    <TwoColumn<FactorizationInput, FactorizationOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
    />
  )
}
