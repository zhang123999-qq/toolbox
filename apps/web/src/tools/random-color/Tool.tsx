import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { RandomColorInput, RandomColorOptions } from './schema'

/** 示例：无输入，直接随机生成 */
const EXAMPLE: RandomColorInput = { text: '' }

export default function Tool() {
  const optionDefs: readonly OptionDef<RandomColorOptions>[] = [
    { key: 'count', label: '数量', kind: 'text', placeholder: '1' },
    { key: 'format', label: '格式', kind: 'select', values: ['hex', 'rgb', 'hsl'] },
  ]
  return (
    <TwoColumn<RandomColorInput, RandomColorOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ count: '1', format: 'hex' }}
      run={(input, options) => transform(input, options)}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
