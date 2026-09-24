import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { PrefixSuffixInput, PrefixSuffixOptions } from './schema'

const EXAMPLE: PrefixSuffixInput = { text: '苹果\n香蕉\n橙子' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<PrefixSuffixOptions>[] = [
    { key: 'prefix', label: t('option.prefix'), kind: 'text' },
    { key: 'suffix', label: t('option.suffix'), kind: 'text' },
    { key: 'skipEmpty', label: t('option.skipEmpty'), kind: 'boolean' },
  ]

  return (
    <TwoColumn<PrefixSuffixInput, PrefixSuffixOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ prefix: '- ', suffix: '', skipEmpty: true }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
