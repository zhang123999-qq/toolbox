import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { Sha3Input, Sha3Options } from './schema'

const EXAMPLE: Sha3Input = { text: 'abc' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<Sha3Options>[] = [
    {
      key: 'algorithm',
      label: t('option.algorithm'),
      kind: 'select',
      values: ['SHA3-256', 'SHA3-384', 'SHA3-512'],
    },
    { key: 'format', label: t('option.format'), kind: 'select', values: ['hex', 'base64'] },
  ]

  return (
    <TwoColumn<Sha3Input, Sha3Options>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ algorithm: 'SHA3-256', format: 'hex' }}
      runAsync={transform}
      idleText={'点击「运行」计算哈希'}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
