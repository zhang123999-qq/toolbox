import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { BatchReplaceInput, BatchReplaceOptions } from './schema'

const EXAMPLE: BatchReplaceInput = {
  text: '苹果很好吃，香蕉也很好吃。\n---\n苹果=>apple\n香蕉=>banana',
}

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<BatchReplaceOptions>[] = [
    { key: 'useRegex', label: t('option.useRegex'), kind: 'boolean' },
    { key: 'ignoreCase', label: t('option.ignoreCase'), kind: 'boolean' },
  ]

  return (
    <TwoColumn<BatchReplaceInput, BatchReplaceOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ useRegex: false, ignoreCase: false }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
