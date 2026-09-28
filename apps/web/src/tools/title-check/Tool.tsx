import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { TitleCheckInput, TitleCheckOptions } from './schema'

const EXAMPLE: TitleCheckInput = { text: '2026年最好的10款无线耳机推荐：实测对比与选购指南' }

export default function Tool() {
  const optionDefs: readonly OptionDef<TitleCheckOptions>[] = [
    {
      key: 'keyword',
      label: '目标关键词（可选）',
      kind: 'text',
      placeholder: '例如：无线耳机',
    },
  ]

  return (
    <TwoColumn<TitleCheckInput, TitleCheckOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ keyword: '' }}
      runAsync={transform}
      idleText="输入页面标题后点「运行」，检查显示宽度、SERP 截断、关键词前置与重复词"
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
