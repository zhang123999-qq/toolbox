import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { CssEscapeInput, CssEscapeOptions } from './schema'

const EXAMPLE: CssEscapeInput = { text: 'a b' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<CssEscapeOptions>[] = [
    {
      key: 'direction',
      label: t('option.direction'),
      kind: 'select',
      values: ['escape', 'unescape'],
    },
  ]

  return (
    <TwoColumn<CssEscapeInput, CssEscapeOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ direction: 'escape' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
