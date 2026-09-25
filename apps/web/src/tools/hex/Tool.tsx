import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { HexInput, HexOptions } from './schema'

const EXAMPLE: HexInput = { text: 'Hi 中' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<HexOptions>[] = [
    {
      key: 'direction',
      label: t('option.direction'),
      kind: 'select',
      values: ['encode', 'decode'],
    },
    {
      key: 'separator',
      label: t('option.separator'),
      kind: 'select',
      values: ['none', 'space', 'hyphen', '0x'],
    },
    {
      key: 'uppercase',
      label: t('option.uppercase'),
      kind: 'boolean',
    },
  ]

  return (
    <TwoColumn<HexInput, HexOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ direction: 'encode', separator: 'space', uppercase: false }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
