import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { WeekNumberInput, WeekNumberOptions } from './schema'

/** 示例：2026-09-27 */
const EXAMPLE: WeekNumberInput = { text: '2026-09-27' }

export default function Tool() {
  return (
    <TwoColumn<WeekNumberInput, WeekNumberOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
    />
  )
}
