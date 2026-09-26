import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { CorsConfigInput, CorsConfigOptions } from './schema'

const EXAMPLE: CorsConfigInput = { text: 'generate' }

export default function Tool() {
  const optionDefs: readonly OptionDef<CorsConfigOptions>[] = [
    {
      key: 'originMode',
      label: '来源模式',
      kind: 'select',
      values: ['allow-all', 'specific', 'same-origin'],
    },
    {
      key: 'originList',
      label: '允许的 Origin',
      kind: 'text',
      placeholder: 'https://example.com, https://app.example.com',
    },
    { key: 'methods', label: '允许的方法', kind: 'text', placeholder: 'GET, POST, PUT, DELETE' },
    {
      key: 'headers',
      label: '允许的请求头',
      kind: 'text',
      placeholder: 'Content-Type, Authorization',
    },
    { key: 'credentials', label: '携带凭据', kind: 'boolean' },
    { key: 'maxAge', label: '预检缓存（秒）', kind: 'text', placeholder: '600' },
  ]

  return (
    <TwoColumn<CorsConfigInput, CorsConfigOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{
        originMode: 'same-origin',
        originList: '',
        methods: '',
        headers: '',
        credentials: false,
        maxAge: '',
      }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
