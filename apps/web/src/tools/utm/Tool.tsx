import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { buildUtmUrl } from './utils'
import type { UtmInput, UtmOptions } from './schema'

const EXAMPLE: UtmInput = { text: 'https://example.com/landing' }

/** 运行入口：参数缺失时 buildUtmUrl 抛中文错，由 TwoColumn 转为错误态展示 */
function run(input: UtmInput, options: UtmOptions): string {
  return buildUtmUrl(input.text, {
    source: options.source,
    medium: options.medium,
    campaign: options.campaign,
    term: options.term,
    content: options.content,
  })
}

export default function Tool() {
  return (
    <TwoColumn<UtmInput, UtmOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ source: '', medium: '', campaign: '', term: '', content: '' }}
      optionDefs={[
        { key: 'source', label: 'utm_source（必填）', kind: 'text', placeholder: 'google' },
        { key: 'medium', label: 'utm_medium（必填）', kind: 'text', placeholder: 'cpc' },
        {
          key: 'campaign',
          label: 'utm_campaign（必填）',
          kind: 'text',
          placeholder: 'spring_sale',
        },
        { key: 'term', label: 'utm_term（可选）', kind: 'text', placeholder: '关键词' },
        { key: 'content', label: 'utm_content（可选）', kind: 'text', placeholder: '区分版本' },
      ]}
      run={run}
      example={EXAMPLE}
    />
  )
}
