import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { SpeedTestInput, SpeedTestOptions } from './schema'

const EXAMPLE: SpeedTestInput = { text: 'https://example.com' }

export default function Tool() {
  const optionDefs: readonly OptionDef<SpeedTestOptions>[] = [
    {
      key: 'times',
      label: '测量次数',
      kind: 'select',
      values: [1, 3, 5],
    },
  ]

  return (
    <TwoColumn<SpeedTestInput, SpeedTestOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ times: 1 }}
      runAsync={transform}
      idleText="输入 URL 后点「运行」，在浏览器内多次 fetch 计时测速（同源精确，跨域为近似值）"
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
