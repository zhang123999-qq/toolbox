import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { JsonInput, JsonOptions } from './schema'

const optionDefs: readonly OptionDef<JsonOptions>[] = [
  { key: 'indent', label: '缩进', kind: 'select', values: [2, 4] },
  { key: 'sortKeys', label: '排序键名', kind: 'boolean' },
]

const EXAMPLE: JsonInput = { text: '{"name":"工具库","tools":870,"local":true}' }

export default function Tool() {
  return (
    <TwoColumn<JsonInput, JsonOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ indent: '2', sortKeys: false }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
