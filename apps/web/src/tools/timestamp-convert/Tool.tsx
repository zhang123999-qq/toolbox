import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { TsConvertInput, TsConvertOptions } from './schema'

/** 示例：一个秒级时间戳 */
const EXAMPLE: TsConvertInput = { text: '1790494200' }

export default function Tool() {
  return (
    <TwoColumn<TsConvertInput, TsConvertOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
    />
  )
}
