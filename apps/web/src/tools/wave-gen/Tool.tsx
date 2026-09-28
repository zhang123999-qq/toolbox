import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { WaveGenInput, WaveGenOptions } from './schema'

/** 示例：默认参数下的波浪 */
const EXAMPLE: WaveGenInput = { text: '' }

const ERROR_CLASS = 'text-sm text-red-700 dark:text-red-300'

export default function Tool() {
  const optionDefs: readonly OptionDef<WaveGenOptions>[] = [
    { key: 'amplitude', label: '振幅', kind: 'text', placeholder: '50' },
    { key: 'frequency', label: '频率', kind: 'text', placeholder: '2' },
    { key: 'layers', label: '层数', kind: 'text', placeholder: '3' },
    { key: 'color1', label: '起始色', kind: 'text', placeholder: '#3b82f6' },
    { key: 'color2', label: '结束色', kind: 'text', placeholder: '#8b5cf6' },
  ]

  function renderOutput(input: WaveGenInput, options: WaveGenOptions) {
    try {
      const svg = transform(input, options)
      return <div className="flex justify-center" dangerouslySetInnerHTML={{ __html: svg }} />
    } catch (e) {
      return (
        <p role="alert" className={ERROR_CLASS}>
          {e instanceof Error ? e.message : String(e)}
        </p>
      )
    }
  }

  return (
    <MultiPanel<WaveGenInput, WaveGenOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{
        amplitude: '50',
        frequency: '2',
        layers: '3',
        color1: '#3b82f6',
        color2: '#8b5cf6',
      }}
      example={EXAMPLE}
      optionDefs={optionDefs}
      renderOutput={renderOutput}
      toText={(input, options) => {
        try {
          return transform(input, options)
        } catch {
          return ''
        }
      }}
      downloadExt="svg"
    />
  )
}
