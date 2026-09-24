import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { TextUnwatermarkInput, TextUnwatermarkOptions } from './schema'

const EXAMPLE: TextUnwatermarkInput = { text: '普通​文‌本‍带⁠隐藏字符' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<TextUnwatermarkOptions>[] = [
    { key: 'mode', label: t('option.mode'), kind: 'select', values: ['strip', 'mark'] },
  ]

  return (
    <TwoColumn<TextUnwatermarkInput, TextUnwatermarkOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ mode: 'strip' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
