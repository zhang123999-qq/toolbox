import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { BmiInput, BmiOptions } from './schema'

/** 示例：175cm / 70kg */
const EXAMPLE: BmiInput = { text: '175', textB: '70' }

export default function Tool() {
  return (
    <TwoColumn<BmiInput, BmiOptions>
      meta={meta}
      initialInput={{ text: '', textB: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
      extraInputs={[{ key: 'textB', label: '体重（kg）', rows: 1 }]}
    />
  )
}
