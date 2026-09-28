import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { IncomeTaxInput, IncomeTaxOptions } from './schema'

/** 示例：月应纳税所得额 10000（已扣除 5000 起征点及专项扣除） */
const EXAMPLE: IncomeTaxInput = { text: '10000' }

export default function Tool() {
  return (
    <TwoColumn<IncomeTaxInput, IncomeTaxOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
    />
  )
}
