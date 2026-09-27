import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { DiscountInput, DiscountOptions } from './schema'

/** 示例：100 元打 8.5 折 */
const EXAMPLE: DiscountInput = { text: '100', textB: '8.5' }

const OPTION_DEFS: readonly OptionDef<DiscountOptions>[] = [
  { key: 'mode', label: '计算方式', kind: 'select', values: ['按折扣率', '按折后价'] },
]

export default function Tool() {
  return (
    <TwoColumn<DiscountInput, DiscountOptions>
      meta={meta}
      initialInput={{ text: '', textB: '' }}
      initialOptions={{ mode: '按折扣率' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={OPTION_DEFS}
      extraInputs={[{ key: 'textB', label: '折扣 / 折后价', rows: 1 }]}
    />
  )
}
