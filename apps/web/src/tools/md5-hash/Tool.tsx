import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { Md5Input, Md5Options } from './schema'

const EXAMPLE: Md5Input = { text: 'abc' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<Md5Options>[] = [
    { key: 'uppercase', label: t('option.uppercase'), kind: 'boolean' },
    {
      key: 'format',
      label: t('option.format'),
      kind: 'select',
      values: ['hex', 'base64'],
    },
  ]

  return (
    <TwoColumn<Md5Input, Md5Options>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ uppercase: false, format: 'hex' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
