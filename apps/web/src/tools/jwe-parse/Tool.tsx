import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { JweParseInput, JweParseOptions } from './schema'

/** 示例：用演示口令（SHA-256 派生）加密的固定 JWE，解密结果可复现 */
const EXAMPLE: JweParseInput = {
  text: 'eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..yw7egmC1HndX1rp2.qWLdkuwWus2nYzE4Jbye-CkIWvc81g7exWHOvW3PVJ5dzIIkVSs.50UJFMKhbCdXVRYCxSf5xA',
  secret: 'demo-secret-1234567890-demo-secret',
}

export default function Tool() {
  const t = useTranslate()

  return (
    <TwoColumn<JweParseInput, JweParseOptions>
      meta={meta}
      initialInput={{ text: '', secret: '' }}
      initialOptions={{}}
      runAsync={transform}
      idleText={'填好 JWE 与口令后点「运行」'}
      example={EXAMPLE}
      extraInputs={[{ key: 'secret', label: t('option.password'), rows: 1 }]}
    />
  )
}
