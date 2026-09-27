import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { ModeInput, ModeOptions } from './schema'

/** 示例：一组带明显众数的数据 */
const EXAMPLE: ModeInput = { text: '3, 5, 3, 7, 3, 9, 5, 3, 7' }

export default function Tool() {
  return (
    <TwoColumn<ModeInput, ModeOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
    />
  )
}
