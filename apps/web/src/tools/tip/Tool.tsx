import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { TipInput, TipOptions } from './schema'

/** 示例：账单 200 元，小费 15%，1 人 */
const EXAMPLE: TipInput = { text: '200' }

const OPTION_DEFS: readonly OptionDef<TipOptions>[] = [
  { key: 'rate', label: '小费比例', kind: 'select', values: ['10', '15', '18', '20', '25'] },
  { key: 'people', label: '人数', kind: 'text', placeholder: '1' },
]

export default function Tool() {
  return (
    <TwoColumn<TipInput, TipOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ rate: '15', people: '1' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={OPTION_DEFS}
    />
  )
}
