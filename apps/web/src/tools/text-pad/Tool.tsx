import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { TextPadInput, TextPadOptions } from './schema'

const EXAMPLE: TextPadInput = { text: '1\n42\n512' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<TextPadOptions>[] = [
    {
      key: 'mode',
      label: t('option.mode'),
      kind: 'select',
      values: ['left', 'right', 'both', 'center'],
    },
    { key: 'length', label: t('option.length'), kind: 'select', values: ['8', '16', '32', '64'] },
    { key: 'filler', label: t('option.filler'), kind: 'text' },
  ]

  return (
    <TwoColumn<TextPadInput, TextPadOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ mode: 'left', length: '8', filler: '0' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
