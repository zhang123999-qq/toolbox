import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { CorsCheckInput, CorsCheckOptions } from './schema'

/** 示例：一个通配符 + 携带凭据的「无效」配置，便于直观看到检测结论 */
const EXAMPLE: CorsCheckInput = {
  text: `HTTP/2 200
Content-Type: application/json
Access-Control-Allow-Origin: https://example.com
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 600
Vary: Origin
`,
}

export default function Tool() {
  return (
    <TwoColumn<CorsCheckInput, CorsCheckOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
    />
  )
}
