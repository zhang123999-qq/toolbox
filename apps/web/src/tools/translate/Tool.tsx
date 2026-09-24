import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { AI_ENV_DEFAULTS } from '../../lib/ai'
import { transform } from './utils'
import type { TranslateInput, TranslateOptions } from './schema'

const EXAMPLE: TranslateInput = {
  text: '这是一段需要翻译的中文文本，用来验证翻译工具的效果。',
  apiBase: '',
  apiKey: '',
  model: '',
}

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<TranslateOptions>[] = [
    {
      key: 'source',
      label: t('option.source'),
      kind: 'select',
      values: ['auto', 'zh', 'en', 'ja', 'ko', 'fr', 'de', 'es', 'ru'],
    },
    {
      key: 'target',
      label: t('option.target'),
      kind: 'select',
      values: ['en', 'zh', 'ja', 'ko', 'fr', 'de', 'es', 'ru'],
    },
  ]

  return (
    <TwoColumn<TranslateInput, TranslateOptions>
      meta={meta}
      initialInput={{
        text: '',
        apiBase: AI_ENV_DEFAULTS.apiBase,
        apiKey: '',
        model: AI_ENV_DEFAULTS.model,
      }}
      initialOptions={{ source: 'auto', target: 'en' }}
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
