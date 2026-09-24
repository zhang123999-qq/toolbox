import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { TextHashInput, TextHashOptions } from './schema'

const EXAMPLE: TextHashInput = { text: 'abc' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<TextHashOptions>[] = [
    {
      key: 'algorithm',
      label: t('option.algorithm'),
      kind: 'select',
      values: ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'],
    },
    { key: 'uppercase', label: t('option.uppercase'), kind: 'boolean' },
  ]

  return (
    <TwoColumn<TextHashInput, TextHashOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ algorithm: 'SHA-256', uppercase: false }}
      runAsync={transform}
      idleText={'点「运行」后结果出现在这里'}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
