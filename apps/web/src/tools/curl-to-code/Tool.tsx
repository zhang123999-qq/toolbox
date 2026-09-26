import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { CurlToCodeInput, CurlToCodeOptions } from './schema'

const EXAMPLE: CurlToCodeInput = {
  text: [
    'curl -X POST https://api.example.com/users \\',
    '  -H "Content-Type: application/json" \\',
    '  -H "Authorization: Bearer token123" \\',
    '  -d \'{"name":"小张","age":25}\'',
  ].join('\n'),
}

export default function Tool() {
  const optionDefs: readonly OptionDef<CurlToCodeOptions>[] = [
    {
      key: 'language',
      label: '目标语言',
      kind: 'select',
      values: ['fetch', 'node', 'python', 'java', 'go'],
    },
  ]

  return (
    <TwoColumn<CurlToCodeInput, CurlToCodeOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ language: 'fetch' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
