import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { RichToTextInput, RichToTextOptions } from './schema'

const EXAMPLE: RichToTextInput = {
  text: '<div><h2>工具库</h2><p>本地<strong>优先</strong>。</p><p>共 870 个。</p></div>',
}

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<RichToTextOptions>[] = [
    { key: 'keepLineBreaks', label: t('option.keepLineBreaks'), kind: 'boolean' },
  ]

  return (
    <TwoColumn<RichToTextInput, RichToTextOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ keepLineBreaks: true }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
