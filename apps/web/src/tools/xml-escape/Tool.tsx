import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { XmlEscapeInput, XmlEscapeOptions } from './schema'

const EXAMPLE: XmlEscapeInput = { text: '<a href="x">工具库</a>' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<XmlEscapeOptions>[] = [
    {
      key: 'direction',
      label: t('option.direction'),
      kind: 'select',
      values: ['escape', 'unescape'],
    },
    {
      key: 'mode',
      label: t('option.mode'),
      kind: 'select',
      values: ['entity', 'numeric', 'cdata'],
    },
  ]

  return (
    <TwoColumn<XmlEscapeInput, XmlEscapeOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ direction: 'escape', mode: 'entity' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
