import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { PunycodeInput, PunycodeOptions } from './schema'

const EXAMPLE: PunycodeInput = { text: '中国.中国' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<PunycodeOptions>[] = [
    {
      key: 'direction',
      label: t('option.direction'),
      kind: 'select',
      values: ['encode', 'decode'],
    },
  ]

  return (
    <TwoColumn<PunycodeInput, PunycodeOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ direction: 'encode' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
