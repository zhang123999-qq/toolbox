import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { transform } from './utils'
import type { CssGenInput, CssGenOptions } from './schema'
import { meta } from './meta'

/** 示例：用文本框直接指定 pulse 预设 */
const EXAMPLE: CssGenInput = { text: 'pulse' }

export default function Tool() {
  const optionDefs: readonly OptionDef<CssGenOptions>[] = [
    {
      key: 'preset',
      label: '动画预设',
      kind: 'select',
      values: [
        'bounce',
        'fadeIn',
        'fadeOut',
        'slideInLeft',
        'slideInRight',
        'rotate',
        'pulse',
        'flip',
        'shake',
        'heartbeat',
      ],
    },
    { key: 'duration', label: '时长', kind: 'text', placeholder: '1s' },
    {
      key: 'timing',
      label: '缓动函数',
      kind: 'select',
      values: ['ease', 'ease-in', 'ease-out', 'linear'],
    },
    { key: 'infinite', label: '无限循环', kind: 'boolean' },
  ]

  return (
    <TwoColumn<CssGenInput, CssGenOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ preset: 'bounce', duration: '1s', timing: 'ease', infinite: false }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
