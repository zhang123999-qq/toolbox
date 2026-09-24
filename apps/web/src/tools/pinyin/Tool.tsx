import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { PinyinToolInput, PinyinToolOptions } from './schema'

const EXAMPLE: PinyinToolInput = { text: '工具库' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<PinyinToolOptions>[] = [
    { key: 'tone', label: t('option.tone'), kind: 'select', values: ['symbol', 'num', 'none'] },
  ]

  return (
    <TwoColumn<PinyinToolInput, PinyinToolOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ tone: 'symbol' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
