import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { TextAlignInput, TextAlignOptions } from './schema'

const EXAMPLE: TextAlignInput = { text: '北京\n上海\n广州' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<TextAlignOptions>[] = [
    {
      key: 'mode',
      label: t('option.mode'),
      kind: 'select',
      values: ['left', 'right', 'center', 'fill'],
    },
    { key: 'width', label: t('option.width'), kind: 'select', values: [20, 40, 60, 80] },
    { key: 'filler', label: t('option.filler'), kind: 'text' },
  ]

  return (
    <TwoColumn<TextAlignInput, TextAlignOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ mode: 'left', width: '40', filler: ' ' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
