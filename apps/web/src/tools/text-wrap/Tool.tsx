import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { TextWrapInput, TextWrapOptions } from './schema'

const EXAMPLE: TextWrapInput = {
  text: '这是一段需要按宽度自动换行的中文文本，用来验证换行工具在等宽字体下的表现。',
}

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<TextWrapOptions>[] = [
    { key: 'mode', label: t('option.mode'), kind: 'select', values: ['auto', 'word', 'char'] },
    { key: 'width', label: t('option.width'), kind: 'select', values: [40, 60, 80] },
    { key: 'breakLong', label: t('option.breakLong'), kind: 'boolean' },
  ]

  return (
    <TwoColumn<TextWrapInput, TextWrapOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ mode: 'auto', width: '40', breakLong: true }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
