import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { DecimalInput, DecimalOptions } from './schema'

/** 示例：0.1 + 0.2（经典浮点陷阱） */
const EXAMPLE: DecimalInput = { text: '0.1 + 0.2' }

export default function Tool() {
  return (
    <TwoColumn<DecimalInput, DecimalOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
    />
  )
}
