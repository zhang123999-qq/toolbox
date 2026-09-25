import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { StrengthInput, StrengthOptions } from './schema'

/** 示例：一个弱口令，便于一眼看到「风险 + 建议」两段 */
const EXAMPLE: StrengthInput = { text: 'P@ssw0rd' }

export default function Tool() {
  return (
    <TwoColumn<StrengthInput, StrengthOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
    />
  )
}
