import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { ACTIVITY_FACTORS, GENDERS, transform } from './utils'
import type { CalorieInput, CalorieOptions } from './schema'

/** 示例：175cm / 70kg / 男 / 30岁 / 中度活动 */
const EXAMPLE: CalorieInput = { text: '175', textB: '70' }

const OPTION_DEFS: readonly OptionDef<CalorieOptions>[] = [
  { key: 'gender', label: '性别', kind: 'select', values: GENDERS },
  { key: 'age', label: '年龄', kind: 'text', placeholder: '30' },
  { key: 'activity', label: '活动强度', kind: 'select', values: Object.keys(ACTIVITY_FACTORS) },
]

export default function Tool() {
  return (
    <TwoColumn<CalorieInput, CalorieOptions>
      meta={meta}
      initialInput={{ text: '', textB: '' }}
      initialOptions={{ gender: '男', age: '30', activity: '中度活动' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={OPTION_DEFS}
      extraInputs={[{ key: 'textB', label: '体重（kg）', rows: 1 }]}
    />
  )
}
