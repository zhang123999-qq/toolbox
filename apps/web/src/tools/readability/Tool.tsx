import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { ReadabilityInput, ReadabilityOptions } from './schema'

const EXAMPLE: ReadabilityInput = {
  text: 'The toolbox runs entirely in your browser. Nothing is uploaded, so your data stays on your device. Every tool is a plain function you can test.',
}

export default function Tool() {
  return (
    <TwoColumn<ReadabilityInput, ReadabilityOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
    />
  )
}
