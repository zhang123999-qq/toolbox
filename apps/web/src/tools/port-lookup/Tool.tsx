import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { PortLookupInput, PortLookupOptions } from './schema'

/** 示例：Redis 默认端口 */
const EXAMPLE: PortLookupInput = { text: '6379' }

export default function Tool() {
  return (
    <TwoColumn<PortLookupInput, PortLookupOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
    />
  )
}
