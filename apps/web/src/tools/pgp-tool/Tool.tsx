import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { buildDemoArmor, transform } from './utils'
import { meta } from './meta'
import type { PgpToolInput, PgpToolOptions } from './schema'

export default function Tool() {
  return (
    <TwoColumn<PgpToolInput, PgpToolOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={transform}
      idleText="粘贴一段 PGP Armor（公钥 / 私钥 / 签名 / 加密报文）后点「运行」，在本地解析其结构"
      example={{ text: buildDemoArmor() }}
    />
  )
}
