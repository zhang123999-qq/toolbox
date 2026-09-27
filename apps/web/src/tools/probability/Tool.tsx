import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import type { MessageKey } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { ProbabilityInput, ProbabilityOptions } from './schema'

/** 示例：二项分布 n=10,k=3,p=0.5 */
const EXAMPLE: ProbabilityInput = { text: 'n=10\nk=3\np=0.5' }

/** 各模式的输入格式提示（静态映射，保证 key 受类型检查） */
const HINT_KEYS: Record<ProbabilityOptions['mode'], MessageKey> = {
  binomial: 'probability.hint.binomial',
  conditional: 'probability.hint.conditional',
  normal: 'probability.hint.normal',
}

/** 输出区：空输入时显示当前模式的格式提示；同步 try/catch，错误进 role="alert" */
function Output({ input, options }: { input: ProbabilityInput; options: ProbabilityOptions }) {
  const t = useTranslate()
  const mode = options.mode ?? 'binomial'
  if (input.text.trim() === '') {
    return (
      <p className="whitespace-pre-wrap font-mono text-sm text-slate-500 dark:text-slate-400">
        {t(HINT_KEYS[mode])}
      </p>
    )
  }
  let text = ''
  let error = ''
  try {
    text = transform(input, options, t)
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
  return <pre className="whitespace-pre-wrap font-mono text-sm">{text}</pre>
}

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<ProbabilityOptions>[] = [
    {
      key: 'mode',
      label: t('probability.option.mode'),
      kind: 'select',
      values: ['binomial', 'conditional', 'normal'],
    },
    {
      key: 'decimals',
      label: t('probability.option.decimals'),
      kind: 'select',
      values: ['0', '1', '2', '4', '6', '8'],
    },
  ]

  return (
    <MultiPanel<ProbabilityInput, ProbabilityOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ mode: 'binomial', decimals: '6' }}
      example={EXAMPLE}
      optionDefs={optionDefs}
      renderOutput={(input, options) => <Output input={input} options={options} />}
      toText={(input, options) => {
        // 错误态下复制 / 下载无内容（与 TwoColumn 的 output 为空即不复制一致）
        try {
          return transform(input, options, t)
        } catch {
          return ''
        }
      }}
      downloadExt="txt"
    />
  )
}
