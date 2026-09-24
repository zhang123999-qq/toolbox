import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { LineEndingInput, LineEndingOptions } from './schema'

const EXAMPLE: LineEndingInput = { text: '第一行\r\n第二行\r\n第三行' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<LineEndingOptions>[] = [
    { key: 'target', label: t('option.target'), kind: 'select', values: ['lf', 'crlf', 'cr'] },
  ]

  return (
    <TwoColumn<LineEndingInput, LineEndingOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ target: 'lf' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
