import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { AutoprefixerInput, AutoprefixerOptions } from './schema'

const EXAMPLE: AutoprefixerInput = {
  text: '.box { display: flex; transform: translateX(10px); user-select: none; }',
}

export default function Tool() {
  return (
    <TwoColumn<AutoprefixerInput, AutoprefixerOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
    />
  )
}
