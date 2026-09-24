import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { HtmlToMarkdownInput, HtmlToMarkdownOptions } from './schema'

const EXAMPLE: HtmlToMarkdownInput = {
  text: '<h2>工具库</h2>\n<p>本地<strong>优先</strong>，共 <em>870</em> 个。</p>\n<ul><li>文本</li><li>编码</li></ul>',
}

export default function Tool() {
  return (
    <TwoColumn<HtmlToMarkdownInput, HtmlToMarkdownOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
    />
  )
}
