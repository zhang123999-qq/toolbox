import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { GeometryInput, GeometryOptions } from './schema'

/** 示例：半径 5 的圆 */
const EXAMPLE: GeometryInput = { text: 'r=5' }

/** 输出区：同步 try/catch，错误进 role="alert" 错误态 */
function Output({ input, options }: { input: GeometryInput; options: GeometryOptions }) {
  const t = useTranslate()
  let text = ''
  let error = ''
  try {
    text = transform(input, options)
  } catch (e) {
    error = e instanceof Error ? e.message : String(e)
  }
  if (error !== '') {
    return (
      <p role="alert" className="text-sm text-red-600 dark:text-red-400">
        {error}
      </p>
    )
  }
  if (text === '') {
    return <p className="text-sm text-slate-500 dark:text-slate-400">{t('tool.empty')}</p>
  }
  return <pre className="whitespace-pre-wrap font-mono text-sm">{text}</pre>
}

export default function Tool() {
  const t = useTranslate()
  const optionDefs: readonly OptionDef<GeometryOptions>[] = [
    {
      key: 'shape',
      label: t('option.shape'),
      kind: 'select',
      values: ['square', 'rectangle', 'triangle', 'circle', 'cube', 'sphere', 'cylinder', 'cone'],
    },
  ]

  return (
    <MultiPanel<GeometryInput, GeometryOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ shape: 'circle' }}
      example={EXAMPLE}
      optionDefs={optionDefs}
      renderOutput={(input, options) => <Output input={input} options={options} />}
      toText={(input, options) => {
        // 错误态下复制 / 下载无内容（与 TwoColumn 的 output 为空即不复制一致）
        try {
          return transform(input, options)
        } catch {
          return ''
        }
      }}
      downloadExt="txt"
    />
  )
}
