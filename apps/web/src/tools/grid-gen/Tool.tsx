import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { GridGenInput, GridGenOptions } from './schema'

/** 示例：默认点阵 */
const EXAMPLE: GridGenInput = { text: '' }

const ERROR_CLASS = 'text-sm text-red-700 dark:text-red-300'

export default function Tool() {
  const optionDefs: readonly OptionDef<GridGenOptions>[] = [
    { key: 'pattern', label: '图案', kind: 'select', values: ['dots', 'lines', 'diagonal'] },
    { key: 'spacing', label: '间距', kind: 'text', placeholder: '20' },
    { key: 'width', label: '宽度', kind: 'text', placeholder: '400' },
    { key: 'height', label: '高度', kind: 'text', placeholder: '300' },
    { key: 'fgColor', label: '前景色', kind: 'text', placeholder: '#333333' },
    { key: 'bgColor', label: '背景色', kind: 'text', placeholder: '#ffffff' },
  ]

  function renderOutput(input: GridGenInput, options: GridGenOptions) {
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
    <MultiPanel<GridGenInput, GridGenOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{
        pattern: 'dots',
        spacing: '30',
        width: '400',
        height: '300',
        fgColor: '#e5e7eb',
        bgColor: '#ffffff',
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
