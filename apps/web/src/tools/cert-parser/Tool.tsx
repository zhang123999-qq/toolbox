import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { DEMO_CERTIFICATE, transform } from './utils'
import { meta } from './meta'
import type { CertParserInput, CertParserOptions } from './schema'

export default function Tool() {
  return (
    <TwoColumn<CertParserInput, CertParserOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      runAsync={transform}
      idleText="粘贴一张 PEM 证书后点「运行」，解析在本地完成"
      example={{ text: DEMO_CERTIFICATE }}
    />
  )
}
