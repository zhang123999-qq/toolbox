import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { DEMO_CERTIFICATE, transform } from './utils'
import type { PemParseInput, PemParseOptions } from './schema'

/** 示例：内置的演示证书（有效期 2024-01-01 → 2034-01-01） */
const EXAMPLE: PemParseInput = { text: DEMO_CERTIFICATE }

export default function Tool() {
  return (
    <TwoColumn<PemParseInput, PemParseOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      runAsync={transform}
      idleText={'粘贴一段 PEM 后点「运行」（首次会加载解析库）'}
      example={EXAMPLE}
    />
  )
}
