import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { MobileFriendlyInput, MobileFriendlyOptions } from './schema'

const EXAMPLE: MobileFriendlyInput = {
  text: '<!doctype html>\n<html>\n<head><meta name="viewport" content="width=device-width, initial-scale=1">\n<style>@media (max-width:600px){.main{width:100%}}</style></head>\n<body><div class="main" style="width:960px">hello</div></body>\n</html>',
}

export default function Tool() {
  const optionDefs: readonly OptionDef<MobileFriendlyOptions>[] = [
    {
      key: 'mode',
      label: '分析模式',
      kind: 'select',
      values: ['粘贴分析', '实时抓取'],
    },
  ]

  return (
    <TwoColumn<MobileFriendlyInput, MobileFriendlyOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ mode: '粘贴分析' }}
      runAsync={transform}
      idleText="粘贴 HTML 后点「运行」做离线分析；或输入页面 URL 切换「实时抓取」（需目标允许跨域）"
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
