import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { RegexVisualizeInput, RegexVisualizeOptions } from './schema'

const EXAMPLE: RegexVisualizeInput = {
  text: '(https?://)?[\\w.-]+(:\\d+)?',
}

export default function Tool() {
  return (
    <TwoColumn<RegexVisualizeInput, RegexVisualizeOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
    />
  )
}
