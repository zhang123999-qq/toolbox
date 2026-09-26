import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { UaInput, UaOptions } from './schema'

/** 示例：一段 Chrome on Windows 的 UA */
const EXAMPLE: UaInput = {
  text: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
}

export default function Tool() {
  return (
    <TwoColumn<UaInput, UaOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
    />
  )
}
