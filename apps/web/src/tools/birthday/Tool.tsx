import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { BirthdayInput, BirthdayOptions } from './schema'

/** 示例：05-20 */
const EXAMPLE: BirthdayInput = { text: '05-20' }

export default function Tool() {
  return (
    <TwoColumn<BirthdayInput, BirthdayOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
    />
  )
}
