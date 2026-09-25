import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { JsEscapeInput, JsEscapeOptions } from './schema'

const EXAMPLE: JsEscapeInput = { text: 'He said: "it\'s fine"' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<JsEscapeOptions>[] = [
    {
      key: 'direction',
      label: t('option.direction'),
      kind: 'select',
      values: ['escape', 'unescape'],
    },
    {
      key: 'quote',
      label: t('option.quote'),
      kind: 'select',
      values: ['single', 'double'],
    },
  ]

  return (
    <TwoColumn<JsEscapeInput, JsEscapeOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ direction: 'escape', quote: 'double' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
