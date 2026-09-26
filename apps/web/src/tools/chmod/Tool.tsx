import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { ChmodInput, ChmodOptions } from './schema'

const EXAMPLE: ChmodInput = { text: '755' }

export default function Tool() {
  return (
    <TwoColumn<ChmodInput, ChmodOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
    />
  )
}
