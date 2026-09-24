import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { ShuffleInput, ShuffleOptions } from './schema'

const EXAMPLE: ShuffleInput = { text: '第一行\n第二行\n第三行' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<ShuffleOptions>[] = [
    { key: 'mode', label: t('option.mode'), kind: 'select', values: ['line', 'word'] },
    { key: 'stable', label: t('option.stable'), kind: 'boolean' },
  ]

  return (
    <TwoColumn<ShuffleInput, ShuffleOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ mode: 'line', stable: false }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
