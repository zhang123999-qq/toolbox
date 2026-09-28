import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { EdgeAuthInput, EdgeAuthOptions } from './schema'
import {
  EXAMPLE_BASIC_HEADER,
  generateBasicAuthWorker,
  generateJwtVerifySnippet,
  parseBasicAuthHeader,
} from './utils'

interface AuthView {
  error: string
  code: string
  detail: string
}

function buildView(input: EdgeAuthInput, options: EdgeAuthOptions): AuthView {
  try {
    if (options.mode === 'parse') {
      const header = input.text.trim() === '' ? EXAMPLE_BASIC_HEADER : input.text
      const parsed = parseBasicAuthHeader(header)
      return {
        error: '',
        code: '',
        detail: `用户名：${parsed.username}\n密码：${parsed.password}`,
      }
    }
    if (options.mode === 'jwt') {
      const code = generateJwtVerifySnippet({
        jwksUrl: options.jwksUrl,
        issuer: options.issuer,
        audience: options.audience,
      })
      return { error: '', code, detail: '' }
    }
    const code = generateBasicAuthWorker({
      realm: options.realm,
      username: options.username,
      password: options.password,
    })
    return { error: '', code, detail: '' }
  } catch (err) {
    return { error: err instanceof Error ? err.message : '处理失败', code: '', detail: '' }
  }
}

export default function Tool() {
  return (
    <MultiPanel<EdgeAuthInput, EdgeAuthOptions>
      meta={meta}
      initialInput={{ text: EXAMPLE_BASIC_HEADER }}
      initialOptions={{
        mode: 'basic',
        realm: 'admin-area',
        username: '',
        password: '',
        jwksUrl: '',
        issuer: '',
        audience: '',
      }}
      example={{ text: EXAMPLE_BASIC_HEADER }}
      optionDefs={[
        { key: 'mode', label: '模式', kind: 'select', values: ['basic', 'jwt', 'parse'] },
        { key: 'realm', label: 'realm', kind: 'text' },
        { key: 'username', label: '预置用户名', kind: 'text' },
        { key: 'password', label: '预置密码', kind: 'text' },
        { key: 'jwksUrl', label: 'JWKS 地址', kind: 'text' },
        { key: 'issuer', label: 'issuer', kind: 'text' },
        { key: 'audience', label: 'audience', kind: 'text' },
      ]}
      renderOutput={(input, options) => {
        const view = buildView(input, options)
        return (
          <div className="flex flex-col gap-3">
            {view.error !== '' && (
              <p data-testid="edge-auth-error" className="text-sm text-red-600 dark:text-red-400">
                {view.error}
              </p>
            )}
            {view.code !== '' && (
              <pre data-testid="edge-auth-code" className="whitespace-pre-wrap rounded bg-slate-100 p-3 font-mono text-xs dark:bg-slate-900">
                {view.code}
              </pre>
            )}
            {view.detail !== '' && (
              <p data-testid="edge-auth-detail" className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
                {view.detail}
              </p>
            )}
          </div>
        )
      }}
      toText={(input, options) => {
        const view = buildView(input, options)
        return view.code !== '' ? view.code : view.detail
      }}
      downloadExt="js"
    />
  )
}
