import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { buildMetaTags } from './utils'
import type { MetaInput, MetaOptions } from './schema'

const EXAMPLE: MetaInput = { text: '我的博客 - 分享技术与生活' }

/** 运行入口：主输入为页面标题，其余字段走选项；标题缺失抛中文错 */
function run(input: MetaInput, options: MetaOptions): string {
  return buildMetaTags({
    title: input.text,
    description: options.description,
    keywords: options.keywords,
    author: options.author,
    viewport: options.viewport,
    charset: options.charset,
    themeColor: options.themeColor,
  })
}

export default function Tool() {
  return (
    <TwoColumn<MetaInput, MetaOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{
        description: '',
        keywords: '',
        author: '',
        viewport: 'width=device-width, initial-scale=1',
        charset: 'UTF-8',
        themeColor: '',
      }}
      optionDefs={[
        { key: 'description', label: 'description（页面描述）', kind: 'text', placeholder: '一句话介绍页面内容' },
        { key: 'keywords', label: 'keywords（关键词，逗号分隔）', kind: 'text', placeholder: '博客,技术,SEO' },
        { key: 'author', label: 'author（作者）', kind: 'text', placeholder: '张三' },
        { key: 'viewport', label: 'viewport（视口）', kind: 'text', placeholder: 'width=device-width, initial-scale=1' },
        { key: 'charset', label: 'charset（字符集）', kind: 'text', placeholder: 'UTF-8' },
        { key: 'themeColor', label: 'theme-color（主题色）', kind: 'text', placeholder: '#ffffff' },
      ]}
      run={run}
      example={EXAMPLE}
    />
  )
}
