import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { TextDiffInput, TextDiffOptions } from './schema'

const EXAMPLE: TextDiffInput = {
  text: '第一行\n第二行\n第三行',
  textB: '第一行\n第二行改了\n第三行',
}

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<TextDiffOptions>[] = [
    { key: 'mode', label: t('option.mode'), kind: 'select', values: ['line', 'char'] },
  ]

  return (
    <TwoColumn<TextDiffInput, TextDiffOptions>
      meta={meta}
      initialInput={{ text: '', textB: '' }}
      initialOptions={{ mode: 'line' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
      extraInputs={[{ key: 'textB', label: t('tool.textB') }]}
    />
  )
}
