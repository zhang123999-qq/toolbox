import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { MatrixInput, MatrixOptions } from './schema'

/** 示例：求 [[1,2],[3,4]] 的逆矩阵 */
const EXAMPLE: MatrixInput = { text: '1 2\n3 4', textB: '' }

/** 输出区：同步 try/catch，错误进 role="alert" 错误态 */
function Output({ input, options }: { input: MatrixInput; options: MatrixOptions }) {
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
  const optionDefs: readonly OptionDef<MatrixOptions>[] = [
    {
      key: 'operation',
      label: t('option.operation'),
      kind: 'select',
      values: ['add', 'subtract', 'multiply', 'determinant', 'inverse', 'transpose'],
    },
  ]

  return (
    <MultiPanel<MatrixInput, MatrixOptions>
      meta={meta}
      initialInput={{ text: '', textB: '' }}
      initialOptions={{ operation: 'inverse' }}
      example={EXAMPLE}
      optionDefs={optionDefs}
      extraInputs={[{ key: 'textB', label: t('extra.matrixB') }]}
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
