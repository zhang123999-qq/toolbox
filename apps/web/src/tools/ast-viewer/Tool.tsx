import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { AstViewerInput, AstViewerOptions } from './schema'

const EXAMPLE: AstViewerInput = {
  text: `function greet(name) {
  const msg = 'hi ' + name
  if (name) {
    return msg
  }
  return 'bye'
}

class User {
  constructor(name) {
    this.name = name
  }
}`,
}

export default function Tool() {
  return (
    <TwoColumn<AstViewerInput, AstViewerOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
    />
  )
}
