import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { describeFile, transform } from './utils'
import type { BinaryViewerInput, BinaryViewerOptions } from './schema'

/** 示例：一段带偏移列的 xxd 风格转储，配合 fromHex 使用 */
const EXAMPLE: BinaryViewerInput = {
  text: [
    '00000000  89 50 4e 47 0d 0a 1a 0a  |.PNG....|',
    '00000008  00 00 00 0d 49 48 44 52  |....IHDR|',
  ].join('\n'),
}

/** 示例是 hex 文本，故默认方向设为 fromHex */
const INITIAL_OPTIONS: BinaryViewerOptions = { direction: 'fromHex', columns: '16' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<BinaryViewerOptions>[] = [
    {
      key: 'direction',
      label: t('option.direction'),
      kind: 'select',
      values: ['view', 'fromHex'],
    },
    { key: 'columns', label: t('option.columns'), kind: 'select', values: ['8', '16', '32'] },
  ]

  return (
    <TwoColumn<BinaryViewerInput, BinaryViewerOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={INITIAL_OPTIONS}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
      fileInput={{ label: t('tool.file'), onFile: describeFile }}
    />
  )
}
