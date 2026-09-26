import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { PostmanToCodeInput, PostmanToCodeOptions } from './schema'

const EXAMPLE: PostmanToCodeInput = {
  text: JSON.stringify(
    {
      info: {
        name: '示例集合',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      },
      item: [
        {
          name: '列出用户',
          request: {
            method: 'GET',
            url: 'https://api.example.com/users?page=1',
            header: [{ key: 'Accept', value: 'application/json' }],
          },
        },
        {
          name: '创建用户',
          request: {
            method: 'POST',
            url: { raw: 'https://api.example.com/users' },
            header: [
              { key: 'Content-Type', value: 'application/json' },
              { key: 'Authorization', value: 'Bearer token' },
            ],
            body: { mode: 'raw', raw: '{"name":"小张"}' },
          },
        },
      ],
    },
    null,
    2,
  ),
}

export default function Tool() {
  const optionDefs: readonly OptionDef<PostmanToCodeOptions>[] = [
    { key: 'language', label: '目标语言', kind: 'select', values: ['fetch', 'python', 'curl'] },
  ]

  return (
    <TwoColumn<PostmanToCodeInput, PostmanToCodeOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ language: 'fetch' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
