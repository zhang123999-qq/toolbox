import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { TextWatermarkInput, TextWatermarkOptions } from './schema'

const EXAMPLE: TextWatermarkInput = {
  text: '这是一段需要追溯来源的内部文本。',
  watermark: 'alice@example.com',
}

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<TextWatermarkOptions>[] = [
    { key: 'mode', label: t('option.mode'), kind: 'select', values: ['embed', 'extract'] },
  ]

  return (
    <TwoColumn<TextWatermarkInput, TextWatermarkOptions>
      meta={meta}
      initialInput={{ text: '', watermark: '' }}
      initialOptions={{ mode: 'embed' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
      extraInputs={[{ key: 'watermark', label: t('tool.watermark'), rows: 1 }]}
    />
  )
}
