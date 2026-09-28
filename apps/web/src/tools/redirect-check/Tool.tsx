import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { RedirectCheckInput, RedirectCheckOptions } from './schema'

const EXAMPLE: RedirectCheckInput = { text: 'https://example.com' }

export default function Tool() {
  const optionDefs: readonly OptionDef<RedirectCheckOptions>[] = [
    {
      key: 'mode',
      label: '检测模式',
      kind: 'select',
      values: ['实时检测', '粘贴分析'],
    },
  ]

  return (
    <TwoColumn<RedirectCheckInput, RedirectCheckOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ mode: '实时检测' }}
      runAsync={transform}
      idleText="输入 URL 后点「运行」，在浏览器内跟踪重定向链；或切换「粘贴分析」离线解析响应头"
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
