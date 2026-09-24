import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { UnicodeLookupInput, UnicodeLookupOptions } from './schema'

const EXAMPLE: UnicodeLookupInput = { text: 'A工😀' }

export default function Tool() {
  return (
    <TwoColumn<UnicodeLookupInput, UnicodeLookupOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
    />
  )
}
