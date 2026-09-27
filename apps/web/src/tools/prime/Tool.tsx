import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { PrimeInput, PrimeOptions } from './schema'

/** 示例：一个大质数 */
const EXAMPLE: PrimeInput = { text: '9999999967' }

export default function Tool() {
  return (
    <TwoColumn<PrimeInput, PrimeOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
    />
  )
}
