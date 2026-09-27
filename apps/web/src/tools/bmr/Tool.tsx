import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { FORMULAS, GENDERS, transform } from './utils'
import type { BmrInput, BmrOptions } from './schema'

/** 示例：175cm / 70kg / 男 / 30岁 / Mifflin-St Jeor */
const EXAMPLE: BmrInput = { text: '175', textB: '70' }

const OPTION_DEFS: readonly OptionDef<BmrOptions>[] = [
  { key: 'gender', label: '性别', kind: 'select', values: GENDERS },
  { key: 'age', label: '年龄', kind: 'text', placeholder: '30' },
  { key: 'formula', label: '公式', kind: 'select', values: FORMULAS },
]

export default function Tool() {
  return (
    <TwoColumn<BmrInput, BmrOptions>
      meta={meta}
      initialInput={{ text: '', textB: '' }}
      initialOptions={{ gender: '男', age: '30', formula: 'Mifflin-St Jeor' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={OPTION_DEFS}
      extraInputs={[{ key: 'textB', label: '体重（kg）', rows: 1 }]}
    />
  )
}
