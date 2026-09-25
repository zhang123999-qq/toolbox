import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { OctalInput, OctalOptions } from './schema'

const EXAMPLE: OctalInput = { text: '中' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<OctalOptions>[] = [
    {
      key: 'direction',
      label: t('option.direction'),
      kind: 'select',
      // encode = 文本 → 八进制；decode = 八进制 → 文本
      values: ['encode', 'decode'],
    },
    {
      key: 'mode',
      label: t('option.mode'),
      kind: 'select',
      values: ['char', 'byte'],
    },
  ]

  return (
    <TwoColumn<OctalInput, OctalOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ direction: 'encode', mode: 'byte' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
