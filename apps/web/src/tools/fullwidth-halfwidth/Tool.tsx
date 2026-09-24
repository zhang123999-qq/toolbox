import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { FullwidthInput, FullwidthOptions } from './schema'

const EXAMPLE: FullwidthInput = { text: 'Ｔｏｏｌｂｏｘ　８７０' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<FullwidthOptions>[] = [
    { key: 'mode', label: t('option.mode'), kind: 'select', values: ['toHalf', 'toFull'] },
  ]

  return (
    <TwoColumn<FullwidthInput, FullwidthOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ mode: 'toHalf' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
