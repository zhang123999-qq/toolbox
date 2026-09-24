import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { highlightHtml, plainDiff } from './utils'
import type { DiffHighlightInput, DiffHighlightOptions } from './schema'

const EXAMPLE: DiffHighlightInput = {
  text: '第一行\n第二行\n第三行',
  textB: '第一行\n第二行改了\n第三行',
}

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<DiffHighlightOptions>[] = [
    { key: 'mode', label: t('option.mode'), kind: 'select', values: ['line', 'char'] },
  ]

  return (
    <MultiPanel<DiffHighlightInput, DiffHighlightOptions>
      meta={meta}
      initialInput={{ text: '', textB: '' }}
      initialOptions={{ mode: 'line' }}
      example={EXAMPLE}
      optionDefs={optionDefs}
      extraInputs={[{ key: 'textB', label: t('tool.textB'), rows: 4 }]}
      // 默认按「渲染 HTML 字符串」包裹；工具可用 renderJsx 给出自定义 JSX 表达式
      renderOutput={(input, options) => (
        <div dangerouslySetInnerHTML={{ __html: highlightHtml(input, options) }} />
      )}
      toText={(input, options) => plainDiff(input, options)}
      downloadExt="txt"
    />
  )
}
