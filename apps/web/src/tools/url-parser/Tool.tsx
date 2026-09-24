import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { UrlInput, UrlOptions } from './schema'

const EXAMPLE: UrlInput = {
  text: 'https://user:pass@006336.xyz:8443/tools/json-formatter?indent=2&tag=a&tag=b#top',
}

export default function Tool() {
  return (
    <TwoColumn<UrlInput, UrlOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
    />
  )
}
