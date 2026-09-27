import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { CountdownInput, CountdownOptions } from './schema'

/** 示例：2027-01-01 00:00:00 */
const EXAMPLE: CountdownInput = { text: '2027-01-01 00:00:00', textB: '' }

export default function Tool() {
  const optionDefs: readonly OptionDef<CountdownOptions>[] = [
    { key: 'title', label: '标题', kind: 'text', placeholder: '倒数日' },
  ]

  return (
    <TwoColumn<CountdownInput, CountdownOptions>
      meta={meta}
      initialInput={{ text: '', textB: '' }}
      initialOptions={{ title: '' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
      extraInputs={[{ key: 'textB', label: '开始日期（可选，算进度用）' }]}
    />
  )
}
