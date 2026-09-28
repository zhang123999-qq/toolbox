import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { UlidInput, UlidOptions } from './schema'

/** 示例：输入框只作触发用 */
const EXAMPLE: UlidInput = { text: 'generate' }

export default function Tool() {
  const optionDefs: readonly OptionDef<UlidOptions>[] = [
    { key: 'count', label: '数量', kind: 'text', placeholder: '1' },
  ]

  return (
    <TwoColumn<UlidInput, UlidOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ count: '1' }}
      run={(input, options) => transform(input, options)}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
