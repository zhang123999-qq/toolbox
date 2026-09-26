import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { SUPPORTED_ENCODINGS, transform } from './utils'
import type { EncodingConvertInput, EncodingConvertOptions } from './schema'

const EXAMPLE: EncodingConvertInput = { text: '工具箱' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<EncodingConvertOptions>[] = [
    {
      key: 'direction',
      label: t('option.direction'),
      kind: 'select',
      values: ['encode', 'decode'],
    },
    { key: 'encoding', label: t('option.encoding'), kind: 'select', values: SUPPORTED_ENCODINGS },
    {
      key: 'format',
      label: t('option.format'),
      kind: 'select',
      values: ['hex', 'base64', 'latin1'],
    },
  ]

  return (
    <TwoColumn<EncodingConvertInput, EncodingConvertOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ direction: 'encode', encoding: 'gbk', format: 'hex' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
