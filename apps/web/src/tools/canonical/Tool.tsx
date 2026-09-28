import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { buildCanonicalTag } from './utils'
import type { CanonicalInput, CanonicalOptions } from './schema'

const EXAMPLE: CanonicalInput = { text: 'https://example.com/blog/post?utm_source=x' }

/** 运行入口：页面 URL 取主输入，规范 URL 取选项；双 URL 校验不合法抛中文错 */
function run(input: CanonicalInput, options: CanonicalOptions): string {
  return buildCanonicalTag(input.text, options.canonicalUrl)
}

export default function Tool() {
  return (
    <TwoColumn<CanonicalInput, CanonicalOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ canonicalUrl: '' }}
      optionDefs={[
        {
          key: 'canonicalUrl',
          label: '规范 URL',
          kind: 'text',
          placeholder: 'https://example.com/blog/post',
        },
      ]}
      run={run}
      example={EXAMPLE}
    />
  )
}
