import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { EscapeInput, EscapeOptions } from './schema'

const EXAMPLE: EscapeInput = { text: '<div class="a">工具库 & 870</div>' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<EscapeOptions>[] = [
    {
      key: 'type',
      label: t('option.type'),
      kind: 'select',
      values: ['js', 'html', 'css', 'json', 'sql'],
    },
    { key: 'mode', label: t('option.mode'), kind: 'select', values: ['escape', 'unescape'] },
  ]

  return (
    <TwoColumn<EscapeInput, EscapeOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ type: 'html', mode: 'escape' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
