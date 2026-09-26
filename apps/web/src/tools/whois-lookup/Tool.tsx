import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { WhoisLookupInput, WhoisLookupOptions } from './schema'

const EXAMPLE: WhoisLookupInput = { text: 'example.com' }

export default function Tool() {
  return (
    <TwoColumn<WhoisLookupInput, WhoisLookupOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      runAsync={transform}
      idleText="输入域名后点「运行」：先做本地解析，再尽力尝试 RDAP 查询"
      example={EXAMPLE}
    />
  )
}
