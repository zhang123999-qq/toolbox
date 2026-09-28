import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { UuidInput, UuidOptions } from './schema'

/** 示例：输入框只作触发用 */
const EXAMPLE: UuidInput = { text: 'generate' }

export default function Tool() {
  const optionDefs: readonly OptionDef<UuidOptions>[] = [
    { key: 'count', label: '数量', kind: 'text', placeholder: '1' },
    { key: 'uppercase', label: '大写输出', kind: 'boolean' },
    { key: 'hyphens', label: '保留横线', kind: 'boolean' },
  ]

  return (
    <TwoColumn<UuidInput, UuidOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ count: '1', uppercase: false, hyphens: true }}
      run={(input, options) => transform(input, options)}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
