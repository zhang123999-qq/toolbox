import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { SecurityHeadersInput, SecurityHeadersOptions } from './schema'

/** 示例：一份安全头较齐全的 HTTPS 响应 */
const EXAMPLE: SecurityHeadersInput = {
  text: `HTTP/2 200
Content-Type: text/html; charset=utf-8
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; script-src 'self'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), camera=()
`,
}

export default function Tool() {
  return (
    <TwoColumn<SecurityHeadersInput, SecurityHeadersOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
    />
  )
}
