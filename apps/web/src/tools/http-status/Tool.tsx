import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { HttpStatusInput, HttpStatusOptions } from './schema'

/** 示例：最常见的 404 */
const EXAMPLE: HttpStatusInput = { text: '404' }

export default function Tool() {
  return (
    <TwoColumn<HttpStatusInput, HttpStatusOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
    />
  )
}
