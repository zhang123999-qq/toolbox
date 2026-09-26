import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { IsoInput, IsoOptions } from './schema'

/** 示例：一个带时区偏移的 ISO 串 */
const EXAMPLE: IsoInput = { text: '2026-09-26T14:00:00+08:00' }

export default function Tool() {
  return (
    <TwoColumn<IsoInput, IsoOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
    />
  )
}
