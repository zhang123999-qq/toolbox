import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { buildPlaceholderSvg } from './utils'
import type { PlaceholderInput, PlaceholderOptions } from './schema'

/** 示例尺寸 */
const EXAMPLE: PlaceholderInput = { text: '300x200' }

const ERROR_CLASS =
  'rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300'

export default function Tool() {
  const optionDefs: readonly OptionDef<PlaceholderOptions>[] = [
    { key: 'bgColor', label: '背景色', kind: 'text', placeholder: '#cccccc' },
    { key: 'fgColor', label: '文字颜色', kind: 'text', placeholder: '#666666' },
    { key: 'customText', label: '自定义文字', kind: 'text', placeholder: '显示尺寸' },
  ]

  return (
    <MultiPanel<PlaceholderInput, PlaceholderOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ bgColor: '#cccccc', fgColor: '#666666', customText: '' }}
      example={EXAMPLE}
      optionDefs={optionDefs}
      renderOutput={(input, options) => {
        try {
          const svg = buildPlaceholderSvg(input, options)
          return (
            <div className="flex justify-center p-4">
              <div data-testid="placeholder-svg" dangerouslySetInnerHTML={{ __html: svg }} />
            </div>
          )
        } catch (error) {
          return (
            <p role="alert" className={ERROR_CLASS}>
              {error instanceof Error ? error.message : String(error)}
            </p>
          )
        }
      }}
      toText={(input, options) => {
        try {
          return buildPlaceholderSvg(input, options)
        } catch {
          return ''
        }
      }}
      downloadExt="svg"
    />
  )
}
