import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { AI_ENV_DEFAULTS } from '../../lib/ai'
import { transform } from './utils'
import type { SummarizeInput, SummarizeOptions } from './schema'

const EXAMPLE: SummarizeInput = {
  text: '文本摘要可以从长文里提炼出最关键的信息。提取式摘要直接从原文挑选句子，好处是绝不虚构内容，缺点是读起来可能不够连贯。生成式摘要由模型重写，表达更自然，但需要调用外部接口，并且可能写出原文没有的信息。',
  apiBase: '',
  apiKey: '',
  model: '',
}

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<SummarizeOptions>[] = [
    { key: 'mode', label: t('option.mode'), kind: 'select', values: ['extractive', 'abstractive'] },
    { key: 'length', label: t('option.length'), kind: 'select', values: ['1', '3', '5'] },
  ]

  return (
    <TwoColumn<SummarizeInput, SummarizeOptions>
      meta={meta}
      initialInput={{
        text: '',
        apiBase: AI_ENV_DEFAULTS.apiBase,
        apiKey: '',
        model: AI_ENV_DEFAULTS.model,
      }}
      initialOptions={{ mode: 'extractive', length: '3' }}
      runAsync={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
      extraInputs={[
        { key: 'apiBase', label: t('tool.apiBase'), rows: 1 },
        { key: 'apiKey', label: t('tool.apiKey'), rows: 1 },
        { key: 'model', label: t('tool.model'), rows: 1 },
      ]}
    />
  )
}
