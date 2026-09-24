import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { BlankLinesInput, BlankLinesOptions } from './schema'

const EXAMPLE: BlankLinesInput = { text: '第一段\n\n\n第二段\n   \n第三段' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<BlankLinesOptions>[] = [
    {
      key: 'mode',
      label: t('option.mode'),
      kind: 'select',
      values: ['remove', 'collapse', 'trim'],
    },
  ]

  return (
    <TwoColumn<BlankLinesInput, BlankLinesOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ mode: 'remove' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
