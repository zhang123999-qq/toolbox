import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { buildTwitterCardTags, CARD_TYPES } from './utils'
import type { TwitterCardInput, TwitterCardOptions } from './schema'

const EXAMPLE: TwitterCardInput = { text: '10 个提升网站速度的实用技巧' }

/** 运行入口：主输入为 twitter:title，其余字段走选项；标题缺失抛中文错 */
function run(input: TwitterCardInput, options: TwitterCardOptions): string {
  return buildTwitterCardTags({
    title: input.text,
    card: options.card,
    description: options.description,
    image: options.image,
    site: options.site,
  })
}

export default function Tool() {
  return (
    <TwoColumn<TwitterCardInput, TwitterCardOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ card: 'summary_large_image', description: '', image: '', site: '' }}
      optionDefs={[
        { key: 'card', label: 'twitter:card（卡片类型）', kind: 'select', values: [...CARD_TYPES] },
        { key: 'description', label: 'twitter:description', kind: 'text', placeholder: '一句话摘要' },
        { key: 'image', label: 'twitter:image（封面图 URL）', kind: 'text', placeholder: 'https://example.com/cover.png' },
        { key: 'site', label: 'twitter:site（账号）', kind: 'text', placeholder: '@example' },
      ]}
      run={run}
      example={EXAMPLE}
    />
  )
}
