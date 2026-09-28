import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { GENDERS, transform } from './utils'
import type { BodyFatInput, BodyFatOptions } from './schema'

/** 示例：男 / 腰围 85 / 颈围 38 / 身高 175 */
const EXAMPLE: BodyFatInput = { text: '85', textB: '38', textC: '175', textD: '' }

const OPTION_DEFS: readonly OptionDef<BodyFatOptions>[] = [
  { key: 'gender', label: '性别', kind: 'select', values: GENDERS },
]

export default function Tool() {
  return (
    <TwoColumn<BodyFatInput, BodyFatOptions>
      meta={meta}
      initialInput={{ text: '', textB: '', textC: '', textD: '' }}
      initialOptions={{ gender: '男' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={OPTION_DEFS}
      extraInputs={[
        { key: 'textB', label: '颈围（cm）', rows: 1 },
        { key: 'textC', label: '身高（cm）', rows: 1 },
        { key: 'textD', label: '臀围（cm，女性必填）', rows: 1 },
      ]}
    />
  )
}
