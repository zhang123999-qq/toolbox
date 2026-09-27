import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { TzListInput, TzListOptions } from './schema'

/** 示例：过滤出 Asia 区域 */
const EXAMPLE: TzListInput = { text: 'Asia' }

export default function Tool() {
  return (
    <TwoColumn<TzListInput, TzListOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
    />
  )
}
