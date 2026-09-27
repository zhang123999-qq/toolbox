import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { ProgrammerCalcInput, ProgrammerCalcOptions } from './schema'

/** 示例：0xFF & 0b1010 | 12 */
const EXAMPLE: ProgrammerCalcInput = { text: '0xFF & 0b1010 | 12' }

export default function Tool() {
  return (
    <TwoColumn<ProgrammerCalcInput, ProgrammerCalcOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
    />
  )
}
