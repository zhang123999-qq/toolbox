import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { SalaryInput, SalaryOptions } from './schema'

/** 示例：税前月薪 15000，社保个人 10.5%，公积金个人 12% */
const EXAMPLE: SalaryInput = { text: '15000' }

const OPTION_DEFS: readonly OptionDef<SalaryOptions>[] = [
  { key: 'socialRate', label: '社保个人比例%', kind: 'select', values: ['8', '10.5'] },
  { key: 'fundRate', label: '公积金个人比例%', kind: 'select', values: ['5', '7', '12'] },
]

export default function Tool() {
  return (
    <TwoColumn<SalaryInput, SalaryOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ socialRate: '10.5', fundRate: '12' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={OPTION_DEFS}
    />
  )
}
