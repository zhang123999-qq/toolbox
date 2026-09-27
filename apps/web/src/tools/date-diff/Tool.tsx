import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { DateDiffInput, DateDiffOptions } from './schema'

/** 示例：2024-01-01 → 2025-03-15 */
const EXAMPLE: DateDiffInput = { text: '2024-01-01', textB: '2025-03-15' }

export default function Tool() {
  return (
    <TwoColumn<DateDiffInput, DateDiffOptions>
      meta={meta}
      initialInput={{ text: '', textB: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
      extraInputs={[{ key: 'textB', label: '日期 B' }]}
    />
  )
}
