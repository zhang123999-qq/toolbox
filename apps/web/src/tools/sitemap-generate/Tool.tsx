import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { buildSitemapXml, CHANGEFREQS } from './utils'
import type { SitemapInput, SitemapOptions } from './schema'

const EXAMPLE: SitemapInput = {
  text: 'https://example.com/\nhttps://example.com/about\nhttps://example.com/blog',
}

/** 运行入口：按行拆分 URL 列表后生成；校验失败抛中文错，由 TwoColumn 转为错误态展示 */
function run(input: SitemapInput, options: SitemapOptions): string {
  return buildSitemapXml(input.text.split('\n'), {
    changefreq: options.changefreq,
    priority: options.priority,
    lastmod: options.lastmod,
  })
}

export default function Tool() {
  return (
    <TwoColumn<SitemapInput, SitemapOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ changefreq: '', priority: '', lastmod: '' }}
      optionDefs={[
        {
          key: 'changefreq',
          label: 'changefreq（可选）',
          kind: 'select',
          values: ['', ...CHANGEFREQS],
        },
        { key: 'priority', label: 'priority 0.0～1.0（可选）', kind: 'text', placeholder: '0.8' },
        {
          key: 'lastmod',
          label: 'lastmod（可选，YYYY-MM-DD）',
          kind: 'text',
          placeholder: '2026-09-28',
        },
      ]}
      run={run}
      example={EXAMPLE}
    />
  )
}
