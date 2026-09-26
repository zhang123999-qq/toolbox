import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { IpLookupInput, IpLookupOptions } from './schema'

const EXAMPLE: IpLookupInput = { text: '192.168.1.1' }

export default function Tool() {
  return (
    <TwoColumn<IpLookupInput, IpLookupOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
    />
  )
}
