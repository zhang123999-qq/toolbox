import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { DedupeInput, DedupeOptions } from './schema'

const EXAMPLE: DedupeInput = { text: '苹果\n香蕉\n苹果\n橙子\n香蕉' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<DedupeOptions>[] = [
    { key: 'ignoreCase', label: t('option.ignoreCase'), kind: 'boolean' },
    { key: 'trimLines', label: t('option.trimLines'), kind: 'boolean' },
    { key: 'keepEmpty', label: t('option.keepEmpty'), kind: 'boolean' },
  ]

  return (
    <TwoColumn<DedupeInput, DedupeOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ ignoreCase: false, trimLines: false, keepEmpty: false }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
