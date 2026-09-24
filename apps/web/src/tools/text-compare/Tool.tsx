import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { TextCompareInput, TextCompareOptions } from './schema'

const EXAMPLE: TextCompareInput = { text: '这是第一句示例文本。', textB: '这是第二句示例文本。' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<TextCompareOptions>[] = [
    { key: 'mode', label: t('option.mode'), kind: 'select', values: ['report', 'diff'] },
  ]

  return (
    <TwoColumn<TextCompareInput, TextCompareOptions>
      meta={meta}
      initialInput={{ text: '', textB: '' }}
      initialOptions={{ mode: 'report' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
      extraInputs={[{ key: 'textB', label: t('tool.otherText'), rows: 4 }]}
    />
  )
}
