import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { SplitBillInput, SplitBillOptions } from './schema'

/** 示例：300 元 3 人 AA，无小费 */
const EXAMPLE: SplitBillInput = { text: '300', textB: '3' }

const OPTION_DEFS: readonly OptionDef<SplitBillOptions>[] = [
  { key: 'tipRate', label: '小费比例', kind: 'select', values: ['0', '10', '15', '20'] },
]

export default function Tool() {
  return (
    <TwoColumn<SplitBillInput, SplitBillOptions>
      meta={meta}
      initialInput={{ text: '', textB: '' }}
      initialOptions={{ tipRate: '0' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={OPTION_DEFS}
      extraInputs={[{ key: 'textB', label: '人数', rows: 1 }]}
    />
  )
}
