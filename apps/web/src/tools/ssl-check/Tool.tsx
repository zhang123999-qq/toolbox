import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { DEMO_CERTIFICATE, transform } from './utils'
import { meta } from './meta'
import type { SslCheckInput, SslCheckOptions } from './schema'

export default function Tool() {
  return (
    <TwoColumn<SslCheckInput, SslCheckOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      runAsync={transform}
      idleText="粘贴一张 PEM 证书（-----BEGIN CERTIFICATE-----）后点「运行」，全部检查在本地完成"
      example={{ text: DEMO_CERTIFICATE }}
    />
  )
}
