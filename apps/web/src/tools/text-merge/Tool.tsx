import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { TextMergeInput, TextMergeOptions } from './schema'

const EXAMPLE: TextMergeInput = {
  text: '第一行\n第二行\n第三行',
  textB: '第一行\n第二行（我改的）\n第三行',
  textC: '第一行\n第二行\n第三行（他人加的）',
}

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<TextMergeOptions>[] = [
    {
      key: 'prefer',
      label: t('option.prefer'),
      kind: 'select',
      values: ['auto', 'mine', 'theirs'],
    },
  ]

  return (
    <TwoColumn<TextMergeInput, TextMergeOptions>
      meta={meta}
      initialInput={{ text: '', textB: '', textC: '' }}
      initialOptions={{ prefer: 'auto' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
      extraInputs={[
        { key: 'textB', label: t('tool.textMine') },
        { key: 'textC', label: t('tool.textTheirs') },
      ]}
    />
  )
}
