import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { DueDateInput, DueDateOptions } from './schema'

/** 示例：末次月经 2026-01-01 → 预产期 2026-10-08 */
const EXAMPLE: DueDateInput = { text: '2026-01-01' }

export default function Tool() {
  return (
    <TwoColumn<DueDateInput, DueDateOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
    />
  )
}
