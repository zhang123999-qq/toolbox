import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { CharsetLookupInput, CharsetLookupOptions } from './schema'

const EXAMPLE: CharsetLookupInput = { text: '中-A‰😀' }

export default function Tool() {
  return (
    <TwoColumn<CharsetLookupInput, CharsetLookupOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
    />
  )
}
