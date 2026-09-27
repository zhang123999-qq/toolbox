import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { AgeInput, AgeOptions } from './schema'

/** 示例：1990-05-20 出生 */
const EXAMPLE: AgeInput = { text: '1990-05-20', textB: '' }

export default function Tool() {
  return (
    <TwoColumn<AgeInput, AgeOptions>
      meta={meta}
      initialInput={{ text: '', textB: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
      extraInputs={[{ key: 'textB', label: '参考日期（留空=今天）' }]}
    />
  )
}
