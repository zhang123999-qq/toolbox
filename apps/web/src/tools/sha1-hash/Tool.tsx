import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { Sha1Input, Sha1Options } from './schema'

const EXAMPLE: Sha1Input = { text: 'abc' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<Sha1Options>[] = [
    { key: 'uppercase', label: t('option.uppercase'), kind: 'boolean' },
    { key: 'format', label: t('option.format'), kind: 'select', values: ['hex', 'base64'] },
  ]

  return (
    <TwoColumn<Sha1Input, Sha1Options>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ uppercase: false, format: 'hex' }}
      runAsync={transform}
      idleText={'点击「运行」计算哈希'}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
