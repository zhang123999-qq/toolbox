import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { qrHtml, qrText } from './utils'
import type { TextToQrInput, TextToQrOptions } from './schema'

const EXAMPLE: TextToQrInput = { text: 'https://example.com/hello' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<TextToQrOptions>[] = [
    { key: 'level', label: t('option.level'), kind: 'select', values: ['L', 'M', 'Q', 'H'] },
  ]

  return (
    <MultiPanel<TextToQrInput, TextToQrOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ level: 'M' }}
      example={EXAMPLE}
      optionDefs={optionDefs}
      // 默认按「渲染 HTML 字符串」包裹；工具可用 renderJsx 给出自定义 JSX 表达式
      renderOutput={(input, options) => (
        <div dangerouslySetInnerHTML={{ __html: qrHtml(input, options) }} />
      )}
      toText={(input, options) => qrText(input, options)}
      downloadExt="txt"
    />
  )
}
