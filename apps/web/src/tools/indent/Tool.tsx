import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { IndentInput, IndentOptions } from './schema'

const EXAMPLE: IndentInput = { text: '\tif (a) {\n\t\treturn\n\t}' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<IndentOptions>[] = [
    {
      key: 'mode',
      label: t('option.mode'),
      kind: 'select',
      values: ['to-spaces', 'to-tabs', 'increase', 'decrease'],
    },
    { key: 'width', label: t('option.width'), kind: 'select', values: ['2', '4', '8'] },
  ]

  return (
    <TwoColumn<IndentInput, IndentOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ mode: 'to-spaces', width: '4' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
