import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { pipelineHtml, pipelineFinal } from './utils'
import type { TextWorkbenchInput, TextWorkbenchOptions } from './schema'

const EXAMPLE: TextWorkbenchInput = { text: '  北京  \n上海\n\n北京\n  广州  ' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<TextWorkbenchOptions>[] = [
    { key: 'steps', label: t('option.steps'), kind: 'textarea', placeholder: '' },
  ]

  return (
    <MultiPanel<TextWorkbenchInput, TextWorkbenchOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ steps: 'trim\ndrop-empty\ndedupe\nsort' }}
      example={EXAMPLE}
      optionDefs={optionDefs}
      // 默认按「渲染 HTML 字符串」包裹；工具可用 renderJsx 给出自定义 JSX 表达式
      renderOutput={(input, options) => (
        <div dangerouslySetInnerHTML={{ __html: pipelineHtml(input, options) }} />
      )}
      toText={(input, options) => pipelineFinal(input, options)}
      downloadExt="txt"
    />
  )
}
