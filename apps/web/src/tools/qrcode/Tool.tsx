import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { QrcodeInput, QrcodeOptions } from './schema'

const EXAMPLE: QrcodeInput = { text: 'https://example.com/二维码' }

export default function Tool() {
  const optionDefs: readonly OptionDef<QrcodeOptions>[] = [
    { key: 'level', label: '容错级别', kind: 'select', values: ['L', 'M', 'Q', 'H'] },
    { key: 'size', label: '尺寸', kind: 'text', placeholder: '128' },
  ]

  return (
    <TwoColumn<QrcodeInput, QrcodeOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ level: 'M', size: '256' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
      idleText="输入文本或链接，生成 SVG 二维码源码"
    />
  )
}
