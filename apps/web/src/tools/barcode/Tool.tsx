import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { BarcodeInput, BarcodeOptions } from './schema'

const EXAMPLE: BarcodeInput = { text: '12345678' }

export default function Tool() {
  const optionDefs: readonly OptionDef<BarcodeOptions>[] = [
    { key: 'height', label: '条高(px)', kind: 'text', placeholder: '80' },
    { key: 'lineWidth', label: '线宽(px)', kind: 'text', placeholder: '2' },
    { key: 'showText', label: '显示文本', kind: 'boolean' },
  ]

  return (
    <TwoColumn<BarcodeInput, BarcodeOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ height: '80', lineWidth: '2', showText: true }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
      idleText="输入 ASCII 可打印字符，生成 Code128 B 条形码 SVG 源码"
    />
  )
}
