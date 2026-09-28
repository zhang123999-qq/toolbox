import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { buildOgTags } from './utils'
import type { OgInput, OgOptions } from './schema'

const EXAMPLE: OgInput = { text: '如何做好 SEO：从零开始的完整指南' }

/** 运行入口：主输入为 og:title，其余字段走选项；标题缺失抛中文错 */
function run(input: OgInput, options: OgOptions): string {
  return buildOgTags({
    title: input.text,
    description: options.description,
    image: options.image,
    url: options.url,
    type: options.type,
    siteName: options.siteName,
  })
}

export default function Tool() {
  return (
    <TwoColumn<OgInput, OgOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ description: '', image: '', url: '', type: 'website', siteName: '' }}
      optionDefs={[
        { key: 'description', label: 'og:description', kind: 'text', placeholder: '一句话摘要' },
        { key: 'image', label: 'og:image（封面图 URL）', kind: 'text', placeholder: 'https://example.com/cover.png' },
        { key: 'url', label: 'og:url（ canonical URL）', kind: 'text', placeholder: 'https://example.com/post' },
        { key: 'type', label: 'og:type', kind: 'select', values: ['website', 'article'] },
        { key: 'siteName', label: 'og:site_name', kind: 'text', placeholder: '我的博客' },
      ]}
      run={run}
      example={EXAMPLE}
    />
  )
}
