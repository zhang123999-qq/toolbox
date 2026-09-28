import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { buildRobotsTxt, parseRobotRules } from './utils'
import type { RobotsInput, RobotsOptions } from './schema'

const EXAMPLE: RobotsInput = {
  text: '* disallow /private\n* allow /private/public\nGooglebot disallow /tmp',
}

/** 运行入口：先解析规则文本再生成；任一步失败抛中文错，由 TwoColumn 转为错误态展示 */
function run(input: RobotsInput, options: RobotsOptions): string {
  return buildRobotsTxt(parseRobotRules(input.text), {
    sitemap: options.sitemap,
    crawlDelay: options.crawlDelay,
  })
}

export default function Tool() {
  return (
    <TwoColumn<RobotsInput, RobotsOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ sitemap: '', crawlDelay: '' }}
      optionDefs={[
        {
          key: 'sitemap',
          label: 'Sitemap URL（可选）',
          kind: 'text',
          placeholder: 'https://example.com/sitemap.xml',
        },
        { key: 'crawlDelay', label: 'Crawl-delay（秒，可选）', kind: 'text', placeholder: '10' },
      ]}
      run={run}
      example={EXAMPLE}
    />
  )
}
