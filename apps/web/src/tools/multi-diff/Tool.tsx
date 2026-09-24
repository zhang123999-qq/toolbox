import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { MultiDiffInput, MultiDiffOptions } from './schema'

const EXAMPLE: MultiDiffInput = { text: '=== a.txt\n第一行\n第二行\n=== b.txt\n第一行\n第二行改了' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<MultiDiffOptions>[] = [
    { key: 'mode', label: t('option.mode'), kind: 'select', values: ['line', 'char'] },
  ]

  return (
    <TwoColumn<MultiDiffInput, MultiDiffOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ mode: 'line' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
