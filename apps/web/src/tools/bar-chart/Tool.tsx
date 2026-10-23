import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { generateSvg } from './utils'
import type { BarChartInput, BarChartOptions } from './schema'

const EXAMPLE: BarChartInput = { text: '苹果,120\n香蕉,80\n橘子,150' }

export default function Tool() {
  const optionDefs: readonly OptionDef<BarChartOptions>[] = [
    { key: 'barColor', label: '条形颜色', kind: 'text', placeholder: '#3b82f6' },
  ]

  return (
    <TwoColumn<BarChartInput, BarChartOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ barColor: '#3b82f6' }}
      run={(input, options) => {
        const svg = generateSvg(input, options)
        return svg || '请输入数据（每行：标签,数值）'
      }}
      example={EXAMPLE}
      optionDefs={optionDefs}
      downloadExt="svg"
    />
  )
}
