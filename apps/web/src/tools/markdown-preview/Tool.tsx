import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { renderHtml } from './utils'
import type { MarkdownPreviewInput, MarkdownPreviewOptions } from './schema'

const EXAMPLE: MarkdownPreviewInput = {
  text: '# 工具库\n\n- 本地优先\n- **870** 个工具\n\n| 域 | 数量 |\n| -- | -- |\n| text | 70 |',
}

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<MarkdownPreviewOptions>[] = [
    { key: 'breaks', label: t('option.breaks'), kind: 'boolean' },
  ]

  return (
    <MultiPanel<MarkdownPreviewInput, MarkdownPreviewOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ breaks: false }}
      example={EXAMPLE}
      optionDefs={optionDefs}
      // 默认按「渲染 HTML 字符串」包裹；工具可用 renderJsx 给出自定义 JSX 表达式
      renderOutput={(input, options) => (
        <div dangerouslySetInnerHTML={{ __html: renderHtml(input, options) }} />
      )}
      toText={(input, options) => renderHtml(input, options)}
      downloadExt="html"
    />
  )
}
