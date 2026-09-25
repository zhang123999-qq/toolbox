import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { Blake2Input, Blake2Options } from './schema'

const EXAMPLE: Blake2Input = { text: 'abc' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<Blake2Options>[] = [
    {
      key: 'algorithm',
      label: t('option.algorithm'),
      kind: 'select',
      values: ['BLAKE2b-512', 'BLAKE2b-384', 'BLAKE2b-256', 'BLAKE2s-256', 'BLAKE2s-128'],
    },
    { key: 'format', label: t('option.format'), kind: 'select', values: ['hex', 'base64'] },
  ]

  return (
    <TwoColumn<Blake2Input, Blake2Options>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ algorithm: 'BLAKE2b-512', format: 'hex' }}
      runAsync={transform}
      idleText={'点击「运行」计算哈希'}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
