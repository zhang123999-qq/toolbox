import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { RegexAstInput, RegexAstOptions } from './schema'

const EXAMPLE: RegexAstInput = {
  text: '(https?://)?[\\w.-]+(:\\d+)?',
}

export default function Tool() {
  return (
    <TwoColumn<RegexAstInput, RegexAstOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
    />
  )
}
